"use client";

import { useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PortfolioLink from "@/components/PortfolioLink";

type AppRow = {
  id: string;
  status: string;
  job_id: string;
  candidate: { id: string; name: string; job_title: string | null } | null;
};

type JobRow = { id: string; title: string };

type Props = {
  initialApps: AppRow[];
  jobs: JobRow[];
};

const VISIBLE_STAGES = ["applied", "reviewed", "shortlisted", "offered"] as const;
const DROP_STAGES = new Set<string>([...VISIBLE_STAGES, "rejected"]);

// Travel before a press counts as a drag rather than a click.
const DRAG_THRESHOLD_PX = 6;
const SETTLE_MS = 420;
const MAX_TILT_DEG = 8;

/**
 * Samples an underdamped spring's step response into a `linear()` easing string.
 *
 * The settle interpolates one FLIP delta to zero, which is a pure function of elapsed
 * time rather than of live input, so it does not need a stateful rAF solver — a
 * precomputed curve handed to Element.animate() runs on the compositor and stays smooth
 * while the main thread is busy with the Supabase round trip. (The drag itself is the
 * opposite case: it tracks the pointer 1:1 and is never sprung.)
 *
 * The curve is dimensionless, so it is built once and reused for any distance.
 */
function buildSpringEasing(samples = 28, damping = 0.68, omega = 18): string {
  const wd = omega * Math.sqrt(1 - damping * damping);
  const points: number[] = [];
  for (let i = 0; i < samples; i++) {
    const t = i / (samples - 1);
    const envelope = Math.exp(-damping * omega * t);
    const osc = Math.cos(wd * t) + ((damping * omega) / wd) * Math.sin(wd * t);
    points.push(1 - envelope * osc);
  }
  // Normalise so the curve lands exactly on 1 and the element cannot end up offset.
  const last = points[points.length - 1] || 1;
  return `linear(${points
    .map((v, i) => `${(v / last).toFixed(4)} ${((i / (samples - 1)) * 100).toFixed(1)}%`)
    .join(", ")})`;
}

const SPRING_SETTLE_EASING = buildSpringEasing();

function supportsViewTransitions() {
  return typeof document !== "undefined" && typeof document.startViewTransition === "function";
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type DragInfo = {
  id: string;
  pointerId: number;
  startX: number;
  startY: number;
  /** Pointer offset inside the card at grab time, so it doesn't jump under the cursor. */
  grabDX: number;
  grabDY: number;
  /** Previous x, for the velocity-derived tilt. */
  lastX: number;
  /** True once the threshold is crossed. Distinguishes a drag from a click. */
  moved: boolean;
};

export default function PipelineBoard({ initialApps, jobs }: Props) {
  const [apps, setApps] = useState<AppRow[]>(initialApps);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
  const [rejectedOpen, setRejectedOpen] = useState(false);

  // Drag state that drives rendering. Set only on real transitions (grab, drop, target
  // change) — never per pointermove frame.
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetStage, setDropTargetStage] = useState<string | null>(null);
  const [liveMessage, setLiveMessage] = useState("");

  // Per-frame drag maths. A ref on purpose: mutating it does not re-render, which is
  // exactly what keeps pointermove cheap. Only ever read inside event handlers.
  const dragInfoRef = useRef<DragInfo | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const settleAnimRef = useRef<Record<string, Animation>>({});

  const jobsById = useMemo(() => new Map(jobs.map((j) => [j.id, j])), [jobs]);

  const visibleApps = apps.filter((a) => a.status !== "rejected");
  const rejectedApps = apps.filter((a) => a.status === "rejected");

  const byStage = VISIBLE_STAGES.reduce<Record<string, AppRow[]>>((acc, stage) => {
    acc[stage] = visibleApps.filter((a) => a.status === stage);
    return acc;
  }, {});

  function labelFor(app: AppRow) {
    return app.candidate?.name ?? jobsById.get(app.job_id)?.title ?? "application";
  }

  function commitStatus(appId: string, newStatus: string) {
    setApps((prev) => prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a)));
  }

  /**
   * Writes the change through, reverting just this card on failure. Shared by the button
   * and drag paths. The revert always flies via a view transition when one is available —
   * by the time an error can arrive the pointer is long gone, so animating it reads as an
   * undo rather than a glitch.
   */
  async function persist(appId: string, newStatus: string, prevStatus: string, label: string) {
    setLoadingId(appId);
    setErrorId(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("applications")
      .update({ status: newStatus })
      .eq("id", appId);

    if (error) {
      setErrorId(appId);
      setLiveMessage(`Could not move ${label}. Reverted to ${prevStatus}.`);
      const revert = () => commitStatus(appId, prevStatus);
      if (supportsViewTransitions() && !prefersReducedMotion()) {
        document.startViewTransition(() => flushSync(revert));
      } else {
        revert();
      }
    } else {
      setLiveMessage(`Moved ${label} to ${newStatus}.`);
    }
    setLoadingId(null);
  }

  /**
   * Button path (← / → / ✕ / Restore). The only place a forward move opens a view
   * transition — the drag path commits at the drop position instead, see commitDrop.
   */
  function moveCard(app: AppRow, newStatus: string) {
    const prevStatus = app.status;
    const commit = () => {
      commitStatus(app.id, newStatus);
      // Otherwise the card flies into a collapsed container and reads as vanishing.
      if (newStatus === "rejected") setRejectedOpen(true);
    };

    if (supportsViewTransitions() && !prefersReducedMotion()) {
      // flushSync is mandatory: startViewTransition snapshots the "after" state the moment
      // its callback returns, and a bare setState has not reached the DOM by then.
      document.startViewTransition(() => flushSync(commit));
    } else {
      commit();
    }

    void persist(app.id, newStatus, prevStatus, labelFor(app));
  }

  /** FLIP from wherever the card was released to wherever layout just put it. */
  function playSettle(appId: string, beforeRect: DOMRect, tiltDeg: number) {
    const el = cardRefs.current[appId];
    if (!el || prefersReducedMotion()) return;

    // Interrupt a settle still running from a previous drop on this card.
    settleAnimRef.current[appId]?.cancel();

    const after = el.getBoundingClientRect();
    const dx = beforeRect.left - after.left;
    const dy = beforeRect.top - after.top;
    if (dx === 0 && dy === 0 && tiltDeg === 0) return;

    settleAnimRef.current[appId] = el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) rotate(${tiltDeg}deg) scale(1.035)` },
        { transform: "translate(0, 0) rotate(0deg) scale(1)" },
      ],
      // fill defaults to "none", so the effect stops applying on its own and the resting
      // style takes back over. Nothing to await, nothing that can strand a card if the
      // tab is backgrounded mid-animation.
      { duration: SETTLE_MS, easing: SPRING_SETTLE_EASING }
    );
  }

  /**
   * Drag path. No view transition: the card is already at the drop position under the
   * finger, so flying it again would fight the settle. flushSync is still needed, so the
   * "before" rect (card fixed under the pointer) and the "after" rect (card in its new
   * column) are captured in one synchronous pass with no intermediate paint.
   */
  function commitDrop(app: AppRow, newStatus: string | null, beforeRect: DOMRect, tiltDeg: number) {
    const changing = newStatus !== null && newStatus !== app.status;

    flushSync(() => {
      setDraggingId(null);
      setDropTargetStage(null);
      if (changing) {
        commitStatus(app.id, newStatus);
        if (newStatus === "rejected") setRejectedOpen(true);
      }
    });

    // Runs for the abort case too — position: fixed → static is not transitionable, so the
    // card would otherwise pop home instead of settling.
    playSettle(app.id, beforeRect, tiltDeg);

    if (changing) void persist(app.id, newStatus, app.status, labelFor(app));
  }

  function hitTestDropStage(x: number, y: number): string | null {
    // elementFromPoint over manual rect loops: O(1) through the browser's own hit-test
    // tree, resolves the topmost element correctly, and picks up the rejected tray header
    // for free. Depends on pointer-events: none on the dragged card (globals.css).
    const zone = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-drop-stage]");
    const stage = zone?.dataset.dropStage;
    return stage && DROP_STAGES.has(stage) ? stage : null;
  }

  function onCardPointerDown(e: React.PointerEvent<HTMLDivElement>, appId: string) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (loadingId === appId) return;

    const card = cardRefs.current[appId];
    if (!card) return;

    const rect = card.getBoundingClientRect();
    dragInfoRef.current = {
      id: appId,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      grabDX: e.clientX - rect.left,
      grabDY: e.clientY - rect.top,
      lastX: e.clientX,
      moved: false,
    };
    // position: fixed drops the column's width constraint, so carry it across.
    card.style.setProperty("--drag-w", `${rect.width}px`);
    card.setPointerCapture(e.pointerId);
  }

  function onCardPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const info = dragInfoRef.current;
    if (!info || info.pointerId !== e.pointerId) return;

    if (!info.moved) {
      if (Math.hypot(e.clientX - info.startX, e.clientY - info.startY) < DRAG_THRESHOLD_PX) return;
      info.moved = true;
      setDraggingId(info.id);
    }

    const el = cardRefs.current[info.id];
    if (el) {
      const tilt = Math.max(-MAX_TILT_DEG, Math.min(MAX_TILT_DEG, (e.clientX - info.lastX) * 1.4));
      el.style.setProperty("--drag-x", `${e.clientX - info.grabDX}px`);
      el.style.setProperty("--drag-y", `${e.clientY - info.grabDY}px`);
      el.style.setProperty("--drag-rot", `${tilt}deg`);
    }
    info.lastX = e.clientX;

    const stage = hitTestDropStage(e.clientX, e.clientY);
    if (stage !== dropTargetStage) setDropTargetStage(stage);
  }

  function onCardPointerUp(e: React.PointerEvent<HTMLDivElement>, cancelled = false) {
    const info = dragInfoRef.current;
    if (!info || info.pointerId !== e.pointerId) return;
    dragInfoRef.current = null;

    const card = cardRefs.current[info.id];
    if (card?.hasPointerCapture(e.pointerId)) card.releasePointerCapture(e.pointerId);

    if (!info.moved) {
      card?.style.removeProperty("--drag-w");
      return; // a tap, not a drag — the button's own onClick handles it
    }

    const app = apps.find((a) => a.id === info.id);
    if (!app || !card) {
      setDraggingId(null);
      setDropTargetStage(null);
      return;
    }

    // FLIP "first", measured while the card is still fixed under the pointer.
    const beforeRect = card.getBoundingClientRect();
    const tilt = parseFloat(card.style.getPropertyValue("--drag-rot")) || 0;
    card.style.removeProperty("--drag-x");
    card.style.removeProperty("--drag-y");
    card.style.removeProperty("--drag-rot");
    card.style.removeProperty("--drag-w");

    // A cancelled pointer (the OS or browser took the gesture) is an abort, not a drop —
    // pass null so the card settles back where it came from.
    commitDrop(app, cancelled ? null : hitTestDropStage(e.clientX, e.clientY), beforeRect, tilt);
  }

  const dragHandlers = (appId: string) => ({
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => onCardPointerDown(e, appId),
    onPointerMove: onCardPointerMove,
    onPointerUp: onCardPointerUp,
    onPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => onCardPointerUp(e, true),
    // The card contains the candidate-name link, and pressing then moving on a link starts
    // the browser's native drag — which fires pointercancel and kills the gesture before it
    // can begin. dragstart bubbles from the anchor, so cancelling it here covers the whole
    // card (text selection drags included) without touching PortfolioLink.
    onDragStart: (e: React.DragEvent<HTMLDivElement>) => e.preventDefault(),
  });

  function cardIdentity(app: AppRow, muted: boolean) {
    const role = app.candidate ? app.candidate.job_title : "Hidden by candidate";
    return (
      <div className="flex items-center gap-2">
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
            muted ? "bg-elevated text-muted-foreground" : "bg-brand-subtle text-brand"
          }`}
        >
          {app.candidate?.name.charAt(0).toUpperCase() ?? "?"}
        </div>
        <div className="min-w-0 flex-1">
          {app.candidate ? (
            <PortfolioLink
              candidateId={app.candidate.id}
              className="block text-sm font-medium text-foreground truncate hover:text-brand transition-colors"
            >
              {app.candidate.name}
            </PortfolioLink>
          ) : (
            <p className="text-sm font-medium text-foreground truncate">Private profile</p>
          )}
          {role && <p className="text-xs text-muted-foreground truncate">{role}</p>}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div aria-live="polite" className="sr-only">
        {liveMessage}
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {VISIBLE_STAGES.map((stage, stageIdx) => {
          const prevStage = stageIdx > 0 ? VISIBLE_STAGES[stageIdx - 1] : null;
          const nextStage = stageIdx < VISIBLE_STAGES.length - 1 ? VISIBLE_STAGES[stageIdx + 1] : null;
          const count = byStage[stage].length;

          return (
            <div key={stage} className="w-64 shrink-0 flex flex-col">
              <div className="flex items-baseline justify-between mb-1.5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground capitalize">
                  {stage}
                </h3>
                <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
              </div>
              {/* Ordinal position in the pipeline. Columns scroll off-screen horizontally,
                  so how far along a column sits is real information, not decoration. */}
              <div className="h-0.5 rounded-full bg-border mb-3" aria-hidden="true">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${((stageIdx + 1) / VISIBLE_STAGES.length) * 100}%` }}
                />
              </div>

              <div
                data-drop-stage={stage}
                data-drop-active={dropTargetStage === stage}
                /* flex-1 so the zone spans the tallest column: an empty column would
                   otherwise collapse to its placeholder and be a ~60px drop target. */
                className="pipeline-column flex-1 min-h-32 rounded-lg p-1 -m-1"
              >
                <div
                  data-drop-active={dropTargetStage === stage}
                  className="pipeline-column-inner flex flex-col gap-2 rounded-lg border border-transparent"
                >
                  {byStage[stage].map((app) => {
                    const job = jobsById.get(app.job_id);
                    const isLoading = loadingId === app.id;

                    return (
                      <div
                        key={app.id}
                        ref={(el) => {
                          cardRefs.current[app.id] = el;
                        }}
                        data-dragging={draggingId === app.id}
                        className="pipeline-card glass border border-border rounded-lg p-3"
                        style={
                          {
                            opacity: isLoading ? 0.6 : 1,
                            viewTransitionName: `card-${app.id}`,
                          } as React.CSSProperties
                        }
                        {...dragHandlers(app.id)}
                      >
                        {cardIdentity(app, false)}

                        {job && (
                          <span className="inline-block max-w-full mt-2 px-1.5 py-0.5 rounded-full bg-brand-subtle text-brand text-[11px] truncate">
                            {job.title}
                          </span>
                        )}
                        {errorId === app.id && (
                          <p className="text-xs mt-1" style={{ color: "var(--destructive)" }}>
                            Update failed
                          </p>
                        )}

                        <div className="flex items-center gap-1 mt-2.5">
                          {prevStage && (
                            <button
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={() => moveCard(app, prevStage)}
                              disabled={isLoading}
                              aria-label={`Move ${labelFor(app)} back to ${prevStage}`}
                              className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-elevated disabled:opacity-40 transition-colors"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          )}
                          {nextStage && (
                            <button
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={() => moveCard(app, nextStage)}
                              disabled={isLoading}
                              aria-label={`Advance ${labelFor(app)} to ${nextStage}`}
                              className="h-6 pl-2 pr-1.5 flex items-center gap-0.5 rounded text-xs font-medium capitalize bg-brand-subtle text-brand hover:brightness-95 disabled:opacity-40 transition-all"
                            >
                              {nextStage}
                              <ChevronRight className="w-3 h-3" aria-hidden="true" />
                            </button>
                          )}
                          <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={() => moveCard(app, "rejected")}
                            disabled={isLoading}
                            aria-label={`Reject ${labelFor(app)}`}
                            className="ml-auto w-6 h-6 flex items-center justify-center rounded hover:bg-elevated disabled:opacity-40 transition-colors"
                            style={{ color: "var(--destructive)" }}
                          >
                            <X className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {count === 0 && (
                    <div className="border border-dashed border-border rounded-lg p-4 text-center">
                      <p className="text-xs text-muted-foreground">
                        {dropTargetStage === stage ? "Drop here" : "Empty"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {rejectedApps.length > 0 && (
        <div className="mt-6">
          {/* Also a drop target, and rendered whether or not the tray is open, so a card
              can be dragged onto it from anywhere on the board. */}
          <button
            data-drop-stage="rejected"
            data-drop-active={dropTargetStage === "rejected"}
            onClick={() => setRejectedOpen((o) => !o)}
            aria-expanded={rejectedOpen}
            className="pipeline-column flex items-center gap-2 -mx-2 mb-2 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span aria-hidden="true">{rejectedOpen ? "▾" : "▸"}</span>
            <span>Rejected ({rejectedApps.length})</span>
          </button>

          <div className="pipeline-tray-body" data-open={rejectedOpen}>
            <div className="flex flex-wrap gap-2 opacity-60">
              {rejectedApps.map((app) => (
                <div
                  key={app.id}
                  ref={(el) => {
                    cardRefs.current[app.id] = el;
                  }}
                  data-dragging={draggingId === app.id}
                  className="pipeline-card glass border border-border rounded-lg p-3 w-64"
                  style={{ viewTransitionName: `card-${app.id}` } as React.CSSProperties}
                  {...dragHandlers(app.id)}
                >
                  {cardIdentity(app, true)}
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => moveCard(app, "applied")}
                    disabled={loadingId === app.id}
                    aria-label={`Restore ${labelFor(app)} to applied`}
                    className="mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                  >
                    Restore →
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
