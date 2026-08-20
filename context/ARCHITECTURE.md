# Architecture Context

Index-level summary. Full feature-by-feature implementation detail (theming internals, per-route breakdowns, animation/motion choreography) lives in [`.claude/ARCHITECTURE.md`](../.claude/ARCHITECTURE.md) - this file stays high-level and cross-references it rather than duplicating it. Project-wide gotchas and design tokens live in [`.claude/CLAUDE.md`](../.claude/CLAUDE.md).

## Stack

| Layer | Technology | Role |
| --- | --- | --- |
| Framework | Next.js 16.2.7 (App Router, Turbopack), React 19.2 | Full-stack app: pages, API routes, server actions |
| UI | Tailwind CSS v4, shadcn/ui, `@base-ui/react` | Styling and component primitives |
| Auth | Supabase Auth (`@supabase/ssr`) | Sign-up/login, session management |
| Database | Supabase (PostgreSQL) | All structured data, RLS-gated |
| File storage | Supabase Storage | Resume file uploads (private `resumes` bucket) |
| AI | Vercel AI Gateway (`openai/gpt-5.6-luna`) via Vercel AI SDK (`ai@6`), `lib/claude/client.ts` | Coach tool-calling loops, fit scoring, extraction, re-engagement. Every AI route imports `MODEL` and passes it directly to `generateText`/`streamText` - none call a provider SDK. Previously Groq (`llama-3.3-70b-versatile`) - moved off it for cost and tool-calling reliability. `@ai-sdk/groq` is still listed in `package.json` and referenced in two test mocks (`tests/api/job-fit.test.ts`, `tests/api/resume-parse.test.ts`) but nothing in `app/`/`lib/` imports it - dead dependency, not wired to anything live |
| AI (secondary) | Google Gemini (`@ai-sdk/google`) | PDF resume parsing for the ATS checker (text-only AI models can't take file input) |
| Visualization | React Flow (`@xyflow/react` / `reactflow`) | Career graph, pipeline kanban |
| 3D/decorative | `@react-three/fiber`, `three`, `ogl` | Landing page background effects |
| Deployment | Vercel | Hosting |

## System Boundaries

- `app/(auth)/` - signup, login, logout
- `app/(candidate)/` - all candidate-facing routes (onboarding, dashboard, profile, coach, explore, jobs, applications, certificates, pay)
- `app/(employer)/employer/` - all employer-facing routes (setup, profile, dashboard, jobs, search, pipeline, re-engage)
- `app/p/[candidateId]/` - public, no-auth portfolio page
- `app/api/ai/` - AI endpoints (coach, employer-coach, match, extraction, re-engage, ats-check)
- `app/api/resumes/`, `app/api/certificates/` - file upload + AI parsing
- `app/api/demo/` - demo account seeding
- `lib/` - shared server logic (Supabase clients, rate limiting, AI client setup)
- `components/` - shared UI, including the two Coach chat UIs and career graph/pipeline visualizations
- `supabase/migrations/` - schema, RLS policies, and storage bucket setup, applied in order

## Storage Model

- **Database (Supabase/Postgres)**: all structured data - profiles, career graph, jobs, applications, talent pools. See [`context/SCHEMA.md`](./SCHEMA.md) for the full table list and RLS policies.
- **File storage (Supabase Storage)**: candidate resumes only, in a private `resumes` bucket keyed `{user_id}/resume.{ext}`. Qualification documents (`qualifications.document_url`) have a column but no upload flow yet (see `context/TRACKER.md`).

## Auth and Access Model

- Every user signs in via Supabase Auth; a `profiles` row (role: `candidate` | `employer`) links `auth.users` to a `candidate_profiles` or `employer_profiles` row.
- Row-level security is enabled on every table. A table needs both an RLS policy (which rows) and an explicit `GRANT` (whether the role can touch the table at all) - Postgres checks both, one without the other silently fails.
- Cross-boundary public reads (the portfolio page, employer-profile-on-job-listing) go through `SECURITY DEFINER` RPC functions (`get_public_portfolio`, `employer_is_hiring`), never through anon table grants - the anon key ships in the browser bundle, so a table grant would expose bulk PostgREST access to PII.
- `service_role` (used for demo seeding/admin ops) needs its own explicit grants; RLS being enabled does not grant it access automatically.

## Invariants

1. A table-select RLS policy must never subquery a table whose own policy subqueries back into the first table - route the check through a `SECURITY DEFINER` function instead (Postgres 42P17 infinite recursion otherwise).
2. Correctness-critical AI logic (e.g. "don't re-suggest a candidate already in an active pipeline") is done deterministically in application code before prompting, never left to the model deciding to call a check tool. Kept as defense in depth even after moving off Groq (whose tool-calling wasn't reliable enough for conditional/structured guarantees) to the current Vercel AI Gateway model.
3. Any `streamText` route with a multi-step tool loop (`stopWhen: stepCountIs(n)`) must set `export const maxDuration`, or it falls back to Vercel's default function timeout mid-stream.
4. Public, no-auth data access (the portfolio page) goes through a `SECURITY DEFINER` RPC gated on an explicit visibility flag, never a table grant to `anon`.
5. New RLS policy + still getting a permission error → check the table's `GRANT`s next, not just the policy (see Auth and Access Model above).
