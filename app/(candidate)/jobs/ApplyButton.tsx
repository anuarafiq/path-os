"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface ApplyButtonProps {
  jobId: string;
  candidateId: string;
  initialApplied: boolean;
}

type Step = "idle" | "generating" | "editing" | "submitting";

export default function ApplyButton({ jobId, candidateId, initialApplied }: ApplyButtonProps) {
  const [applied, setApplied] = useState(initialApplied);
  const [step, setStep] = useState<Step>("idle");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleApplyClick() {
    setError(null);
    setStep("generating");
    try {
      const res = await fetch("/api/ai/cover-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      if (res.ok) {
        const { note: generated } = await res.json();
        setNote(generated);
      }
    } catch {
      // If generation fails, still let them apply — just with empty note
    }
    setStep("editing");
  }

  async function submitApplication(coverNote: string) {
    setStep("submitting");
    setError(null);
    const supabase = createClient();
    const { error: insertError } = await supabase
      .from("applications")
      .insert({ job_id: jobId, candidate_id: candidateId, notes: coverNote || null });

    if (insertError) {
      if ((insertError as any).code === "23505") {
        setApplied(true);
      } else {
        setError("Failed to apply. Please try again.");
        setStep("editing");
        return;
      }
    }
    setApplied(true);
  }

  if (applied) {
    return (
      <button
        disabled
        className="mt-3 text-xs px-3 py-1.5 rounded-md border border-[var(--success)] text-[var(--success)] opacity-70 cursor-default"
      >
        Applied ✓
      </button>
    );
  }

  if (step === "idle") {
    return (
      <div className="mt-3">
        <button
          onClick={handleApplyClick}
          className="text-xs px-3 py-1.5 rounded-md bg-[var(--brand-subtle)] border border-[var(--brand-dim)] text-[var(--brand)] hover:bg-[var(--brand)] hover:text-primary-foreground transition-colors"
        >
          Apply
        </button>
      </div>
    );
  }

  if (step === "generating") {
    return (
      <div className="mt-3 flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
        <span className="inline-block w-3 h-3 rounded-full bg-[var(--brand)] animate-pulse" />
        Crafting your cover note…
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-2">
      <p className="text-xs text-[var(--muted-foreground)] font-medium">Cover note</p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={6}
        placeholder="Add a cover note… (optional)"
        className="w-full text-xs bg-[var(--secondary)] border border-[var(--border)] rounded-md px-3 py-2 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] resize-y focus:outline-none focus:border-[var(--brand-dim)]"
      />
      {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          onClick={() => submitApplication(note)}
          disabled={step === "submitting"}
          className="text-xs px-3 py-1.5 rounded-md bg-[var(--brand-subtle)] border border-[var(--brand-dim)] text-[var(--brand)] hover:bg-[var(--brand)] hover:text-primary-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {step === "submitting" ? "Submitting…" : "Submit application"}
        </button>
        <button
          onClick={() => submitApplication("")}
          disabled={step === "submitting"}
          className="text-xs text-[var(--muted-foreground)] hover:text-[var(--muted-foreground)] transition-colors disabled:opacity-50"
        >
          Skip note
        </button>
        <button
          onClick={() => setStep("idle")}
          disabled={step === "submitting"}
          className="text-xs text-[var(--muted-foreground)] hover:text-[var(--muted-foreground)] transition-colors disabled:opacity-50 ml-auto"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
