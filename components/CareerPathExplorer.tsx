"use client";

import { useCallback, useRef, useState, useEffect, useLayoutEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import ReactFlow, {
  Node,
  Edge,
  Background,
  BaseEdge,
  Controls,
  MiniMap,
  Handle,
  Position,
  getBezierPath,
  useNodesState,
  useEdgesState,
  useReactFlow,
  useStoreApi,
  ReactFlowProvider,
  MarkerType,
  type NodeTypes,
  type NodeChange,
  type EdgeTypes,
  type EdgeProps,
} from "reactflow";
import "reactflow/dist/style.css";
import { useTheme } from "next-themes";
import { ChevronDownIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database";
import { findShortestPath } from "@/lib/career-path";
import type { PathResult } from "@/lib/career-path";

type CareerNode = Database["public"]["Tables"]["career_nodes"]["Row"];
type CareerEdge = Database["public"]["Tables"]["career_edges"]["Row"];

type OpenJob = {
  id: string;
  title: string;
  location: string;
  salary_min: number | null;
  salary_max: number | null;
  employer_profiles: { company_name: string } | null;
};

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

type CareerNodeCardData = {
  node: CareerNode;
  isActive: boolean;
  isOnPath: boolean;
  isTarget: boolean;
  /** 0-based position along the active route, or null when this node isn't on it */
  hop: number | null;
  /** a route is active and this node isn't part of it */
  dimmed: boolean;
  /** bumps on every destination change so the reveal animation replays */
  revealKey: number;
  /** count of open jobs whose title matches this node's title */
  jobCount: number;
};

type CareerRouteEdgeData = {
  hop: number | null;
  faded: boolean;
  revealKey: number;
  activeColor: string;
  restColor: string;
};

/** ms between consecutive hops of the route reveal — mirrored by --rise-step in the panel */
const HOP_MS = 200;

const LEVEL_Y: Record<string, number> = {
  entry: 0,
  mid: 180,
  senior: 360,
  lead: 540,
  executive: 720,
};

const CATEGORY_ORDER = ["Engineering", "AI/ML", "Data", "Product", "Design", "Business", "Marketing", "Sales"];
const LANE_WIDTH = 560;
const NODE_SPACING = 150;
const POSITIONS_STORAGE_KEY = "career-explore-positions-v2";
// Approximate node footprint for camera framing on filter change (actual measured width
// varies ~140-190px by title length; fitBounds's padding option absorbs the imprecision).
const NODE_FIT_WIDTH = 190;
const NODE_FIT_HEIGHT = 60;

// Keep in sync with light/dark tokens in app/globals.css
const FLOW_COLORS = {
  dark: {
    edgeActive: "oklch(0.78 0.145 196)",
    edgeDefault: "oklch(0.29 0.014 240)",
    canvasBg: "oklch(0.155 0.012 240)",
    dotBg: "oklch(0.42 0.02 240)",
    miniMapActive: "oklch(0.78 0.145 196)",
    miniMapTarget: "oklch(0.68 0.135 196)",
    miniMapOnPath: "oklch(0.56 0.11 196)",
    miniMapDefault: "oklch(0.29 0.014 240)",
    miniMapBg: "oklch(0.20 0.013 240)",
    miniMapBorder: "oklch(0.29 0.014 240)",
  },
  light: {
    edgeActive: "oklch(0.62 0.145 196)",
    edgeDefault: "oklch(0.90 0.004 258)",
    canvasBg: "oklch(0.973 0.002 236)",
    dotBg: "oklch(0.80 0.006 258)",
    miniMapActive: "oklch(0.62 0.145 196)",
    miniMapTarget: "oklch(0.53 0.135 196)",
    miniMapOnPath: "oklch(0.72 0.10 196)",
    miniMapDefault: "oklch(0.90 0.004 258)",
    miniMapBg: "oklch(0.995 0.001 236)",
    miniMapBorder: "oklch(0.90 0.004 258)",
  },
} as const;

type Point = { x: number; y: number };

/** Bounding box over node positions, padded by one node's approximate footprint. */
function boundsOf(points: Point[]) {
  if (points.length === 0) return null;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return {
    x: minX,
    y: minY,
    width: Math.max(...xs) + NODE_FIT_WIDTH - minX,
    height: Math.max(...ys) + NODE_FIT_HEIGHT - minY,
  };
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function readSavedPositions(): Record<string, { x: number; y: number }> {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(POSITIONS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function CareerNodeCard({ data }: { data: CareerNodeCardData }) {
  const { node, isActive, isTarget, isOnPath, hop, dimmed, revealKey, jobCount } = data;
  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0, pointerEvents: "none" }} />
      <div
        // Remount on each reveal so the bloom/dim animation replays rather than
        // sitting at its already-finished state. Nodes untouched by the route keep a
        // stable key so a plain re-render doesn't churn them.
        key={hop !== null || dimmed ? `r${revealKey}` : "rest"}
        style={hop !== null ? ({ "--hop": hop } as React.CSSProperties) : undefined}
        className={cn(
          "px-3 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer select-none min-w-[140px] text-center",
          hop !== null && "route-node",
          dimmed && "route-dimmed",
          isActive
            ? "bg-brand text-primary-foreground border-brand shadow-lg shadow-brand/20"
            : isTarget
            ? "glass border-2 border-brand text-foreground shadow-lg shadow-brand/30 ring-2 ring-brand/40"
            : isOnPath
            ? "glass border-brand/60 text-foreground ring-1 ring-brand/40"
            : "glass border-border text-foreground hover:border-brand/40"
        )}
      >
        <p className="font-semibold text-[11px] leading-tight">{node.title}</p>
        <p
          className={cn(
            "mt-1 tabular font-bold text-[13px]",
            isActive ? "text-primary-foreground/80" : "text-brand"
          )}
        >
          RM {(node.avg_salary_myr_min / 1000).toFixed(0)}k–{(node.avg_salary_myr_max / 1000).toFixed(0)}k
        </p>
        {jobCount > 0 && (
          <p
            className={cn(
              "mt-1 inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full",
              isActive ? "bg-primary-foreground/15 text-primary-foreground" : "bg-brand-subtle text-brand"
            )}
          >
            {jobCount} open role{jobCount !== 1 ? "s" : ""}
          </p>
        )}
        {isTarget && (
          <p className="text-[9px] text-brand font-semibold mt-0.5 uppercase tracking-wide">Target</p>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, pointerEvents: "none" }} />
    </>
  );
}

/**
 * Route edge. Off-route it's a single resting stroke. On-route it stacks a faint track,
 * a stroke that draws itself in hop order, and a glowing segment that keeps travelling
 * toward the destination.
 *
 * Both animated layers set pathLength="1", which normalises the stroke length to 1 no
 * matter how long the bezier actually is — so the dash values are constants and there's
 * no getTotalLength() measurement, no layout read, and no ref.
 */
function CareerRouteEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  data,
}: EdgeProps<CareerRouteEdgeData>) {
  const [path] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const hop = data?.hop ?? null;
  const restColor = data?.restColor;
  const activeColor = data?.activeColor;

  if (hop === null) {
    return (
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{ stroke: restColor, strokeWidth: 1, opacity: data?.faded ? 0.25 : 1 }}
      />
    );
  }

  return (
    <g key={data?.revealKey} style={{ "--hop": hop } as React.CSSProperties}>
      {/* faint track, so the route has a visible spine before its hop draws */}
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{ stroke: restColor, strokeWidth: 1, opacity: 0.3 }}
      />
      <path
        className="route-draw"
        d={path}
        pathLength={1}
        fill="none"
        stroke={activeColor}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <path
        className="route-pulse"
        d={path}
        pathLength={1}
        fill="none"
        stroke={activeColor}
        strokeWidth={3.5}
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 4px ${activeColor})` }}
      />
    </g>
  );
}

const nodeTypes: NodeTypes = {
  careerNode: CareerNodeCard,
};

const edgeTypes: EdgeTypes = {
  careerEdge: CareerRouteEdge,
};

type RoadmapStep = { skill: string; action: string; resource: string };
type Roadmap = { summary: string; steps: RoadmapStep[]; estimatedMonths: number };

export function CareerPathExplorer(props: {
  nodes: CareerNode[];
  edges: CareerEdge[];
  currentRole: string | null;
  seeking: string;
  candidateSkillNames: string[];
  openJobs: OpenJob[];
}) {
  return (
    <ReactFlowProvider>
      <CareerPathExplorerInner {...props} />
    </ReactFlowProvider>
  );
}

function CareerPathExplorerInner({
  nodes: careerNodes,
  edges: careerEdges,
  currentRole,
  seeking,
  candidateSkillNames,
  openJobs,
}: {
  nodes: CareerNode[];
  edges: CareerEdge[];
  currentRole: string | null;
  seeking: string;
  candidateSkillNames: string[];
  openJobs: OpenJob[];
}) {
  const { fitBounds } = useReactFlow();
  const storeApi = useStoreApi();
  const [selectedNode, setSelectedNode] = useState<CareerNode | null>(null);
  // Starts null (not read from localStorage in the initializer) so the server and the
  // client's first render agree - reading localStorage here would make SSR always render
  // "no destination" while the client's first render already has the real value, causing a
  // hydration mismatch. useLayoutEffect runs after hydration but before paint, so the
  // stored destination still appears in the very first frame the user sees.
  const [targetNodeId, setTargetNodeId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  useLayoutEffect(() => {
    const targetRole = searchParams.get("target");
    if (targetRole) {
      const matched = careerNodes.find(
        (n) => n.title.toLowerCase() === targetRole.toLowerCase()
      );
      if (matched) {
        setTargetNodeId(matched.id);
        localStorage.setItem("career-explore-target", matched.id);
      }
      router.replace("/explore");
      return;
    }
    const stored = localStorage.getItem("career-explore-target");
    if (stored) setTargetNodeId(stored);
    // Re-runs on searchParams change (not just mount) — CoachChat is mounted globally and
    // stays alive across in-page navigations, so a second chat-driven "?target=" while
    // already on /explore updates the query without remounting this component.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- careerNodes/router intentionally excluded, see above
  }, [searchParams]);
  const [filterCategory, setFilterCategory] = useState<string>(() => {
    const match = careerNodes.find(
      (n) => n.title.toLowerCase() === (currentRole?.toLowerCase() ?? "")
    );
    return match?.category ?? "all";
  });
  const savedPositionsRef = useRef<Record<string, { x: number; y: number }>>(readSavedPositions());
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [roadmapLoading, setRoadmapLoading] = useState(false);
  const [roadmapError, setRoadmapError] = useState<string | null>(null);

  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const flowColors = mounted && resolvedTheme === "light" ? FLOW_COLORS.light : FLOW_COLORS.dark;

  const categories = useMemo(() => {
    const present = Array.from(new Set(careerNodes.map((n) => n.category)));
    return present.sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a);
      const bi = CATEGORY_ORDER.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, [careerNodes]);

  const currentNode = careerNodes.find(
    (n) => n.title.toLowerCase() === (currentRole?.toLowerCase() ?? "")
  );

  const targetNode = careerNodes.find((n) => n.id === targetNodeId) ?? null;

  const pathResult = useMemo<PathResult | null>(() => {
    if (!currentNode || !targetNodeId || currentNode.id === targetNodeId) return null;
    return findShortestPath(careerNodes, careerEdges, currentNode.id, targetNodeId);
  }, [careerNodes, careerEdges, currentNode, targetNodeId]);

  // Ordered, not sets — the hop index is what drives the whole reveal choreography
  const pathNodeHop = useMemo(
    () => new Map((pathResult?.nodeIds ?? []).map((id, i) => [id, i])),
    [pathResult]
  );
  const pathEdgeHop = useMemo(
    () => new Map((pathResult?.edgeIds ?? []).map((id, i) => [id, i])),
    [pathResult]
  );

  // Bumping this remounts the animated node/edge elements so the reveal replays on a new
  // destination. Adjusted during render rather than in an effect — an effect fires after
  // paint, which would show one frame of the previous route's finished state first.
  // Same pattern as roadmapResetKey below.
  const [revealFor, setRevealFor] = useState(targetNodeId);
  const [revealKey, setRevealKey] = useState(0);
  if (revealFor !== targetNodeId) {
    setRevealFor(targetNodeId);
    setRevealKey((k) => k + 1);
  }

  const visibleNodes = useMemo(() => {
    if (targetNodeId) return careerNodes;
    if (filterCategory === "all") return careerNodes;
    return careerNodes.filter((n) => n.category === filterCategory);
  }, [careerNodes, filterCategory, targetNodeId]);

  // Grid position per node — category (lane) x level (row), independent of any saved drag override
  const defaultPositions = useMemo(() => {
    const laneIndex: Record<string, number> = {};
    categories.forEach((cat, i) => {
      laneIndex[cat] = i;
    });

    const groupCounts: Record<string, number> = {};
    for (const node of visibleNodes) {
      const key = `${node.category}|${node.level}`;
      groupCounts[key] = (groupCounts[key] ?? 0) + 1;
    }
    const groupSeen: Record<string, number> = {};
    const positions: Record<string, { x: number; y: number }> = {};

    for (const node of visibleNodes) {
      const key = `${node.category}|${node.level}`;
      const i = groupSeen[key] ?? 0;
      groupSeen[key] = i + 1;
      const count = groupCounts[key];
      const xOffset = (i - (count - 1) / 2) * NODE_SPACING;
      const laneBase = (laneIndex[node.category] ?? categories.length) * LANE_WIDTH;
      positions[node.id] = { x: laneBase + xOffset, y: LEVEL_Y[node.level] ?? 0 };
    }
    return positions;
  }, [visibleNodes, categories]);

  // Animate the viewport to frame the newly-filtered nodes whenever the category filter
  // actually changes (not on initial mount - the declarative fitView prop on <ReactFlow>
  // already handles that). Computes the bounding box from known grid positions instead of
  // React Flow's measured node dimensions - calling fitView() right after a node swap
  // races React Flow's ResizeObserver-based width/height measurement (confirmed via
  // testing: nodesInitialized() reports true before the store's per-node bounds are
  // actually usable, so fitView silently no-ops). fitBounds sidesteps that entirely.
  const lastFitCategoryRef = useRef(filterCategory);
  useEffect(() => {
    if (lastFitCategoryRef.current === filterCategory) return;
    lastFitCategoryRef.current = filterCategory;
    const bounds = boundsOf(
      visibleNodes.map((n) => defaultPositions[n.id]).filter((p): p is Point => !!p)
    );
    if (bounds) fitBounds(bounds, { padding: 0.2, duration: 500 });
  }, [filterCategory, visibleNodes, defaultPositions, fitBounds]);

  // Open jobs grouped by normalized title, for the graph badge + detail panel list
  const jobsByTitle = useMemo(() => {
    const map = new Map<string, OpenJob[]>();
    for (const job of openJobs) {
      const key = normalizeTitle(job.title);
      const list = map.get(key);
      if (list) list.push(job);
      else map.set(key, [job]);
    }
    return map;
  }, [openJobs]);

  // Build RF nodes — apply saved positions so drag layout survives data updates
  const categoryNodes = useMemo(() => {
    const pathIsActive = pathNodeHop.size > 0;
    return visibleNodes.map((node) => {
      const isActive = node.id === currentNode?.id;
      const isTarget = node.id === targetNodeId;
      const hop = pathNodeHop.get(node.id) ?? null;

      return {
        id: node.id,
        type: "careerNode",
        position: defaultPositions[node.id] ?? { x: 0, y: 0 },
        data: {
          node,
          isActive,
          isOnPath: !isActive && !isTarget && hop !== null,
          isTarget,
          hop,
          dimmed: pathIsActive && hop === null,
          revealKey,
          jobCount: jobsByTitle.get(normalizeTitle(node.title))?.length ?? 0,
        } satisfies CareerNodeCardData,
      } as Node;
    });
  }, [visibleNodes, currentNode, targetNodeId, pathNodeHop, defaultPositions, revealKey, jobsByTitle]);

  const categoryEdges = useMemo<Edge[]>(() => {
    const visibleIds = new Set(visibleNodes.map((n) => n.id));
    const pathIsActive = pathEdgeHop.size > 0;
    return careerEdges
      .filter((e) => visibleIds.has(e.from_node_id) && visibleIds.has(e.to_node_id))
      .map((e) => {
        const hop = pathEdgeHop.get(e.id) ?? null;
        return {
          id: e.id,
          type: "careerEdge",
          source: e.from_node_id,
          target: e.to_node_id,
          markerEnd: { type: MarkerType.ArrowClosed },
          data: {
            hop,
            faded: pathIsActive && hop === null,
            revealKey,
            activeColor: flowColors.edgeActive,
            restColor: flowColors.edgeDefault,
          } satisfies CareerRouteEdgeData,
        } as Edge;
      });
  }, [careerEdges, visibleNodes, pathEdgeHop, flowColors, revealKey]);

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(categoryNodes);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(categoryEdges);

  // Apply any saved drag positions over the default grid before first paint (layout
  // effect, not a regular effect, so there's no flash of the default position). Reading
  // the ref here is fine - refs are only unsafe to read during render/useMemo, not inside
  // effects. Runs once; later category/filter changes are handled by the sync effect below.
  useLayoutEffect(() => {
    setRfNodes((prev) =>
      prev.map((n) =>
        savedPositionsRef.current[n.id] ? { ...n, position: savedPositionsRef.current[n.id] } : n
      )
    );
  }, [setRfNodes]);

  // Persist targetNodeId to localStorage
  useEffect(() => {
    if (targetNodeId) {
      localStorage.setItem("career-explore-target", targetNodeId);
    } else {
      localStorage.removeItem("career-explore-target");
    }
  }, [targetNodeId]);

  // Update node data (visual states) without clobbering user-dragged positions.
  // Precedence: already-rendered position, then a saved drag position (for a node
  // appearing for the first time, e.g. revealed by a filter change), then the default grid slot.
  useEffect(() => {
    setRfNodes((prev) => {
      const posMap = new Map(prev.map((n) => [n.id, n.position]));
      return categoryNodes.map((n) => ({
        ...n,
        position: posMap.get(n.id) ?? savedPositionsRef.current[n.id] ?? n.position,
      }));
    });
  }, [categoryNodes, setRfNodes]);

  useEffect(() => {
    setRfEdges(categoryEdges);
  }, [categoryEdges, setRfEdges]);

  // Glide the camera onto the route corridor as it reveals. Positions come from rfNodes
  // (this component's state, populated synchronously on first render) rather than
  // useReactFlow()'s getNodes(), which can lag React Flow's internal store on first mount.
  //
  // lastCameraRevealRef is only set once the move actually applies (inside applyFit), not
  // when it's merely scheduled - this effect re-fires on every rfNodes update (several
  // happen right after mount), so a ref set too early would let a later re-fire's cleanup
  // cancel the pending move while the ref still blocks any retry. Setting it late keeps the
  // effect self-healing: an attempt that can't complete yet just tries again next update.
  const lastCameraRevealRef = useRef<number | null>(null);
  useEffect(() => {
    if (!pathResult) return;
    if (lastCameraRevealRef.current === revealKey) return;
    const byId = new Map(rfNodes.map((n) => [n.id, n.position]));
    const bounds = boundsOf(
      pathResult.nodeIds.map((id) => byId.get(id)).filter((p): p is Point => !!p)
    );
    if (!bounds) return;

    const reduced = prefersReducedMotion();
    let cancelled = false;
    let rafId: number | null = null;

    const applyFit = () => {
      lastCameraRevealRef.current = revealKey;
      fitBounds(bounds, { padding: 0.3, duration: reduced ? 0 : 600 });
    };

    // fitBounds() zooms against React Flow's internally-tracked container width
    // (store.getState()), not the live DOM. The destination is set on the same render the
    // detail panel first appears, and the store can still report the wider pre-panel width
    // for a frame or two after - fitting the route into a container it thinks is ~300px
    // wider than it is, landing on the wrong (too zoomed-out) scale. Poll until the store
    // catches up with the measured DOM width; capped so a persistent mismatch can't stall
    // the reveal indefinitely.
    const waitForStableWidth = (attempt: number) => {
      if (cancelled) return;
      const wrapper = document.querySelector(".react-flow") as HTMLElement | null;
      const liveWidth = wrapper?.getBoundingClientRect().width;
      const storeWidth = storeApi.getState().width;
      if (liveWidth && Math.abs(liveWidth - storeWidth) > 5 && attempt < 30) {
        rafId = requestAnimationFrame(() => waitForStableWidth(attempt + 1));
        return;
      }
      applyFit();
    };

    if (reduced) {
      waitForStableWidth(0);
      return () => {
        cancelled = true;
        if (rafId !== null) cancelAnimationFrame(rafId);
      };
    }
    // let the off-route nodes recede first, so the camera move reads as a response
    const timer = setTimeout(() => waitForStableWidth(0), 120);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [revealKey, pathResult, rfNodes, fitBounds, storeApi]);

  // Capture drag-end positions and persist them
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);
      const updates: Record<string, { x: number; y: number }> = {};
      for (const c of changes) {
        if (c.type === "position" && c.position && !c.dragging) {
          updates[c.id] = c.position;
        }
      }
      if (Object.keys(updates).length > 0) {
        savedPositionsRef.current = { ...savedPositionsRef.current, ...updates };
        try {
          localStorage.setItem(
            POSITIONS_STORAGE_KEY,
            JSON.stringify(savedPositionsRef.current)
          );
        } catch { /* ignore */ }
      }
    },
    [onNodesChange]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const careerNode = careerNodes.find((n) => n.id === node.id);
      setSelectedNode(careerNode ?? null);
    },
    [careerNodes]
  );

  const selectedEdge = careerEdges.find(
    (e) =>
      (currentNode && e.from_node_id === currentNode.id && e.to_node_id === selectedNode?.id) ||
      (currentNode && e.to_node_id === currentNode.id && e.from_node_id === selectedNode?.id)
  );

  const openRolesForNode = selectedNode
    ? jobsByTitle.get(normalizeTitle(selectedNode.title)) ?? []
    : [];

  // Reset transient roadmap-request state during render when the selected node changes -
  // an effect-based reset fires after paint, so it'd show the previous node's stale roadmap
  // for one frame first. This is React's documented "adjusting state on a prop change"
  // pattern: https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [roadmapResetKey, setRoadmapResetKey] = useState(selectedNode?.id ?? null);
  if (roadmapResetKey !== (selectedNode?.id ?? null)) {
    setRoadmapResetKey(selectedNode?.id ?? null);
    setRoadmap(null);
    setRoadmapLoading(false);
    setRoadmapError(null);
  }

  const skillNamesLower = new Set(candidateSkillNames.map((s) => s.toLowerCase()));
  const partitionedGaps = selectedEdge?.skill_gaps
    ? {
        have: selectedEdge.skill_gaps.filter((g) => skillNamesLower.has(g.toLowerCase())),
        need: selectedEdge.skill_gaps.filter((g) => !skillNamesLower.has(g.toLowerCase())),
      }
    : null;

  async function generateRoadmap() {
    if (!selectedNode || !partitionedGaps || partitionedGaps.need.length === 0) return;
    setRoadmapLoading(true);
    setRoadmapError(null);
    setRoadmap(null);
    try {
      const res = await fetch("/api/ai/skill-gap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentRole: currentRole ?? "",
          targetRole: selectedNode.title,
          missingSkills: partitionedGaps.need,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate roadmap");
      setRoadmap(data.roadmap);
    } catch (err) {
      setRoadmapError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setRoadmapLoading(false);
    }
  }

  return (
    <div className="flex h-[100dvh]">
      {/* Graph */}
      <div className="flex-1 relative">
        {/* Filter bar */}
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center gap-2 glass border border-border rounded-lg px-3 py-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              disabled={!!targetNodeId}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-40 disabled:pointer-events-none"
            >
              {filterCategory === "all" ? "All categories" : filterCategory}
              <ChevronDownIcon className="size-3.5 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuRadioGroup value={filterCategory} onValueChange={setFilterCategory}>
                <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                {categories.map((cat) => (
                  <DropdownMenuRadioItem key={cat} value={cat}>
                    {cat}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            onClick={() => {
              savedPositionsRef.current = {};
              localStorage.removeItem(POSITIONS_STORAGE_KEY);
              setRfNodes((prev) =>
                prev.map((n) => ({ ...n, position: defaultPositions[n.id] ?? n.position }))
              );
            }}
            className="ml-auto shrink-0 text-xs px-2.5 py-1 rounded-md text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            Reset layout
          </button>
        </div>

        {/* Path active chip */}
        {targetNodeId && targetNode && (
          <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 glass border border-brand/40 rounded-full px-3 py-1.5 shadow-lg text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-brand animate-pulse shrink-0" />
            <span className="text-foreground">
              Path to <span className="text-brand">{targetNode.title}</span>
            </span>
            {!pathResult && currentNode && (
              <span className="text-muted-foreground ml-1">(no route found)</span>
            )}
            <button
              type="button"
              onClick={() => setTargetNodeId(null)}
              className="ml-1 text-muted-foreground hover:text-foreground transition-colors leading-none text-base"
              aria-label="Clear destination"
            >
              ×
            </button>
          </div>
        )}

        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.3}
          maxZoom={1.5}
          style={{ background: flowColors.canvasBg }}
        >
          <Background color={flowColors.dotBg} gap={22} size={2} />
          <Controls />
          <MiniMap
            nodeColor={(n) => {
              const d = n.data as CareerNodeCardData;
              if (d.isActive) return flowColors.miniMapActive;
              if (d.isTarget) return flowColors.miniMapTarget;
              if (d.isOnPath) return flowColors.miniMapOnPath;
              return flowColors.miniMapDefault;
            }}
            style={{ background: flowColors.miniMapBg, border: `1px solid ${flowColors.miniMapBorder}` }}
          />
        </ReactFlow>
      </div>

      {/* Detail panel — fixed bottom sheet on mobile, side panel on md+ */}
      <aside
        className={cn(
          "glass flex flex-col",
          // Mobile: fixed bottom sheet
          "fixed bottom-0 left-0 right-0 z-20 border-t border-border rounded-t-2xl max-h-[60vh] overflow-y-auto transition-transform duration-300",
          // Desktop: static side panel in flex row
          "md:static md:bottom-auto md:left-auto md:right-auto md:z-auto md:rounded-none md:border-t-0 md:border-l md:w-80 md:shrink-0 md:max-h-none md:overflow-y-visible md:transition-none",
          (selectedNode || targetNodeId)
            ? "translate-y-0 md:flex"
            : "translate-y-full md:hidden"
        )}
      >
        {/* Mobile drag handle */}
        <div className="flex justify-center pt-3 pb-1 md:hidden" aria-hidden="true">
          <div className="w-8 h-1 rounded-full bg-border" />
        </div>

        {/* Path summary section */}
        {targetNodeId && targetNode && currentNode && (
          <div className="border-b border-border shrink-0">
            <div className="px-5 py-3 flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Path to</p>
                <h3 className="font-heading font-semibold text-sm mt-0.5">{targetNode.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setTargetNodeId(null)}
                className="text-xs text-muted-foreground hover:text-brand border border-border hover:border-brand/40 px-2 py-1 rounded-md transition-colors"
              >
                Clear
              </button>
            </div>

            {!pathResult ? (
              <div className="px-5 pb-4">
                <p className="text-xs text-muted-foreground">
                  No route found from <span className="text-foreground">{currentNode.title}</span> to{" "}
                  <span className="text-foreground">{targetNode.title}</span> in the graph.
                </p>
              </div>
            ) : (
              <div
                // remount on each destination so the stagger replays
                key={revealKey}
                // run the panel stagger on the graph's hop cadence, not the 60ms default
                style={{ "--rise-step": `${HOP_MS}ms` } as React.CSSProperties}
                className="px-5 pb-4 flex flex-col gap-4 max-h-96 overflow-y-auto"
              >
                {/* Hop timeline */}
                <div className="flex flex-col gap-0">
                  {pathResult.nodeIds.map((nodeId, i) => {
                    const node = careerNodes.find((n) => n.id === nodeId);
                    if (!node) return null;
                    const edgeId = pathResult.edgeIds[i];
                    const hopEdge = edgeId ? careerEdges.find((e) => e.id === edgeId) : null;
                    const isFirst = i === 0;
                    const isLast = i === pathResult.nodeIds.length - 1;
                    return (
                      <div
                        key={nodeId}
                        style={{ "--i": i } as React.CSSProperties}
                        className="animate-rise flex gap-3"
                      >
                        <div className="flex flex-col items-center">
                          <div
                            className={cn(
                              "w-2 h-2 rounded-full shrink-0 mt-0.5",
                              isFirst
                                ? "bg-brand"
                                : isLast
                                ? "border-2 border-brand bg-transparent"
                                : "bg-brand/50"
                            )}
                          />
                          {!isLast && <div className="w-px flex-1 bg-brand/20 my-1" />}
                        </div>
                        <div className="pb-3">
                          <p className="text-xs font-medium text-foreground leading-tight">{node.title}</p>
                          {hopEdge && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 tabular">
                              ~{hopEdge.avg_transition_months} mo transition
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Totals + skill gaps */}
                {(() => {
                  const currentMid = (currentNode.avg_salary_myr_min + currentNode.avg_salary_myr_max) / 2;
                  const targetMid = (targetNode.avg_salary_myr_min + targetNode.avg_salary_myr_max) / 2;
                  const salaryDelta = targetMid - currentMid;
                  const pct = ((salaryDelta / currentMid) * 100).toFixed(0);

                  const allGapsOnPath = pathResult.edgeIds.flatMap((eid) => {
                    const edge = careerEdges.find((e) => e.id === eid);
                    return edge?.skill_gaps ?? [];
                  });
                  const uniqueGaps = Array.from(new Set(allGapsOnPath.map((g) => g.toLowerCase())));
                  const needGaps = uniqueGaps.filter((g) => !skillNamesLower.has(g));
                  const haveGaps = uniqueGaps.filter((g) => skillNamesLower.has(g));

                  // land after the last hop
                  const tailIndex = pathResult.nodeIds.length;

                  return (
                    <>
                      <div
                        style={{ "--i": tailIndex } as React.CSSProperties}
                        className="animate-rise bg-background rounded-lg border border-border p-3 flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Total time</span>
                          <span className="text-xs font-semibold tabular text-foreground">
                            ~{pathResult.totalMonths} months
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Salary change</span>
                          <span
                            className={cn(
                              "text-xs font-semibold tabular",
                              salaryDelta >= 0 ? "text-success" : "text-destructive"
                            )}
                          >
                            {salaryDelta >= 0 ? "+" : ""}RM {Math.abs(salaryDelta / 1000).toFixed(1)}k/mo (
                            {salaryDelta >= 0 ? "+" : ""}
                            {pct}%)
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Skills to acquire</span>
                          <span className="text-xs font-semibold tabular text-foreground">
                            {needGaps.length}
                          </span>
                        </div>
                      </div>

                      {(needGaps.length > 0 || haveGaps.length > 0) && (
                        <div
                          style={{ "--i": tailIndex + 1 } as React.CSSProperties}
                          className="animate-rise flex flex-col gap-2"
                        >
                          {haveGaps.length > 0 && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1.5">
                                You already have ({haveGaps.length}):
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {haveGaps.map((skill) => (
                                  <span
                                    key={skill}
                                    className="text-[10px] bg-success/10 border border-success/20 text-success px-2 py-0.5 rounded-full capitalize"
                                  >
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {needGaps.length > 0 && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1.5">
                                Still to acquire ({needGaps.length}):
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {needGaps.map((skill) => (
                                  <span
                                    key={skill}
                                    className="text-[10px] bg-brand-subtle border border-brand/20 text-brand px-2 py-0.5 rounded-full capitalize"
                                  >
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* Node detail section */}
        {selectedNode && (
          <>
            <div className="px-5 py-4 border-b border-border flex items-start justify-between shrink-0">
              <div>
                <h2 className="font-heading font-semibold text-base">{selectedNode.title}</h2>
                <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                  {selectedNode.level} · {selectedNode.category}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNode(null)}
                aria-label="Close details"
                className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
              {/* Set as destination */}
              {currentNode && selectedNode.id !== currentNode.id && (
                <button
                  type="button"
                  onClick={() =>
                    setTargetNodeId(targetNodeId === selectedNode.id ? null : selectedNode.id)
                  }
                  className={cn(
                    "w-full px-4 py-2 text-xs font-medium rounded-md border transition-colors",
                    targetNodeId === selectedNode.id
                      ? "bg-brand/10 border-brand text-brand hover:bg-brand/20"
                      : "bg-transparent border-brand/40 text-brand hover:border-brand hover:bg-brand/10"
                  )}
                >
                  {targetNodeId === selectedNode.id ? "Destination set ✓" : "Set as destination →"}
                </button>
              )}

              {/* Salary */}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">
                  Salary range (MYR/month)
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-brand tabular font-bold text-2xl font-heading">
                    RM {(selectedNode.avg_salary_myr_min / 1000).toFixed(0)}k
                  </span>
                  <span className="text-muted-foreground text-sm">–</span>
                  <span className="text-brand tabular font-bold text-2xl font-heading">
                    RM {(selectedNode.avg_salary_myr_max / 1000).toFixed(0)}k
                  </span>
                </div>
              </div>

              {/* Time in role */}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">
                  Typical time in role
                </p>
                <p className="text-foreground font-medium tabular">
                  ~{selectedNode.typical_years_in_role} year
                  {selectedNode.typical_years_in_role !== 1 ? "s" : ""}
                </p>
              </div>

              {/* Description */}
              {selectedNode.description && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">
                    About this role
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">{selectedNode.description}</p>
                </div>
              )}

              {/* Open roles matching this node's title */}
              {openRolesForNode.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">
                    Open roles ({openRolesForNode.length})
                  </p>
                  <div className="flex flex-col gap-2">
                    {openRolesForNode.slice(0, 5).map((job) => (
                      <div key={job.id} className="bg-background rounded-lg border border-border p-3">
                        <p className="text-sm font-medium text-foreground">
                          {job.employer_profiles?.company_name ?? "Company"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{job.location}</p>
                        {job.salary_min && job.salary_max && (
                          <p className="text-xs text-brand font-medium tabular mt-1">
                            RM {(job.salary_min / 1000).toFixed(1)}k–{(job.salary_max / 1000).toFixed(1)}k
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                  <Link href="/jobs" className="text-xs text-brand hover:underline mt-2 inline-block">
                    {openRolesForNode.length > 5
                      ? `+${openRolesForNode.length - 5} more in Job Board →`
                      : "View in Job Board →"}
                  </Link>
                </div>
              )}

              {/* Transition from current (direct edge only) */}
              {selectedEdge && currentNode && (
                <div className="bg-background rounded-lg border border-border p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">
                    From {currentNode.title}
                  </p>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-brand tabular font-semibold text-sm">
                      ~{selectedEdge.avg_transition_months} months
                    </span>
                    <span className="text-xs text-muted-foreground">avg. transition time</span>
                  </div>
                  {partitionedGaps &&
                    (partitionedGaps.have.length > 0 || partitionedGaps.need.length > 0) && (
                      <div className="flex flex-col gap-3 mt-1">
                        {partitionedGaps.have.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1.5">You already have:</p>
                            <div className="flex flex-wrap gap-1.5">
                              {partitionedGaps.have.map((skill) => (
                                <span
                                  key={skill}
                                  className="text-xs bg-success/10 border border-success/20 text-success px-2.5 py-1 rounded-full"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {partitionedGaps.need.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1.5">You still need:</p>
                            <div className="flex flex-wrap gap-1.5">
                              {partitionedGaps.need.map((skill) => (
                                <span
                                  key={skill}
                                  className="text-xs bg-brand-subtle border border-brand/20 text-brand px-2.5 py-1 rounded-full"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {partitionedGaps.need.length === 0 && (
                          <p className="text-xs text-success">
                            You have all the skills for this transition.
                          </p>
                        )}
                      </div>
                    )}
                </div>
              )}

              {partitionedGaps && partitionedGaps.need.length > 0 && !roadmap && (
                <button
                  type="button"
                  onClick={generateRoadmap}
                  disabled={roadmapLoading}
                  className="w-full px-4 py-2 bg-brand text-primary-foreground text-xs font-medium rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
                >
                  {roadmapLoading ? (
                    <>
                      <span className="inline-block w-3 h-3 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      Generating roadmap...
                    </>
                  ) : (
                    "Generate Learning Roadmap"
                  )}
                </button>
              )}
              {roadmapError && <p className="text-xs text-destructive">{roadmapError}</p>}

              {roadmap && (
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">{roadmap.summary}</p>
                  <div className="flex flex-col gap-2">
                    {roadmap.steps.map((step, i) => (
                      <div key={step.skill} className="bg-background rounded-md border border-border p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold text-brand tabular w-4 text-center">
                            {i + 1}
                          </span>
                          <span className="text-xs font-semibold text-foreground">{step.skill}</span>
                        </div>
                        <p className="text-xs text-muted-foreground pl-6 mb-0.5">{step.action}</p>
                        <p className="text-xs text-brand/70 pl-6">{step.resource}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground tabular">
                    Estimated:{" "}
                    <span className="text-foreground font-medium">
                      ~{roadmap.estimatedMonths} month{roadmap.estimatedMonths !== 1 ? "s" : ""}
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setRoadmap(null)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors text-left"
                  >
                    Regenerate ↺
                  </button>
                </div>
              )}

              {/* Salary delta */}
              {currentNode && selectedNode.id !== currentNode.id && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">
                    Salary delta
                  </p>
                  {(() => {
                    const currentMid =
                      (currentNode.avg_salary_myr_min + currentNode.avg_salary_myr_max) / 2;
                    const targetMid =
                      (selectedNode.avg_salary_myr_min + selectedNode.avg_salary_myr_max) / 2;
                    const delta = targetMid - currentMid;
                    const pct = ((delta / currentMid) * 100).toFixed(0);
                    return (
                      <p
                        className={cn(
                          "font-semibold tabular text-lg",
                          delta >= 0 ? "text-success" : "text-destructive"
                        )}
                      >
                        {delta >= 0 ? "+" : ""}RM {Math.abs(delta / 1000).toFixed(1)}k/mo (
                        {delta >= 0 ? "+" : ""}
                        {pct}%)
                      </p>
                    );
                  })()}
                </div>
              )}
            </div>
          </>
        )}

        {/* Empty state — target set but no node selected */}
        {!selectedNode && targetNodeId && (
          <div className="flex-1 flex items-center justify-center px-8 text-center">
            <p className="text-sm text-muted-foreground">Click any node to see its details</p>
          </div>
        )}

        {/* Empty state — nothing active */}
        {!selectedNode && !targetNodeId && (
          <div className="flex-1 flex items-center justify-center px-8 text-center">
            <div>
              <p className="text-4xl mb-3">◈</p>
              <p className="text-sm text-muted-foreground">
                Click any role to see salary, transition time, and skill gaps
              </p>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
