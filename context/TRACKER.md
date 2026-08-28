# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- Core loop complete, polishing remaining features and hardening for demo/launch. Not in active feature-planning mode - working from the backlog below.

## Current Goal

- No single declared sprint goal. Pull the next item from `Next Up` below, or from `TODO.md` directly, when starting new work.

## Completed

- Auth (signup/login, role-based redirect), onboarding wizard with AI resume auto-fill, resume file upload/storage
- Candidate: dashboard, job board with search/filters, apply flow with AI cover notes, fit scoring, applications tracking, career explorer (graph, personalized path highlighting, skill-gap roadmap), certificates (Coursera parse + skill suggestions), full profile editing (basic info, education, work exp, skills, portfolio items), public portfolio page with visibility toggle
- Employer: setup/profile, job posting (with AI JD polish), talent search + talent pools, pipeline board (drag + button stage moves), re-engage AI suggestions with deterministic already-applied guardrail
- AI Coach (candidate) and Hiring Assistant (employer) - agentic multi-step tool-calling side panels, rate-limited 30 msg/hour/user. Candidate coach reaches the one-shot AI features conversationally: `scoreJobFit`, `draftCoverLetter`, `analyzeSkillGap` tools share logic with the `/api/ai/job-fit`, `/cover-note`, `/skill-gap` routes via `lib/ai/candidate-fit.ts` (single source of truth). Employer coach mirrors this: `writeJobDescription`, `suggestCandidates`, `suggestPoolReEngagement` share logic with `/api/ai/jd-writer`, `/match`, `/re-engage` via `lib/ai/employer-match.ts`. ATS/resume-check tool deferred (per-candidate `draftOutreach` deferred as a Tier-2 item).
- Demo mode - one-click seeded candidate + employer accounts, idempotent seeding
- Design system pass: light/dark theme toggle, full token architecture, motion/animation layer (iris wipe, career spine, route reveal, pipeline drag physics)
- Security hardening: CSP + security headers, RLS + grants on every table, SECURITY DEFINER RPCs for cross-boundary public reads, rate limiting on AI + public routes
- AI provider docs/deps cleanup: removed the unused `@ai-sdk/groq` dependency (no live code imported it - every route already used the Vercel AI Gateway `MODEL` string directly), rewrote `tests/api/job-fit.test.ts` to match the current deterministic (non-AI) implementation of that route and use valid UUIDs, and swept every doc (`README.md`, `TODO.md`, `.claude/CLAUDE.md`, `.claude/ARCHITECTURE.md`, `context/*.md`) so "Groq" only appears where it's genuinely historical

## In Progress

- None currently.

## Next Up

(from `TODO.md`'s unchecked items, no priority order implied)

- Saved jobs / bookmarks - let candidates bookmark jobs to revisit
- Employer pipeline analytics - conversion funnel across stages, time-in-stage
- File upload for qualifications - `document_url` column exists on `qualifications`, no upload flow yet (separate from the resume upload, which already works)
- Coach session persistence - `coach_sessions` table exists, route never reads/writes it; conversations don't survive a reload
- Profile completeness nudge - coach should prompt a sparse profile to fill itself in rather than giving hollow generic advice
- Contextual follow-up suggestion chips after each coach response
- Conversation export (copy/download chat as plain text)
- Auth profile creation fix - move the post-signup `profiles` insert into a DB trigger/server action so a dropped connection can't strand a user

## Open Questions

- Should `is_public = false` candidates stay visible to employers they've already applied to? Currently fully invisible everywhere, including in a pipeline they're already in.

## Architecture Decisions

- Correctness-critical AI logic (e.g. "don't re-suggest an already-applied candidate") is always a deterministic pre-check in code, never delegated to the model deciding to call a check tool - originally forced by Groq's unreliable tool-calling, kept as defense in depth after moving providers.
- Public, cross-owner data access (portfolio page, job's employer name) goes through `SECURITY DEFINER` RPC functions gated on an explicit visibility/status flag, never a table `GRANT` to `anon` - the anon key ships client-side, so a table grant would open bulk PostgREST access to PII.
- CSP intentionally keeps `'unsafe-inline'` for script/style for now (inline `style={{}}` used throughout, Next's inline bootstrap scripts) - tightening to nonces is deferred, ship as `Content-Security-Policy-Report-Only` first if attempted.
- Rate limiting (`lib/rate-limit.ts`) is in-memory, per-instance only - fine at current scale, swap for Upstash/Redis if durable cross-instance limiting is ever needed.

## Session Notes

- Deep implementation detail (per-feature, per-route, motion/animation specifics) lives in `.claude/ARCHITECTURE.md` - read the matching subsection before touching a feature, don't rediscover it from scratch.
- Known traps and gotchas (framework, RLS, React Flow, animation, etc.) are catalogued and categorized in `.claude/CLAUDE.md`'s Gotchas section - check there before debugging something that looks like a new bug, it may already be documented.
