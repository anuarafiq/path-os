"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function DemoLogin() {
  const [loading, setLoading] = useState<"candidate" | "employer" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDemo(role: "candidate" | "employer") {
    setError(null);
    setLoading(role);

    try {
      const res = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Setup failed");

      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (signInError) throw new Error(signInError.message);

      window.location.href = role === "candidate" ? "/dashboard" : "/employer/dashboard";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Demo login failed");
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="hero-text-shadow text-sm text-foreground/75">One-click demo — no account needed</p>
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          onClick={() => handleDemo("candidate")}
          disabled={loading !== null}
          className="w-full sm:w-auto bg-primary text-primary-foreground px-8 py-3.5 rounded-md text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading === "candidate" ? "Signing in…" : "Demo: Candidate"}
        </button>
        <button
          onClick={() => handleDemo("employer")}
          disabled={loading !== null}
          className="w-full sm:w-auto bg-primary text-primary-foreground px-8 py-3.5 rounded-md text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading === "employer" ? "Signing in…" : "Demo: Employer"}
        </button>
      </div>
      <p className="hero-text-shadow text-xs text-foreground/70">Walkthrough below ↓ — 2 min to explore both paths</p>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
