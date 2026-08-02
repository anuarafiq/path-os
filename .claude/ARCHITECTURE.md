# Path OS — Architecture & Feature Notes

Implementation details grouped by domain. Read this when working on a specific area to understand decisions already made.

---

## Auth & Onboarding

- Signup redirect: employers → `/employer/dashboard`, candidates → `/onboarding` — prevents employers landing on candidate onboarding. `app/(auth)/signup/page.tsx`
- `useSearchParams()` in signup page wrapped in Suspense boundary — Next.js 16 requirement
- Resume auto-fill at `/onboarding` — pre-screen (`showImport` state, default `true`) renders before the wizard. Candidate pastes CV text; `POST /api/resumes/parse` calls Groq (`generateText`, maxOutputTokens 2048) returns structured JSON. Client merges into all wizard state vars; skills matched case-insensitively against `allSkills` pre-selected at "mid" level. "Skip, fill manually" bypasses. Input capped at 20,000 chars. Double-parse fallback with regex `/\{[\s\S]*\}/`.
- Resume file upload — separate from the text-paste auto-fill above (no extraction, just storage). `components/ResumeUpload.tsx` (shared by onboarding Step 0 and `/profile/edit`) uploads to the private `resumes` Supabase Storage bucket at `{user_id}/resume.{ext}` (upsert on replace, so no orphaned objects). Client validates extension (pdf/doc/docx) and size (≤5MB) before uploading. The component only performs the storage call; the resulting path is held in the parent's state and written to `candidate_profiles.resume_url` as part of the existing Finish/Save action, same as every other field. Viewing generates a 60s signed URL on click rather than exposing a public URL.

---

## Branding

- `components/Logo.tsx` — inline SVG node-path mark (three ascending connected nodes, echoing the React Flow node/edge language of `CareerPathExplorer`) on `--muted`/`--brand`, replaces the earlier plain "P" lettermark. Sized via `size` prop (all call sites use square dimensions: 32/40/64/80), `className` passthrough for `rounded-sm`/`rounded-md`. The badge fill uses `--muted` (not `--bg-elevated`, which is documented in `.claude/CLAUDE.md`'s color-token list but never actually defined in `app/globals.css` — `--muted: oklch(0.21 0.013 258)` is the real token with that exact value; several other files still reference the undefined `--bg-elevated`/`--bg-surface`/`--bg-base` names, e.g. `ApplyButton.tsx`, `PipelineBoard.tsx`, `app/p/[candidateId]/page.tsx` — unfixed, out of scope for the logo change).
- `app/icon.tsx` / `app/apple-icon.tsx` — Next.js file-convention icons rendered via `next/og`'s `ImageResponse` (Satori). Satori does not support CSS custom properties or `oklch()` — colors there are hardcoded hex (`#15191e` / `#fcb452`) rather than `var(--brand)`, which works fine in `components/Logo.tsx` since that renders through the real browser/React DOM instead. Satori does support nested `<svg>`/`<path>`/`<circle>` JSX, so the icon files mirror the same node-path mark as `Logo.tsx`, just hand-synced (no shared source) since Satori can't import the component directly.
- Sidebar nav-item icons (`CandidateSidebar.tsx`, `EmployerSidebar.tsx`) — each `navItems` array's `icon` field is a `lucide-react` component reference (e.g. `icon: LayoutDashboard`), rendered as `<item.icon className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />`. Replaced the original Unicode geometric-glyph placeholders (`⊟ ◈ ◉` etc.) — `lucide-react` was already a dependency (used by `components/ui/select.tsx`/`dropdown-menu.tsx`) so no new package was added. Icons inherit `currentColor` automatically, so active/hover text-color classes on the parent `<Link>` style them with no extra work. Each sidebar still defines its own inline `navItems` array (no shared config file) — this duplication is intentional/pre-existing, not something to refactor away casually.
- Dashboard "Quick actions" cards (`app/(candidate)/dashboard/page.tsx`, `app/(employer)/employer/dashboard/page.tsx`) — same glyph-to-`lucide-react` swap as the sidebars, reusing the *same* icon per feature as its sidebar nav entry (e.g. "Explore career paths" card and "Explore Paths" nav item both use `Route`) for visual consistency between the two entry points to the same page.

---

## Theming

- Light/dark toggle via `next-themes` (was already a dependency, unwired until this feature). `components/theme-provider.tsx` wraps `NextThemesProvider` with `attribute="class"` (next-themes defaults to `data-theme`, but `globals.css` already has `@custom-variant dark (&:is(.dark *))` wired for the class-based variant), `defaultTheme="dark"`, `enableSystem={false}` (no OS-preference branch, explicit toggle only), `disableTransitionOnChange` (the app uses `transition-colors`/`transition-all` heavily; without this a theme swap animates every element as a visible wave). Mounted in `app/layout.tsx` inside `<body>`; the `<html>` element no longer hardcodes a `dark` class — next-themes owns it, injecting a pre-hydration script so new visitors never flash the light base before dark applies.
- Token architecture in `app/globals.css`: bare `:root` now holds **light** values (the base/fallback state), an explicit `.dark { }` block holds the original dark values. Cascade makes `.dark` win when the class is present; no `.light {}` block needed since next-themes with `attribute="class"` just adds/removes literal `dark`/`light` classes. `@theme inline` is theme-agnostic, unchanged.
- **Light-mode brand/semantic tokens are darkened, not lightness-flipped** — see the CLAUDE.md gotcha for why (saturated hues, especially amber, don't track WCAG contrast the same way neutrals do under a naive OKLCH lightness flip). `--primary`/`--brand`/`--ring` = `oklch(0.45 0.13 72)` in light mode vs `oklch(0.82 0.14 72)` in dark — opposite direction from the neutral ramp. `--primary-foreground` is asymmetric between themes for the same reason (dark text in dark mode, pale text in light mode, since the button fill itself flips from light to dark).
- Non-token dark-specific CSS (scrollbar thumb colors, the `input[type="month"]`/`type="date"` calendar picker icon filter) moved from unconditioned rules to `.dark`-scoped overrides on top of new light-mode defaults, same `@layer base` block in `globals.css`.
- `components/ThemeToggle.tsx` — icon-only (`lucide-react` `Sun`/`Moon`, mount-guarded against `useTheme()`'s SSR/hydration timing) button in the sidebar footer, sharing a flex row with "Sign out" rather than a second stacked full-width text row (`CandidateSidebar.tsx`, `EmployerSidebar.tsx` — both render the same shared `navContent` block for desktop `<aside>` and the mobile drawer, so one insertion covers both).
- `CareerPathExplorer.tsx`'s React Flow canvas (edges, `<Background>`, `<MiniMap>`) doesn't reliably consume `var(--token)` in its color props (`nodeColor` is a JS callback needing a resolved literal) — themed via a colocated `FLOW_COLORS.{dark,light}` map + `useTheme()`, not CSS variables. See CLAUDE.md gotcha.
- Two arbitrary-value Tailwind spots (`hover:text-[oklch(...)]` in `ApplyButton.tsx`, `SaveToPoolButton.tsx`) that bypassed the token system were swapped to `hover:text-primary-foreground` (the semantically correct pairing for a `hover:bg-[var(--brand)]` fill in either theme).
- Out of scope / not touched: the undefined-CSS-variable bug (`--bg-base`, `--text-primary`, etc. — see Branding section above) affects the same files regardless of theme and predates this feature.

### Liquid glass (`.glass` utility)
- One global SVG filter (`feTurbulence` → `feGaussianBlur` → `feDisplacementMap` → `feGaussianBlur`, ported from kokonutui's `LiquidGlassCard`) rendered once, hidden, in `app/layout.tsx` as `<filter id="liquid-glass">`, plus a `.glass`/`.dark .glass` CSS rule (translucent `color-mix(in oklch, var(--card) 30%, transparent)` fill, `backdrop-filter: url("#liquid-glass")`, rim-light inset `box-shadow`) in a raw `<style dangerouslySetInnerHTML>` tag right after it — **not** in `globals.css`, see the Lightning CSS gotcha in `.claude/CLAUDE.md`. One filter definition + one class is reused everywhere via `backdrop-filter: url(#id)`, rather than kokonutui's original per-instance `useId()` + `<GlassFilter>` component (nothing in this app imports the shadcn `Card` primitive kokonutui's version extends, so there was no existing component to attach that pattern to).
- Applied by replacing the `bg-card`/`bg-sidebar`/`bg-popover` token with `glass` at each call site — border/rounded/padding/shadow classes are left untouched, so it's a fill swap, not a restructure. Covers: dashboard stat tiles and non-highlighted quick-action cards (both dashboards), job/candidate listing + filter cards (`JobsClientView.tsx`, `employer/search/page.tsx`), pipeline kanban cards (`PipelineBoard.tsx`), `FairPayEngine.tsx`, `CoachChat.tsx` chat bubbles, landing page cards (`app/page.tsx`), onboarding qualification/work-experience row cards, all list-page empty states, the mobile nav drawer panel (`CandidateSidebar.tsx`/`EmployerSidebar.tsx` — the slide-in drawer only, not the desktop `<aside>` or the `bg-black/60` scrim), the `CareerPathExplorer` filter toolbar + path-active chip + detail panel (all float over the React Flow canvas), the `/applications` list cards, and `ProfileDropdown`'s popover surface (`components/ui/dropdown-menu.tsx`'s shared `DropdownMenuContent`, its only consumer).
- `/portfolio` had no existing card surface at all (a flowing document with `border-b` divider rows, no `bg-card` boxes) — wrapped the whole content column in one `glass border border-border rounded-xl` sheet instead of converting individual rows, matching how `FairPayEngine` wraps its content in a single card.
- **Bonus fix, not the point of the change:** `/applications`' row cards used `bg-[--bg-surface]`, an undefined CSS variable (see the Branding section's undefined-token note) — the cards were rendering with **no background at all** before this. Swapping to `glass` incidentally fixed that; `border-[--border-subtle]` on the same element is still an undefined token and still invisible, left alone as out of scope (same precedent as Branding).
- **Deliberately excluded:** the hero summary card (`.bg-gradient-hero`) and the AI Coach/Find Talent highlighted action tile (`.bg-gradient-coach`). Both layer a flat 42%-black wash under their gradient specifically to hold 4.5:1 WCAG text contrast (see `globals.css:251-253` comment) — making them translucent would undo that and there's nothing behind them to refract anyway. Loading-state skeletons (`loading.tsx` files) were also left alone — a shimmering skeleton doesn't benefit from a static glass panel, and skeletons are transient.
- Perf note: `backdrop-filter` + SVG turbulence is non-trivial per-element cost. Not an issue at this app's scale (longest list seen so far: 17 jobs), but if a list grows large enough to visibly jank, drop to a plain `backdrop-blur` (remove `url(#liquid-glass)` from the `backdrop-filter` value) on just that view rather than reworking the shared `.glass` class.

### BorderGlow hover effect (AI Coach / Find Talent tiles)
- `components/BorderGlow.tsx` (client, ported from React Bits) + `components/BorderGlow.module.css` — a cursor-tracking mesh-gradient border/glow ring, driven by `onPointerMove` writing `--edge-proximity`/`--cursor-angle` CSS custom properties directly via `ref.style.setProperty` (no re-render per mouse move). CSS Modules, not a raw `.css` import — no `backdrop-filter`/`filter: url(...)` in this component's CSS, so it isn't subject to the Lightning CSS `.glass` gotcha above and goes through the normal build.
- `components/HighlightGlowCard.tsx` (client) wraps the two designated "highest-emphasis" tiles — "Chat with AI Coach" (candidate dashboard) and "Find talent" (employer dashboard, AI-powered candidate matching) — with `<BorderGlow>` as an **additive** hover ring layered around the existing `.bg-gradient-coach` fill; the fill/text/icon styling on those tiles is untouched. `backgroundColor="transparent"` and `fillOpacity={0}` keep BorderGlow from painting its own box so it doesn't read as a nested card. `borderRadius={8}` matches the inner tile's `rounded-lg`.
- Glow hue/mesh colors are a theme-aware `GLOW.{light,dark}` constant (mount-guarded `useTheme()` read, same precedent as `CareerPathExplorer`'s `FLOW_COLORS`), hand-converted from `--brand`/`--accent-purple`/`--accent-pink` OKLCH → sRGB since `BorderGlow`'s `glowColor` prop is a regex-parsed literal `"H S L"` string and can't take a CSS `var()`.
- Both dashboard pages stay server components — `quickActions.map`/`actions.map` build the tile JSX once per item, then conditionally wrap only the highlighted one in `<HighlightGlowCard>`; the client boundary is isolated to the wrapper, not the whole page.

### Page backgrounds (hero + both dashboards)
- `components/DotGrid.tsx` — plain server component (no `"use client"`), a static SVG dot pattern (`fill-foreground` at low opacity, radial-gradient `mask-image` so it fades out rather than tiling edge-to-edge). Reuses the neutral `--foreground` token only, no new color. Rendered as the first child inside each page's `relative` wrapper, `-z-10 pointer-events-none`. Used on the landing hero (`app/page.tsx`) and both dashboards.
- `app/page.tsx`'s hero section additionally layers a soft single-hue radial glow (`var(--brand-subtle)`) and `components/Prism.tsx` (client, ported from React Bits, `ogl` WebGL shader) behind the headline — `hueShift`/`colorFrequency` tuned toward cyan but the shader's color ramp is generative (cycles through adjacent hues by depth), so it reads as cyan-leaning with a warmer core rather than a flat single hue; that's a property of the shader, not a bug.
- Both dashboards additionally layer `components/Beams.tsx` (client, ported from React Bits, `three` / `@react-three/fiber` / `@react-three/drei`) behind the cards, via the `components/DashboardBeams.tsx` wrapper. **The "radiant beam" look is black geometry (`diffuse` = `#000000`, kept as upstream) lit by a directional light — only the parts catching the light glow cyan, and that dark→bright→dark gradient across each strip *is* the beam.** An earlier attempt set `diffuse` to the cyan `lightColor`, which flattened every beam into a solid cyan bar (looked nothing like the reference) — don't do that; keep `diffuse` black and drive color through `lightColor` (`"#47eafb"`) on the `<DirLight>` instead. `beamSpacing` defaults to `0` (strips touch, forming one continuous noise-warped surface) — non-zero spacing separates them into isolated bars that read as static; leave it at 0 for the reference look. The only upstream change kept is removing the hardcoded `<color attach="background" args={['#000000']}>` so the canvas is transparent (the dark dashboard background shows through instead of a forced opaque black).
- **`DashboardBeams` gates the effect to dark mode only.** Because the beams are black-on-dark, they only read against a dark backdrop; in light mode they'd be harsh black diagonals on white. So `DashboardBeams` returns `null` unless `resolvedTheme === "dark"` (light mode keeps just the `DotGrid`). Gating rather than CSS-hiding also means the WebGL canvas only mounts when actually visible. The theme read needs a **hydration guard**: next-themes sets `.dark` on `<html>` pre-hydration, so `resolvedTheme` is already `"dark"` on the first client render but `null` on the server → hydration mismatch if you render the beams directly. The guard uses `useSyncExternalStore(emptySubscribe, () => true, () => false)` (`useHydrated`), which returns `false` on the server *and* the first client render, then `true` after — this is the lint-clean alternative to the `useEffect(() => setMounted(true), [])` mount guard the React Compiler's `set-state-in-effect` rule flags (see CLAUDE.md; `HighlightGlowCard` still uses the older setState pattern and trips that lint — a pre-existing wart, not copied here).
- **Gotcha, see CLAUDE.md:** the `Beams` wrapper canNOT use `-z-10` like `DotGrid`/`Prism` do — a plain (non-`position:absolute`) `<canvas>` nested inside a negative-`z-index` ancestor renders nothing in this project's WebKit-based test browser (draws happen, `gl.getError()` is clean, but the composited output is fully transparent). Fix used here: the background wrapper stays at default z-index (`absolute inset-0`, no `-z-*`), and the page's real content is wrapped in a sibling `relative z-10` div instead, so content still stacks above the canvas without putting the canvas itself at a negative z-index.

---

## Database & Supabase

- Admin client at `lib/supabase/admin.ts` — uses service role key, bypasses RLS, server-only
- `proxy.ts` has early return guard when env vars are missing (landing page works without Supabase)
- Migration index: `001` base schema · `002` jobs/applications · `003` service_role grants · `004` credential_url on qualifications · `010` resumes storage bucket + `candidate_profiles.resume_url`
- `resumes` Storage bucket (migration 010) — private (`public: false`). RLS on `storage.objects` is a path-prefix check (`(storage.foldername(name))[1] = auth.uid()::text`), not a join back to `candidate_profiles`/`profiles` — avoids the cross-table RLS recursion trap (see gotcha below). No new `service_role` grant needed for the new `resume_url` column since `003` already grants full table access on `candidate_profiles`, and `service_role` bypasses storage RLS by default.
- **Session/profile dedup** — `lib/supabase/server.ts` exports `getSessionProfile()` (returns `{ user, profile }` from `auth.getUser()` + a `profiles` row), `getCandidateProfile(profileId)`, and `getEmployerProfile(profileId)`, all wrapped in React's `cache()`. Every `(candidate)`/`(employer)` layout and page calls these instead of querying directly, so a layout+page pair sharing the same render pass collapses from 2-3 duplicate `getUser()`/`profiles`/`candidate_profiles`/`employer_profiles` round-trips down to one each. This does **not** dedupe against `proxy.ts`'s own `getUser()` call — middleware runs in a separate execution context from the RSC render, outside `cache()`'s scope, so that round-trip is unavoidable given middleware-based auth-gating. New candidate/employer pages should call these helpers rather than re-querying `profiles`/`candidate_profiles`/`employer_profiles` inline.
- `app/(candidate)/dashboard`, `app/(candidate)/jobs`, `app/(employer)/employer/dashboard`, `app/(employer)/employer/pipeline` have `loading.tsx` siblings (Next's automatic per-segment `Suspense` fallback) — added because these routes do multi-query server-side data fetching with no client-side loading state otherwise, so navigation showed a blank page until every query resolved. Not added to `app/(employer)/employer/search` — that page is `"use client"` with its own `loading` state around a `fetch()` call, not a blocking async Server Component, so a route-level skeleton wouldn't apply the same way.

---

## AI / Groq Routes

All AI routes use Vercel AI SDK `streamText`/`generateText`. Client: `lib/claude/client.ts` exports `groq` + `MODEL` (`llama-3.3-70b-versatile`). Requires `GROQ_API_KEY`.

| Route | Method | Auth | Key params |
|---|---|---|---|
| `/api/ai/coach` | POST | candidate | maxOutputTokens 1024, 10-message sliding window, tool-calling loop (`stopWhen: stepCountIs(5)`) with 9 tools: `findMatchingJobs`, `getSalaryBenchmarks`, `addSkillToProfile`, `removeSkillFromProfile`, `updateProfile`, `applyToJob`, `getCareerPathOptions` (reuses `lib/career-path.ts`'s `findShortestPath`), `getApplicationStatus`, `navigateTo` (whitelisted to `CANDIDATE_ROUTES` in `lib/agent-routes.ts`). Streams via `result.toUIMessageStreamResponse()` (not a hand-rolled SSE encoder) so tool calls/results reach the client as structured `message.parts` |
| `/api/ai/employer-coach` | POST | employer | Same shape as `/api/ai/coach`. 7 tools: `listJobs`, `listApplicants`, `createJob`, `updateApplicationStatus`, `saveCandidateToPool`, `updateEmployerProfile`, `navigateTo` (whitelisted to `EMPLOYER_ROUTES`). Every mutating tool does a deterministic pre-check in code before touching the DB (e.g. `updateApplicationStatus` verifies the application's job belongs to the calling employer before allowing the move) rather than trusting the model to have checked - see the Groq tool-calling gotcha in `.claude/CLAUDE.md` |
| `/api/ai/cover-note` | POST | candidate | maxOutputTokens 512, takes `{ jobId }` |
| `/api/ai/skill-gap` | POST | candidate | maxOutputTokens 800, takes `{ currentRole, targetRole, missingSkills }` |
| `/api/ai/job-fit` | POST | candidate | **no Groq call** — deterministic case-insensitive skill-overlap scoring (`matched/required * 100`, empty `required_skills` → neutral 50) with a templated one-sentence summary; returns `{ score: 0-100, summary }` |
| `/api/ai/jd-writer` | POST | employer | maxOutputTokens 800, takes `{ title, location, employmentType, skills, roughNotes }` |
| `/api/ai/re-engage` | POST | employer | deterministically excludes candidates who've already applied to any of the employer's open jobs (queried before prompting, not left to the model - see Gotchas) before asking the LLM to rank fits; text+regex-parsed JSON output; wrapped in try/catch, returns `{ suggestions: [] }` on any generation failure; returns up to 5 `ReEngageSuggestion[]` |
| `/api/certificates/coursera` | POST | — | server-side fetch + OG tag parse, SSRF-guarded |
| `/api/certificates/skills-suggest` | POST | — | keyword pre-filter first: regex-matches the cert `title`+`institution` against all 37 canonical `skills.name` values (lookaround boundaries, not `\b`, so `Node.js`/`CI/CD` match correctly and `Go` doesn't false-match inside `Google`); only calls Groq as a fallback when the keyword pass finds zero matches; up to 6 skills either way |
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
- Server page fetches `candidate_profiles`, passes to `ProfileEditForm` (client) along with `userId={user.id}` (needed for the resume upload's storage path). Does `UPDATE` on `candidate_profiles`.
- Renders `<ResumeUpload>` (see Auth & Onboarding above) so candidates can attach/replace/remove their resume post-onboarding, same component and bucket as the wizard.
- `ProfileEditForm` also owns the `is_public` visibility checkbox (plain `accent-brand` checkbox, not a new Switch component) — included directly in the same `UPDATE` payload as the other basic fields.
- Below the basic-info form, four sibling client components close the gap where education/work-experience/skills/portfolio-projects were previously editable only once, during onboarding: `EducationEditor.tsx` (qualifications where `type = 'education'` — certificates stay owned by `/certificates`), `WorkExperienceEditor.tsx`, `SkillsEditor.tsx`, `PortfolioItemsEditor.tsx`. Each mirrors `CertificatesClient`'s pattern: local optimistic `useState` seeded from a server-fetched prop, insert → prepend to local state, delete → filter from local state, no `router.refresh()` needed for the list itself. Add-only + delete — no in-place edit of an existing row (same convention as `/certificates`), except `SkillsEditor` also supports changing an existing skill's `level` inline via a per-pill `<select>` (`UPDATE candidate_skills` by row id, optimistic with revert-on-error).
- `SkillsEditor`'s "add a skill" control reuses `CertificatesClient.handleAddSkills`'s upsert-skill-then-upsert-candidate_skills pattern, but takes a free-text name (not a suggested list) — see the `skills` table grant gotcha in `.claude/CLAUDE.md` before touching this table again.
- `page.tsx` parallel-fetches all four datasets alongside `candidate_profiles` (mirrors the `Promise.all` pattern in `app/(candidate)/portfolio/page.tsx`), including `candidate_skills` joined to `skills(name, category)`.

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
- `CoachChat.tsx` uses `useChat` (`@ai-sdk/react`) with `DefaultChatTransport({ api: "/api/ai/coach" })` — not a hand-rolled `fetch`/`getReader()` loop. `message.parts` gives text parts (rendered via `react-markdown`) and tool parts (`isToolUIPart`/`getToolName` from `ai`) for free.
- `navigateTo` tool results are picked up by an effect that watches `messages` for a `navigateTo` part in `state === "output-available"`, dedupes by `toolCallId` (a `useRef<Set>`, since messages re-render on every stream chunk), then calls `router.push(path)` + `router.refresh()`. Coach stays page-scoped at `/coach` — navigating away unmounts it and drops the conversation, same as leaving any other page.

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

### Hiring Assistant (`/employer/coach`)
- `EmployerCoach.tsx` — structurally identical to `CoachChat.tsx` (same `useChat` + `navigateTo` effect pattern), pointed at `/api/ai/employer-coach`. Every tool it exposes mirrors an action that already existed as a manual click (post a job, move a pipeline stage, save to talent pool, edit company profile) — no new features were invented to build this, only a conversational/agentic path to existing ones.
- Unlike the candidate coach's tools (which mostly trust RLS + a unique-constraint catch), the mutating tools here add an explicit deterministic pre-check first: `createJob` validates required fields before insert, `updateApplicationStatus` fetches the application's `jobs.employer_id` and rejects if it doesn't match the caller before updating, `saveCandidateToPool` pre-queries for an existing row before inserting. This is a new server-side mutation path (existing employer mutations were all client-side Supabase calls with no server abstraction), so it gets its own ownership check rather than relying on RLS alone.

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

### Profile dropdown
`components/ProfileDropdown.tsx` replaces the old static name/email block, and is placed differently per breakpoint rather than shared verbatim - both `CandidateSidebar`/`EmployerSidebar` now split their old single `navContent` into `navLinks` (just the nav list, still shared) plus separate footers:
- **Desktop** `<aside>` footer: full trigger (avatar + name/email), `side="top"` since it sits at the bottom of the sidebar - already one tap, no drawer.
- **Mobile top bar**: `compact` trigger (avatar only) next to the hamburger button, `side="bottom" align="end"` - gives one-tap access without opening the drawer first.
- **Mobile drawer footer**: no longer renders `ProfileDropdown` (would duplicate the top bar one) - just `ThemeToggle`, right-aligned.

Role-agnostic via `name`/`email`/`profileHref`/`settingsHref` props, owns sign-out itself (`handleSignOut` no longer lives in either sidebar). Built on `components/ui/dropdown-menu.tsx` (base-ui `Menu`, not Radix) - use the `render={<Link .../>}` prop for link items, not `asChild`.

Settings currently routes to a placeholder page only (`app/(candidate)/settings`, `app/(employer)/employer/settings`) - "More settings coming soon." Real settings content (account/password, notification prefs, etc.) is intentionally undecided; extend these pages when that's scoped rather than adding a new route.
