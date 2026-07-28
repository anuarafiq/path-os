"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type ReEngageSuggestion = {
  candidateId: string;
  name: string;
  jobTitle: string;
  fitNote: string;
  outreachDraft: string;
};

export default function ReEngagePage() {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<ReEngageSuggestion[]>([]);
  const [ran, setRan] = useState(false);

  async function runReEngage() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/re-engage", { method: "POST" });
      const data = await res.json();
      setSuggestions(data.suggestions ?? []);
    } finally {
      setRan(true);
      setLoading(false);
    }
  }

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <h1 className="font-heading text-3xl font-bold mb-1">Talent Re-Engagement</h1>
      <p className="text-muted-foreground text-sm mb-8">
        Surface past applicants and alumni who are now a strong fit for your open roles.
      </p>

      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <p className="text-sm text-foreground mb-2 font-medium">How it works</p>
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          Our AI reviews your talent pool against all open roles and flags candidates who weren&apos;t a fit before
          but could be now — based on new job openings or updated profiles. You get a suggested outreach note for each.
        </p>
        <Button onClick={runReEngage} disabled={loading}>
          {loading ? "Scanning talent pool..." : "Run re-engagement scan"}
        </Button>
      </div>

      {ran && suggestions.length === 0 && (
        <div className="bg-card border border-border rounded-lg p-6 text-center">
          <p className="text-muted-foreground text-sm">
            No re-engagement suggestions right now. Add more candidates to your talent pool first.
          </p>
        </div>
      )}

      {suggestions.map((s) => (
        <div key={s.candidateId} className="bg-card border border-border rounded-lg p-4 mb-3">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-brand-subtle flex items-center justify-center text-brand text-sm font-bold">
              {s.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-sm">{s.name}</p>
              <p className="text-xs text-brand">{s.jobTitle}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-3">{s.fitNote}</p>
          <div className="bg-background border border-border rounded-md p-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1.5">Suggested outreach</p>
            <p className="text-sm text-foreground leading-relaxed">{s.outreachDraft}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
