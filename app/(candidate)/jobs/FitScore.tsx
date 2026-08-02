"use client";

import { useEffect, useState } from "react";

interface FitScoreProps {
  jobId: string;
  candidateId: string;
}

interface FitResult {
  score: number;
  summary: string;
}

function scoreColor(score: number): string {
  if (score >= 70) return "var(--success)";
  if (score >= 40) return "var(--brand)";
  return "var(--muted-foreground)";
}

export default function FitScore({ jobId, candidateId: _candidateId }: FitScoreProps) {
  const [result, setResult] = useState<FitResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ai/job-fit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.score !== undefined) setResult(data);
      })
      .catch(() => { /* silent - just hide */ })
      .finally(() => setLoading(false));
  }, [jobId]);

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 mt-2">
        <div className="h-4 w-12 rounded-full bg-secondary animate-pulse" />
        <div className="h-3 w-32 rounded bg-secondary animate-pulse" />
      </div>
    );
  }

  if (!result) return null;

  const color = scoreColor(result.score);

  return (
    <div className="flex items-start gap-2 mt-2">
      <span
        className="shrink-0 text-xs font-semibold tabular-nums px-2 py-0.5 rounded-full border"
        style={{ color, borderColor: color, background: `color-mix(in oklch, ${color} 15%, transparent)` }}
      >
        {result.score}% match
      </span>
      {result.summary && (
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-1" title={result.summary}>
          {result.summary}
        </p>
      )}
    </div>
  );
}
