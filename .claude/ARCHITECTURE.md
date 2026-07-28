# Path OS — Architecture & Feature Notes

Implementation details grouped by domain. Read this when working on a specific area to understand decisions already made.

---

## Auth & Onboarding

- Signup redirect: employers → `/employer/dashboard`, candidates → `/onboarding` — prevents employers landing on candidate onboarding. `app/(auth)/signup/page.tsx`
- `useSearchParams()` in signup page wrapped in Suspense boundary — Next.js 16 requirement
- Resume auto-fill at `/onboarding` — pre-screen (`showImport` state, default `true`) renders before the wizard. Candidate pastes CV text; `POST /api/resumes/parse` calls Groq (`generateText`, maxOutputTokens 2048) returns structured JSON. Client merges into all wizard state vars; skills matched case-insensitively against `allSkills` pre-selected at "mid" level. "Skip, fill manually" bypasses. Input capped at 20,000 chars. Double-parse fallback with regex `/\{[\s\S]*\}/`.

---

## Branding

- `components/Logo.tsx` — inline SVG node-path mark (three ascending connected nodes, echoing the React Flow node/edge language of `CareerPathExplorer`) on `--muted`/`--brand`, replaces the earlier plain "P" lettermark. Sized via `size` prop (all call sites use square dimensions: 32/40/64/80), `className` passthrough for `rounded-sm`/`rounded-md`. The badge fill uses `--muted` (not `--bg-elevated`, which is documented in `.claude/CLAUDE.md`'s color-token list but never actually defined in `app/globals.css` — `--muted: oklch(0.21 0.013 258)` is the real token with that exact value; several other files still reference the undefined `--bg-elevated`/`--bg-surface`/`--bg-base` names, e.g. `ApplyButton.tsx`, `PipelineBoard.tsx`, `app/p/[candidateId]/page.tsx` — unfixed, out of scope for the logo change).
- `app/icon.tsx` / `app/apple-icon.tsx` — Next.js file-convention icons rendered via `next/og`'s `ImageResponse` (Satori). Satori does not support CSS custom properties or `oklch()` — colors there are hardcoded hex (`#15191e` / `#fcb452`) rather than `var(--brand)`, which works fine in `components/Logo.tsx` since that renders through the real browser/React DOM instead. Satori does support nested `<svg>`/`<path>`/`<circle>` JSX, so the icon files mirror the same node-path mark as `Logo.tsx`, just hand-synced (no shared source) since Satori can't import the component directly.
- Sidebar nav-item icons (`CandidateSidebar.tsx`, `EmployerSidebar.tsx`) — each `navItems` array's `icon` field is a `lucide-react` component reference (e.g. `icon: LayoutDashboard`), rendered as `<item.icon className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />`. Replaced the original Unicode geometric-glyph placeholders (`⊟ ◈ ◉` etc.) — `lucide-react` was already a dependency (used by `components/ui/select.tsx`/`dropdown-menu.tsx`) so no new package was added. Icons inherit `currentColor` automatically, so active/hover text-color classes on the parent `<Link>` style them with no extra work. Each sidebar still defines its own inline `navItems` array (no shared config file) — this duplication is intentional/pre-existing, not something to refactor away casually.
- Dashboard "Quick actions" cards (`app/(candidate)/dashboard/page.tsx`, `app/(employer)/employer/dashboard/page.tsx`) — same glyph-to-`lucide-react` swap as the sidebars, reusing the *same* icon per feature as its sidebar nav entry (e.g. "Explore career paths" card and "Explore Paths" nav item both use `Route`) for visual consistency between the two entry points to the same page.

---

## Database & Supabase

- Admin client at `lib/supabase/admin.ts` — uses service role key, bypasses RLS, server-only
- `proxy.ts` has early return guard when env vars are missing (landing page works without Supabase)
- Migration index: `001` base schema · `002` jobs/applications · `003` service_role grants · `004` credential_url on qualifications

---

## AI / Groq Routes

All AI routes use Vercel AI SDK `streamText`/`generateText`. Client: `lib/claude/client.ts` exports `groq` + `MODEL` (`llama-3.3-70b-versatile`). Requires `GROQ_API_KEY`.

| Route | Method | Auth | Key params |
|---|---|---|---|
| `/api/ai/coach` | POST | candidate | maxOutputTokens 1024, 10-message sliding window, tool-calling loop (`stopWhen: stepCountIs(5)`) with 5 tools: `findMatchingJobs`, `getSalaryBenchmarks`, `addSkillToProfile`, `getCareerPathOptions` (reuses `lib/career-path.ts`'s `findShortestPath`), `getApplicationStatus` |
| `/api/ai/cover-note` | POST | candidate | maxOutputTokens 512, takes `{ jobId }` |
| `/api/ai/skill-gap` | POST | candidate | maxOutputTokens 800, takes `{ currentRole, targetRole, missingSkills }` |
| `/api/ai/job-fit` | POST | candidate | maxOutputTokens 256, returns `{ score: 0-100, summary }` |
| `/api/ai/jd-writer` | POST | employer | maxOutputTokens 800, takes `{ title, location, employmentType, skills, roughNotes }` |
| `/api/ai/re-engage` | POST | employer | deterministically excludes candidates who've already applied to any of the employer's open jobs (queried before prompting, not left to the model - see Gotchas) before asking the LLM to rank fits; text+regex-parsed JSON output; wrapped in try/catch, returns `{ suggestions: [] }` on any generation failure; returns up to 5 `ReEngageSuggestion[]` |
| `/api/certificates/coursera` | POST | — | server-side fetch + OG tag parse, SSRF-guarded |
| `/api/certificates/skills-suggest` | POST | — | Groq, up to 6 skills |
| `/api/resumes/parse` | POST | candidate | Groq, maxOutputTokens 2048 |

---

## Candidate Features

### Jobs (`/jobs`)
- `page.tsx` — server component. Pre-fetches candidate profile + existing applications to hydrate `initialApplied`. Derives `allSkills` from all jobs and passes to `JobsClientView.tsx`.
- Company name on job cards comes from the `employer_profiles(company_name)` embed on the `jobs` select. `employer_profiles` has no blanket public-read policy - only "own" (migration 001) plus "public read when hiring", gated through the `employer_is_hiring(uuid)` SECURITY DEFINER function (migration 008) so an employer's row is only readable while they have ≥1 open job. See the RLS-recursion gotcha in `.claude/CLAUDE.md` before touching either policy.
- `JobsClientView.tsx` — client component. Filters: keyword, location, employment type (Select), salary min (RM, null-salary jobs always pass), skill badges (multi-select, all must be present). Filtering via `useMemo` — no `useEffect`. "Clear" appears only when a filter is active.
- `ApplyButton.tsx` — step state machine: `idle → generating → editing → submitting`. Calls `/api/ai/cover-note` on Apply; editable textarea pre-filled with AI note. Both "Submit" and "Skip note" insert into `applications`. Cancel resets to idle. Generation failures fall through silently to editing with empty textarea.
- `FitScore.tsx` — calls `/api/ai/job-fit` on mount per card. Color-coded pill: ≥70 `--success`, 40–69 `--accent`, <40 `--text-muted`. Skeleton pulses during load; hides on error. Guarded by `candidateProfile` existence.

### Applications (`/applications`)
- Pure server component. Fetches `applications` with nested `jobs(title, location, employment_type, employer_profiles(company_name))` ordered by `applied_at` desc.
- Status badge colors: applied=brand, reviewed=muted, shortlisted=success/10, offered=success/20, rejected=destructive/10.
- Date shown as relative (Intl.RelativeTimeFormat), falls back to absolute for >7 days.

### Explore (`/explore`)
- `explore/page.tsx` (server) fetches `candidate_skills`, flattens to `candidateSkillNames: string[]`, passes to `CareerPathExplorer`.
- Detail panel partitions `career_edges.skill_gaps` into "You already have" (green) vs "You still need" (amber) by case-insensitive match.
- "Generate Learning Roadmap" hidden if all gaps covered. Roadmap state (`roadmap`/`roadmapLoading`/`roadmapError`) resets on `selectedNode?.id` change via a render-time comparison (`roadmapResetKey` state + `if` check), not a `useEffect` — avoids both an `react-hooks/set-state-in-effect` lint error and a one-frame flash of the previous node's stale roadmap that an effect-based reset (which fires after paint) would show.
- Returns `{ roadmap: { summary, steps[{ skill, action, resource }], estimatedMonths } }`.

**Path highlighting** (added in personalized-path feature):
- `findShortestPath(nodes, edges, fromId, toId)` — module-level Dijkstra by `avg_transition_months`. Returns `PathResult | null`. Runs over the full graph (not filtered `visibleNodes`).
- `targetNodeId` state persisted to `localStorage("career-explore-target")` — survives refresh.
- Node drag positions captured on drag-end via `handleNodesChange` wrapper, persisted to `localStorage("career-explore-positions-v2")` as `Record<id, {x,y}>`. `savedPositionsRef = useRef(readSavedPositions())` reads that storage synchronously as the ref's initial value (fine — this is a `useRef` initializer, not a `.current` read during render/`useMemo`). Data-only updates (isOnPath, isTarget changes) use functional `setRfNodes` that preserves current positions.

**Grid layout** (category lane × level row):
- `defaultPositions` memo computes each node's grid slot independently of any saved drag override: lane X from `CATEGORY_ORDER` index (categories not in the list sort alphabetically to the end, so a new category never collides at x=0) × `LANE_WIDTH`, row Y from `LEVEL_Y[level]`, and nodes sharing the same `category|level` are centered around the lane's base X (not left-anchored) via `NODE_SPACING`.
- `categoryNodes` is pure — position is always `defaultPositions[id]`, no ref read (avoids `react-hooks/refs`; a `.current` read inside a `useMemo` callback is unsafe, see gotcha below). Saved drag positions are layered on top separately:
  - A `useLayoutEffect` (runs once on mount, before paint) applies `savedPositionsRef.current[id]` over the default-seeded `rfNodes`, so there's no flash of the default grid position.
  - The "sync `categoryNodes` changes" effect (filter/target/path changes) then prefers the already-rendered position, falling back to `savedPositionsRef.current[id]`, falling back to the default — so a node revealed later (e.g. by a filter change) still picks up its saved position.
- "Reset layout" button clears `savedPositionsRef`/localStorage and applies `defaultPositions` directly to `rfNodes` via `setRfNodes((prev) => ...)` — it does NOT call `setRfNodes(categoryNodes)`, since that memo can be stale relative to a just-cleared ref (see gotcha below).
- Path edges: brand amber stroke + `animated: true`. Off-path edges: `opacity: 0.25`. Filter buttons disabled (`pointer-events-none opacity-40`) when destination is set.
- **React Flow custom nodes require `<Handle>` components** — without them, no edges render at all. `CareerNodeCard` has hidden `<Handle type="target" position={Position.Top}>` + `<Handle type="source" position={Position.Bottom}>` (opacity 0, no pointer events).
- **Edge initialization**: use `useEdgesState(computedEdges)` not `useEdgesState([])` — initializing with empty array means RF renders 0 edges on first paint and the effect that fills them can arrive too late.

### Certificates (`/certificates`)
- Migration `004_credential_url.sql` adds `credential_url text` to `qualifications`.
- Portfolio page splits Education and Certificates into separate sections. Certs with `credential_url` show Coursera badge + Verify link + Recent badge (earned within 90 days).
- Portfolio page (`app/(candidate)/portfolio/page.tsx`) fetches `portfolio_items` and now renders them in a Projects section (previously fetched but never rendered — the public `/p/[candidateId]` page had its own Projects section, the private one didn't). No shared component between the two pages: each section (Education/Certs/Work/Skills/Projects) is independently reimplemented per page with that page's own styling convention (Tailwind classes on the private page, inline `style={{ color: "var(--...)" }}` on the public page) — match that pattern rather than extracting shared section components.
- After adding a cert, shows which career roles the suggested skills move the candidate toward (uses `career_edges.skill_gaps`).

### Profile Edit (`/profile/edit`)
- Server page fetches `candidate_profiles`, passes to `ProfileEditForm` (client). Does `UPDATE` on `candidate_profiles`.

### Public Portfolio (`/p/[candidateId]`)
- `app/p/[candidateId]/page.tsx` — public server component, no auth gate. Uses the **anon server client** (`@/lib/supabase/server` `createClient()`) and calls the `get_public_portfolio(p_id)` RPC (security hardening, migration 005), **not** the service-role admin client and **not** direct table selects. The RPC returns one candidate's full portfolio as JSON only when `is_public = true`; private/missing → `null` → `notFound()`. `fetchPortfolio()` helper wraps the rpc call; both `generateMetadata` and the page use it.
- **Visibility model (migration 005):** `candidate_profiles.is_public boolean default true`. `get_public_portfolio(p_id)` is `SECURITY DEFINER` (bypasses RLS internally but gates on `is_public`) and granted `execute` to `anon`/`authenticated` — **no** `grant select` to anon on the tables, so the public PostgREST endpoint stays closed and the data can't be bulk-scraped via the anon key. Sub-tables (`qualifications`, `work_experiences`, `portfolio_items`, `candidate_skills`) keep owner-only RLS; non-owners reach them only through the RPC, one id at a time (UUID-gated). The old `"candidate_profiles: employer read" using (true)` policy is replaced by `"public read" using (is_public = true)` (authenticated employer search now hides opted-out candidates). Consequence: a candidate who opts out is invisible even to employers they applied to — add an applications-scoped policy if that's needed later.
- Renders: header, bio, Education, Certificates, Work Experience, Skills, Projects (portfolio_items) sections. Standalone layout — no sidebar, no nav rail. Minimal header with "Path OS" wordmark + footer "Powered by Path OS / Build your profile →".
- `generateMetadata` sets `<title>` to `"${name} — Path OS Portfolio"`.
- `components/ShareButton.tsx` — client component on the private `/portfolio` page. Copies `/p/{candidateId}` URL to clipboard; shows "Copied!" for 2s.
- `/p/` is not in `proxy.ts` protectedPaths — no middleware change needed. `proxy.ts` rate-limits `/p/` (60/min/IP) and `/api/demo` (5/min/IP) via `lib/rate-limit.ts` (in-memory, per-instance).

### Security
- **HTTP headers** set in `next.config.ts` `headers()` for all routes: CSP (conservative — `'unsafe-inline'` for style/script, `frame-ancestors 'none'`), X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, HSTS.
- **Input validation:** AI/cert API routes validate the request body with Zod via `lib/validate.ts` `parseBody(req, schema)` (returns `{ data }` or a 400 `{ error }`). Free-text fields fed to the LLM are length-capped to bound Groq cost / DoS.
- **Rate limiting:** `lib/rate-limit.ts` — fixed-window, in-memory `Map`. Per-instance only (not shared across serverless/edge); swap for Upstash/Redis if durable limiting is needed.

### Coach
- `react-markdown` in `CoachChat.tsx` for rendering structured responses. User messages render as plain text.

---

## Employer Features

### Jobs (`/employer/jobs`)
- New job form at `app/(employer)/employer/jobs/new/page.tsx` — client-side, inserts into `jobs`.
- Jobs list at `app/(employer)/employer/jobs/page.tsx`.
- "Polish with AI ✦" button calls `/api/ai/jd-writer`; replaces textarea content with polished JD. Disabled when textarea empty or in-flight.

### Setup & Profile
- Setup page at `app/(employer)/employer/setup/page.tsx` — single-step form, inserts into `employer_profiles`. Handles `23505` unique violation by redirecting to dashboard.
- Profile edit at `app/(employer)/employer/profile/` — redirects to `/employer/setup` if no profile exists. `EmployerProfileForm` does `UPDATE` on `employer_profiles`.

### Pipeline (`/employer/pipeline`)
- `page.tsx` (server) passes serialized `AppRow[]` + `JobRow[]` to `PipelineBoard.tsx` (client).
- Board holds optimistic local state. Stages: `["applied", "reviewed", "shortlisted", "offered"]`. ← / → chevrons step through stages; ✕ rejects.
- Rejected cards hide from columns, appear in collapsible section below with "Restore →".
- `loadingId` state disables buttons during in-flight updates; errors revert state and show "Update failed".

### Smart Search & Talent Pool (`/employer/search`)
- `SaveToPoolButton.tsx` — client component. On mount fetches employer_id + existing `talent_pools` entries. Inserts with `source: 'scouted'`; handles `23505` as already-saved. Shows "Saved ✓" in `--success`.

### Re-engage
- `POST /api/ai/re-engage` fetches employer's open jobs + talent pool candidates with skills, returns up to 5 `ReEngageSuggestion[]` (`candidateId`, `name`, `jobTitle`, `fitNote`, `outreachDraft`). Returns `{ suggestions: [] }` if pool or jobs empty.

---

## Demo System

- `POST /api/demo` seeds a full demo account on first call (idempotent).
- Demo candidate: "Ahmad Chicken" (UTM CS, Grab intern, 5 skills, 2 portfolio projects).
- Demo employer: "TechCorp Malaysia" (3 open jobs).
- `linkDemoPool()` called on every demo login (idempotent upsert) — cross-links demo candidate into demo employer's talent pool regardless of seeding order.
- Landing page: demo buttons are primary CTAs (amber-filled); signup links are inline text below. "2-minute walkthrough" section between hero and feature grid with `candidateSteps` / `employerSteps` arrays.

---

## Navigation

| Nav item | Icon | Sidebar | Location |
|---|---|---|---|
| My Applications | ◫ | Candidate | After Jobs |
| Profile | ◓ | Candidate | Between Portfolio and Certificates |
| Company Profile | ◓ | Employer | Between Dashboard and Jobs |
| Jobs | — | Employer | Added with job posting feature |
