"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface SaveToPoolButtonProps {
  candidateId: string;
  employerId: string;
  initialInPool: boolean;
}

export default function SaveToPoolButton({ candidateId, employerId, initialInPool }: SaveToPoolButtonProps) {
  const [inPool, setInPool] = useState(initialInPool);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: insertError } = await supabase
      .from("talent_pools")
      .insert({ candidate_id: candidateId, employer_id: employerId, source: "scouted" });

    if (insertError) {
      if ((insertError as any).code === "23505") {
        setInPool(true);
      } else {
        setError("Failed to save. Please try again.");
      }
    } else {
      setInPool(true);
    }
    setLoading(false);
  }

  if (inPool) {
    return (
      <button
        disabled
        className="text-xs px-3 py-1.5 rounded-md border border-[var(--success)] text-[var(--success)] opacity-70 cursor-default"
      >
        Saved ✓
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={handleSave}
        disabled={loading}
        className="text-xs px-3 py-1.5 rounded-md bg-[var(--brand-subtle)] border border-[var(--brand-dim)] text-[var(--brand)] hover:bg-[var(--brand)] hover:text-primary-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Saving…" : "Save to pool"}
      </button>
      {error && <p className="mt-1 text-xs text-[var(--danger)]">{error}</p>}
    </div>
  );
}
