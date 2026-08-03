"use client";

import { useState } from "react";
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
type VisibleStage = (typeof VISIBLE_STAGES)[number];

export default function PipelineBoard({ initialApps, jobs }: Props) {
  const [apps, setApps] = useState<AppRow[]>(initialApps);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
  const [rejectedOpen, setRejectedOpen] = useState(false);

  async function moveCard(appId: string, newStatus: string) {
    const prev = apps;
    setLoadingId(appId);
    setErrorId(null);
    setApps(prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a)));

    const supabase = createClient();
    const { error } = await supabase
      .from("applications")
      .update({ status: newStatus })
      .eq("id", appId);

    if (error) {
      setApps(prev);
      setErrorId(appId);
    }
    setLoadingId(null);
  }

  const visibleApps = apps.filter((a) => a.status !== "rejected");
  const rejectedApps = apps.filter((a) => a.status === "rejected");

  const byStage = VISIBLE_STAGES.reduce<Record<string, AppRow[]>>((acc, stage) => {
    acc[stage] = visibleApps.filter((a) => a.status === stage);
    return acc;
  }, {} as Record<string, AppRow[]>);

  return (
    <div>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {VISIBLE_STAGES.map((stage) => {
          const stageIdx = VISIBLE_STAGES.indexOf(stage);
          return (
            <div key={stage} className="w-64 shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground capitalize">
                  {stage}
                </h3>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {byStage[stage].length}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {byStage[stage].map((app) => {
                  const job = jobs.find((j) => j.id === app.job_id);
                  const isLoading = loadingId === app.id;
                  const hasError = errorId === app.id;
                  const prevStage = stageIdx > 0 ? VISIBLE_STAGES[stageIdx - 1] : null;
                  const nextStage = stageIdx < VISIBLE_STAGES.length - 1 ? VISIBLE_STAGES[stageIdx + 1] : null;

                  return (
                    <div
                      key={app.id}
                      className="glass border border-border rounded-lg p-3"
                      style={{ opacity: isLoading ? 0.6 : 1 }}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-6 h-6 rounded-full bg-brand-subtle flex items-center justify-center text-brand text-xs font-bold shrink-0">
                          {app.candidate?.name.charAt(0).toUpperCase() ?? "?"}
                        </div>
                        {app.candidate ? (
                          <PortfolioLink
                            candidateId={app.candidate.id}
                            className="text-sm font-medium text-foreground truncate hover:text-brand transition-colors"
                          >
                            {app.candidate.name}
                          </PortfolioLink>
                        ) : (
                          <p className="text-sm font-medium text-foreground truncate">Private profile</p>
                        )}
                      </div>
                      {(app.candidate ? app.candidate.job_title : "Hidden by candidate") && (
                        <p className="text-xs text-muted-foreground">
                          {app.candidate ? app.candidate.job_title : "Hidden by candidate"}
                        </p>
                      )}
                      {job && <p className="text-xs text-brand mt-1">{job.title}</p>}
                      {hasError && (
                        <p className="text-xs mt-1" style={{ color: "var(--destructive)" }}>
                          Update failed
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-2.5">
                        {prevStage && (
                          <button
                            onClick={() => moveCard(app.id, prevStage)}
                            disabled={isLoading}
                            className="text-xs px-1.5 py-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-elevated disabled:opacity-40 transition-colors"
                            title={`Move to ${prevStage}`}
                          >
                            ←
                          </button>
                        )}
                        {nextStage && (
                          <button
                            onClick={() => moveCard(app.id, nextStage)}
                            disabled={isLoading}
                            className="text-xs px-1.5 py-0.5 rounded text-muted-foreground hover:text-brand hover:bg-brand-subtle disabled:opacity-40 transition-colors"
                            title={`Move to ${nextStage}`}
                          >
                            →
                          </button>
                        )}
                        <div className="ml-auto">
                          <button
                            onClick={() => moveCard(app.id, "rejected")}
                            disabled={isLoading}
                            className="text-xs px-1.5 py-0.5 rounded text-muted-foreground hover:bg-elevated disabled:opacity-40 transition-colors"
                            style={{ color: "var(--destructive)" }}
                            title="Reject"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {byStage[stage].length === 0 && (
                  <div className="border border-dashed border-border rounded-lg p-4 text-center">
                    <p className="text-xs text-muted-foreground">Empty</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {rejectedApps.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setRejectedOpen((o) => !o)}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <span>{rejectedOpen ? "▾" : "▸"}</span>
            <span>Rejected ({rejectedApps.length})</span>
          </button>
          {rejectedOpen && (
            <div className="flex flex-wrap gap-2">
              {rejectedApps.map((app) => (
                <div
                  key={app.id}
                  className="glass border border-border rounded-lg p-3 w-64"
                  style={{ opacity: 0.5 }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-full bg-elevated flex items-center justify-center text-muted-foreground text-xs font-bold shrink-0">
                      {app.candidate?.name.charAt(0).toUpperCase() ?? "?"}
                    </div>
                    {app.candidate ? (
                      <PortfolioLink
                        candidateId={app.candidate.id}
                        className="text-sm font-medium text-foreground truncate hover:text-brand transition-colors"
                      >
                        {app.candidate.name}
                      </PortfolioLink>
                    ) : (
                      <p className="text-sm font-medium text-foreground truncate">Private profile</p>
                    )}
                  </div>
                  {(app.candidate ? app.candidate.job_title : "Hidden by candidate") && (
                    <p className="text-xs text-muted-foreground">
                      {app.candidate ? app.candidate.job_title : "Hidden by candidate"}
                    </p>
                  )}
                  <button
                    onClick={() => moveCard(app.id, "applied")}
                    disabled={loadingId === app.id}
                    className="text-xs mt-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                  >
                    Restore →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
