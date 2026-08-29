"use client";

import { isToolUIPart, getToolName, type UIMessage } from "ai";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { ArrowRight, Check, AlertCircle, Loader2 } from "lucide-react";

export type CoachVariant = "candidate" | "employer";

type ToolPart = Extract<UIMessage["parts"][number], { type: `tool-${string}` } | { type: "dynamic-tool" }>;

function navLabel(path: string) {
  const seg = path.split("/").filter(Boolean).pop() ?? "page";
  return seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function count(n: number, singular: string) {
  return `${n} ${singular}${n === 1 ? "" : "s"}`;
}

type ToolLabel = {
  kind: "mutation" | "read" | "nav";
  running: (input: Record<string, unknown> | undefined) => string;
  done: (output: Record<string, unknown> | undefined, input: Record<string, unknown> | undefined) => string;
};

// Mutations reuse the server-provided `message` verbatim for the done label
// (already human-readable, e.g. "Successfully applied to X at Y"). Reads have
// no message, so summarize a count/score instead. Never echo long generated
// text (cover note, job description) or PII arrays — one line only.
const CANDIDATE_TOOL_LABELS: Record<string, ToolLabel> = {
  findMatchingJobs: {
    kind: "read",
    running: () => "Searching open jobs…",
    done: (o) => (Array.isArray(o) ? `Found ${count(o.length, "matching job")}` : "Searched jobs"),
  },
  getSalaryBenchmarks: {
    kind: "read",
    running: (i) => (i?.role ? `Fetching salary for ${i.role}…` : "Fetching salary benchmarks…"),
    done: (_o, i) => (i?.role ? `Salary benchmarks for ${i.role}` : "Salary benchmarks ready"),
  },
  addSkillToProfile: {
    kind: "mutation",
    running: (i) => (i?.skillName ? `Adding ${i.skillName}…` : "Updating your skills…"),
    done: (o) => String(o?.message ?? "Skill added"),
  },
  removeSkillFromProfile: {
    kind: "mutation",
    running: (i) => (i?.skillName ? `Removing ${i.skillName}…` : "Updating your skills…"),
    done: (o) => String(o?.message ?? "Skill removed"),
  },
  getCareerPathOptions: {
    kind: "read",
    running: (i) => (i?.targetRole ? `Mapping path to ${i.targetRole}…` : "Mapping career paths…"),
    done: (o, i) => {
      if (i?.targetRole) return `Path to ${i.targetRole}`;
      return Array.isArray(o) ? `Found ${count(o.length, "next move")}` : "Career paths ready";
    },
  },
  getApplicationStatus: {
    kind: "read",
    running: () => "Checking your applications…",
    done: (o) => (Array.isArray(o) ? count(o.length, "application") : "Applications checked"),
  },
  updateProfile: {
    kind: "mutation",
    running: () => "Updating your profile…",
    done: (o) => String(o?.message ?? "Profile updated"),
  },
  applyToJob: {
    kind: "mutation",
    running: () => "Submitting your application…",
    done: (o) => String(o?.message ?? "Application submitted"),
  },
  scoreJobFit: {
    kind: "read",
    running: () => "Scoring fit…",
    done: (o) => (typeof o?.score === "number" ? `Fit score ${o.score}` : "Fit scored"),
  },
  draftCoverLetter: {
    kind: "read",
    running: () => "Writing your cover note…",
    done: () => "Cover note ready",
  },
  analyzeSkillGap: {
    kind: "read",
    running: (i) => (i?.targetRole ? `Building roadmap to ${i.targetRole}…` : "Building your roadmap…"),
    done: () => "Roadmap ready",
  },
  navigateTo: {
    kind: "nav",
    running: (i) => (i?.path ? `Opening ${navLabel(String(i.path))}` : "Opening page…"),
    done: (o) => (o?.path ? `Opening ${navLabel(String(o.path))}` : "Opening page"),
  },
};

const EMPLOYER_TOOL_LABELS: Record<string, ToolLabel> = {
  listJobs: {
    kind: "read",
    running: () => "Fetching your jobs…",
    done: (o) => (Array.isArray(o) ? count(o.length, "job") : "Jobs fetched"),
  },
  listApplicants: {
    kind: "read",
    running: () => "Fetching applicants…",
    done: (o) => (Array.isArray(o) ? count(o.length, "applicant") : "Applicants fetched"),
  },
  createJob: {
    kind: "mutation",
    running: (i) => (i?.title ? `Posting ${i.title}…` : "Posting the job…"),
    done: (o) => String(o?.message ?? "Job posted"),
  },
  updateApplicationStatus: {
    kind: "mutation",
    running: (i) => (i?.status ? `Moving applicant to ${i.status}…` : "Moving the applicant…"),
    done: (o) => String(o?.message ?? "Applicant moved"),
  },
  saveCandidateToPool: {
    kind: "mutation",
    running: () => "Saving to your talent pool…",
    done: (o) => String(o?.message ?? "Saved to talent pool"),
  },
  updateEmployerProfile: {
    kind: "mutation",
    running: () => "Updating company profile…",
    done: (o) => String(o?.message ?? "Company profile updated"),
  },
  writeJobDescription: {
    kind: "read",
    running: (i) => (i?.title ? `Drafting a JD for ${i.title}…` : "Drafting the job description…"),
    done: () => "Description ready",
  },
  suggestCandidates: {
    kind: "read",
    running: () => "Finding best-fit candidates…",
    done: (o) => (Array.isArray(o?.results) ? `${count(o.results.length, "candidate")} ranked` : "Candidates ranked"),
  },
  suggestPoolReEngagement: {
    kind: "read",
    running: () => "Finding pool candidates to re-engage…",
    done: (o) => (Array.isArray(o?.suggestions) ? count(o.suggestions.length, "suggestion") : "Suggestions ready"),
  },
  navigateTo: {
    kind: "nav",
    running: (i) => (i?.path ? `Opening ${navLabel(String(i.path))}` : "Opening page…"),
    done: (o) => (o?.path ? `Opening ${navLabel(String(o.path))}` : "Opening page"),
  },
};

function labelFor(variant: CoachVariant, name: string): ToolLabel {
  const map = variant === "candidate" ? CANDIDATE_TOOL_LABELS : EMPLOYER_TOOL_LABELS;
  return (
    map[name] ?? {
      kind: "read",
      running: () => `Running ${name}…`,
      done: () => `${name} done`,
    }
  );
}

function ToolActivity({ part, variant }: { part: ToolPart; variant: CoachVariant }) {
  const name = getToolName(part);
  const config = labelFor(variant, name);
  const input = part.input as Record<string, unknown> | undefined;
  const output = part.output as Record<string, unknown> | undefined;

  const running = part.state === "input-streaming" || part.state === "input-available";
  const isError = part.state === "output-error" || (part.state === "output-available" && !!output?.error);

  let text: string;
  let icon: React.ReactNode;
  let tone: string;

  if (isError) {
    text = String(output?.error ?? part.errorText ?? "Something went wrong");
    icon = <AlertCircle className="w-3 h-3" />;
    tone = "border-destructive/40 bg-destructive/10 text-destructive";
  } else if (running) {
    text = config.running(input);
    icon = <Loader2 className="w-3 h-3 animate-spin" />;
    tone = "border-brand/30 bg-brand-subtle/30 text-brand/90";
  } else {
    // output-available, no error
    text = config.done(output, input);
    icon = config.kind === "nav" ? <ArrowRight className="w-3 h-3" /> : <Check className="w-3 h-3" />;
    tone = "border-brand/40 bg-brand-subtle/40 text-brand";
  }

  return (
    <div className="mt-2 flex">
      <span className={cn("coach-nav-chip chat-rise max-w-full rounded-full border px-2.5 py-1 text-xs font-medium", tone)}>
        <span className="shrink-0">{icon}</span>
        <span className="truncate">{text}</span>
      </span>
    </div>
  );
}

const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
  li: ({ children }: { children?: React.ReactNode }) => <li>{children}</li>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-semibold">{children}</strong>,
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="bg-muted px-1 rounded text-xs font-mono">{children}</code>
  ),
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="mb-2 last:mb-0 whitespace-pre-wrap break-words overflow-x-auto rounded bg-muted p-2 text-xs font-mono [&_code]:bg-transparent [&_code]:px-0">
      {children}
    </pre>
  ),
};

export function CoachMessageList({
  messages,
  streaming,
  variant,
}: {
  messages: UIMessage[];
  streaming: boolean;
  variant: CoachVariant;
}) {
  return (
    <>
      {messages.map((message, i) => {
        const isLastStreaming = streaming && i === messages.length - 1;

        if (message.role === "user") {
          const text = message.parts
            .filter((p) => p.type === "text")
            .map((p) => (p.type === "text" ? p.text : ""))
            .join("");
          return (
            <div key={message.id} className="flex chat-rise justify-end">
              <div className="max-w-[70%] px-4 py-3 rounded-xl text-sm leading-relaxed break-words bg-primary text-primary-foreground rounded-br-sm">
                {text}
              </div>
            </div>
          );
        }

        // assistant
        const hasText = message.parts.some((p) => p.type === "text" && p.text.trim());
        const hasTool = message.parts.some(isToolUIPart);
        if (!hasText && !hasTool && !isLastStreaming) return null;

        return (
          <div key={message.id} className="flex chat-rise justify-start">
            <div className="w-6 h-6 rounded-full bg-brand-subtle flex items-center justify-center text-brand text-xs shrink-0 mt-0.5 mr-2">
              ◉
            </div>
            <div className="max-w-[70%] px-4 py-3 rounded-xl text-sm leading-relaxed break-words glass border border-border text-foreground rounded-bl-sm">
              {message.parts.map((part, pi) => {
                if (part.type === "text") {
                  if (!part.text) return null;
                  return (
                    <ReactMarkdown key={pi} components={markdownComponents}>
                      {part.text}
                    </ReactMarkdown>
                  );
                }
                if (isToolUIPart(part)) {
                  return <ToolActivity key={pi} part={part} variant={variant} />;
                }
                return null;
              })}
              {isLastStreaming &&
                (hasText ? (
                  <span className="coach-caret" aria-hidden="true" />
                ) : (
                  <span className="coach-thinking" role="status" aria-label="Coach is thinking">
                    <span className="coach-thinking-dot" style={{ "--i": 0 } as React.CSSProperties} />
                    <span className="coach-thinking-dot" style={{ "--i": 1 } as React.CSSProperties} />
                    <span className="coach-thinking-dot" style={{ "--i": 2 } as React.CSSProperties} />
                  </span>
                ))}
            </div>
          </div>
        );
      })}
    </>
  );
}
