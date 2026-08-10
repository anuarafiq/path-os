"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Job = { id: string; title: string; company: string };

type AtsResult = {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  formatIssues: string[];
  summary: string;
};

function scoreColor(score: number): string {
  if (score >= 70) return "var(--success)";
  if (score >= 40) return "var(--brand)";
  return "var(--destructive)";
}

export function AtsCheckerForm({ hasPdfResume, jobs }: { hasPdfResume: boolean; jobs: Job[] }) {
  const [resumeMode, setResumeMode] = useState<"stored" | "paste">(hasPdfResume ? "stored" : "paste");
  const [resumeText, setResumeText] = useState("");

  const [jobMode, setJobMode] = useState<"existing" | "paste">(jobs.length > 0 ? "existing" : "paste");
  const [jobId, setJobId] = useState<string>(jobs[0]?.id ?? "");
  const [jobDescriptionText, setJobDescriptionText] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AtsResult | null>(null);

  const canSubmit =
    (resumeMode === "stored" || resumeText.trim().length > 0) &&
    (jobMode === "existing" ? !!jobId : jobDescriptionText.trim().length > 0);

  async function handleCheck() {
    setLoading(true);
    setError(null);
    setResult(null);
    const res = await fetch("/api/ai/ats-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resumeMode,
        resumeText: resumeMode === "paste" ? resumeText : undefined,
        jobMode,
        jobId: jobMode === "existing" ? jobId : undefined,
        jobDescriptionText: jobMode === "paste" ? jobDescriptionText : undefined,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Check failed. Try again.");
      return;
    }
    setResult(data);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Resume source */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Resume</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            disabled={!hasPdfResume}
            onClick={() => setResumeMode("stored")}
            className={cn(
              "flex flex-col items-start text-left p-4 rounded-lg border transition-all disabled:opacity-40 disabled:cursor-not-allowed",
              resumeMode === "stored" ? "border-brand bg-brand-subtle" : "border-border hover:border-border/80 hover:bg-secondary"
            )}
          >
            <span className="font-medium text-sm mb-1">Uploaded resume</span>
            <span className="text-xs text-muted-foreground">
              {hasPdfResume ? "Also checks formatting" : "Upload a PDF in your profile to enable this"}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setResumeMode("paste")}
            className={cn(
              "flex flex-col items-start text-left p-4 rounded-lg border transition-all",
              resumeMode === "paste" ? "border-brand bg-brand-subtle" : "border-border hover:border-border/80 hover:bg-secondary"
            )}
          >
            <span className="font-medium text-sm mb-1">Paste resume text</span>
            <span className="text-xs text-muted-foreground">Keyword check only, no formatting check</span>
          </button>
        </div>
        {resumeMode === "paste" && (
          <Textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="Paste your resume text here..."
            rows={8}
          />
        )}
      </div>

      {/* Job description source */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Job description</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            disabled={jobs.length === 0}
            onClick={() => setJobMode("existing")}
            className={cn(
              "flex flex-col items-start text-left p-4 rounded-lg border transition-all disabled:opacity-40 disabled:cursor-not-allowed",
              jobMode === "existing" ? "border-brand bg-brand-subtle" : "border-border hover:border-border/80 hover:bg-secondary"
            )}
          >
            <span className="font-medium text-sm mb-1">Pick a job on Path OS</span>
            <span className="text-xs text-muted-foreground">
              {jobs.length === 0 ? "No open jobs right now" : "Use an open listing"}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setJobMode("paste")}
            className={cn(
              "flex flex-col items-start text-left p-4 rounded-lg border transition-all",
              jobMode === "paste" ? "border-brand bg-brand-subtle" : "border-border hover:border-border/80 hover:bg-secondary"
            )}
          >
            <span className="font-medium text-sm mb-1">Paste a job description</span>
            <span className="text-xs text-muted-foreground">Check against any external posting</span>
          </button>
        </div>
        {jobMode === "existing" ? (
          <Select value={jobId} onValueChange={(v) => setJobId(v ?? "")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a job">
                {(v: string) => {
                  const job = jobs.find((j) => j.id === v);
                  return job ? `${job.title}${job.company ? ` — ${job.company}` : ""}` : "Select a job";
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {jobs.map((j) => (
                <SelectItem key={j.id} value={j.id}>
                  {j.title}{j.company ? ` — ${j.company}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Textarea
            value={jobDescriptionText}
            onChange={(e) => setJobDescriptionText(e.target.value)}
            placeholder="Paste the job description here..."
            rows={8}
          />
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button onClick={handleCheck} disabled={!canSubmit || loading} className="self-start">
        {loading ? "Checking..." : "Run ATS check"}
      </Button>

      {result && (
        <div className="flex flex-col gap-4 rounded-lg border border-border p-5">
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-semibold tabular-nums px-2.5 py-1 rounded-full border"
              style={{
                color: scoreColor(result.score),
                borderColor: scoreColor(result.score),
                background: `color-mix(in oklch, ${scoreColor(result.score)} 15%, transparent)`,
              }}
            >
              {result.score}% match
            </span>
          </div>

          {result.summary && <p className="text-sm text-muted-foreground leading-relaxed">{result.summary}</p>}

          {result.matchedKeywords.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Matched keywords</span>
              <div className="flex flex-wrap gap-1.5">
                {result.matchedKeywords.map((k) => (
                  <Badge key={k} variant="secondary">{k}</Badge>
                ))}
              </div>
            </div>
          )}

          {result.missingKeywords.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Missing keywords</span>
              <div className="flex flex-wrap gap-1.5">
                {result.missingKeywords.map((k) => (
                  <Badge key={k} variant="destructive">{k}</Badge>
                ))}
              </div>
            </div>
          )}

          {result.formatIssues.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Formatting issues</span>
              <ul className="list-disc list-inside text-sm text-muted-foreground flex flex-col gap-1">
                {result.formatIssues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
