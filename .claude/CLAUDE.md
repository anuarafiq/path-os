# Path OS — Project Instructions

## Stack
Next.js 16.2.7 (App Router, Turbopack) + Supabase + Groq API (llama-3.3-70b-versatile via @ai-sdk/groq) + Tailwind CSS v4 + shadcn/ui + React Flow

Deadlines: Intent Form **15 June 2026** · Stage 2 build **26 July 2026**

See [ARCHITECTURE.md](ARCHITECTURE.md) for feature implementation notes.

## Documentation Rule
After completing any feature, update `.claude/ARCHITECTURE.md` under the relevant domain section before marking the task done. Add to `CLAUDE.md` only if there is a genuine gotcha - a non-obvious trap, broken convention, or decision that would surprise a fresh instance.

---

## Design

Dark mode by default, with a light mode toggle (`next-themes`, see Gotchas). Amber/gold accent on deep navy-black in dark mode. Salary/metric numbers feel like a trading terminal.

Typography: **Bricolage Grotesque** (headings) + **Geist Sans** (body). Tabular-nums for all salary/numeric data.

**Hard bans:** no side-stripe card borders, no gradient text.

### Color Tokens
```css
--bg-base:        oklch(0.13 0.012 258);
--bg-surface:     oklch(0.17 0.012 258);
--bg-elevated:    oklch(0.21 0.013 258);
--border-subtle:  oklch(0.26 0.014 258);
--border-strong:  oklch(0.35 0.016 258);
--text-primary:   oklch(0.94 0.006 258);
--text-secondary: oklch(0.62 0.012 258);
--text-muted:     oklch(0.44 0.010 258);
--accent:         oklch(0.82 0.14 72);
--accent-dim:     oklch(0.68 0.11 72);
--accent-subtle:  oklch(0.82 0.14 72 / 0.12);
--success:        oklch(0.76 0.14 148);
--danger:         oklch(0.66 0.18 22);
```

### Typography Scale
Scale: display (clamp 2.5–4rem), h1 (2rem), h2 (1.5rem), h3 (1.125rem), base (1rem), sm (0.875rem), xs (0.75rem).
Line heights: tight 1.2 (headings), body 1.6 (dark bg add 0.05), ui 1.4.

---

## Gotchas

- **`middleware.ts` renamed to `proxy.ts`** — Next.js 16 breaking change
- **Groq/Llama 3.3 70B tool-calling is unreliable for anything conditional or structured** — two failure modes hit while building `/api/ai/re-engage`: (1) forcing the final answer through a "submit" tool (nested array of 5 objects) instead of parsed JSON text caused Groq's function-calling layer to choke parsing its own generated arguments (`400 tool_use_failed`, `"Failed to call a function"`) even though the JSON was valid; (2) a `checkApplicationHistory` tool the model was *instructed* to call before including each candidate was skipped for at least one candidate in live testing (candidate got suggested for a job they'd already applied to) - `tool_choice: 'auto'` plus a prompt instruction is not a reliable guarantee on this model. Fix for both: don't route correctness-critical logic through model-decided tool calls - do the check deterministically in code before prompting (see `re-engage`'s `alreadyEngagedIds` pre-filter), and keep final structured output as prompt-instructed JSON text + regex-parse fallback rather than a forced tool call.
- **Groq TPM rate limit is 12000 tokens/min on this plan** — routes that dump large context (e.g. `re-engage`'s full job list + talent pool as text) can bump into `429 rate_limit_exceeded` under repeated testing in a short window. Always wrap `generateText`/`streamText` calls that aren't user-facing streams in try/catch and degrade to an empty/safe result rather than letting the route 500.
- **Color token trap:** `--accent` in Tailwind/globals.css resolves to shadcn's dark muted surface, not the amber. Use `--brand` / `--brand-dim` / `--brand-subtle` for amber/gold.
- **Supabase generics removed** from client wrappers — use plain `createBrowserClient()`, cast with `as unknown as` where needed (TS bundler moduleResolution issue)
- **RLS trap:** if post-signup redirect to onboarding breaks, check `profiles` table has `SELECT` policy allowing `auth.uid() = id`
- **service_role grants:** Supabase service_role does not get table grants automatically when RLS is enabled — must `GRANT ... TO service_role` explicitly (see `supabase/migrations/003_service_role_grants.sql`)
- **An RLS policy is not sufficient on its own — the role also needs the base table grant.** `skills` had only `for select using (true)` (migration 001) with no `INSERT`/`UPDATE` grant to `authenticated` at all. Adding `create policy "skills: authenticated insert" ... for insert to authenticated with check (true)` (migration 011) still 42501'd (`permission denied for table skills`) until a separate `grant insert, update on public.skills to authenticated` (migration 012) was added. RLS policies gate *which rows* a role can touch; the underlying `GRANT` gates *whether the role can touch the table at all* — Postgres checks both, and Supabase's dashboard/CLI migration flow doesn't infer one from the other. If a new RLS policy still gets a permission-denied error after applying, check the table's grants next, not just the policy.
- **`input[type="month"]` picker icon** styled via `::-webkit-calendar-picker-indicator` in `globals.css` — unscoped/light rule is a plain opacity fade (glyph already renders dark, correct on a light bg); `.dark`-scoped rule inverts + adds amber tint on hover (glyph needs to flip to read on a dark bg)
- **Light-mode brand/success/destructive tokens are darkened, not lightness-flipped, unlike every neutral token** — `--background`/`--foreground`/`--border`/etc. mirror dark mode via `L' = 1 - L` (same hue/chroma, flipped lightness) and that's fine for low-chroma neutrals. But hue 72 (the amber brand) and other saturated semantic hues carry disproportionately high WCAG relative luminance for their OKLCH lightness — a naive flip/trim of the dark-mode amber (`L 0.82`) to something like `L 0.70` for light mode measures **1.85:1 contrast** against the light background (needs 4.5:1 for text) and is nearly invisible. Verified fix: `--primary`/`--brand`/`--ring` go *dark* in light mode (`oklch(0.45 0.13 72)`, 5.13:1), the opposite direction from the neutral ramp. This also means `--primary-foreground` is *not* symmetric with dark mode — dark mode pairs a light amber button fill with dark text (`oklch(0.15 0.02 72)`); light mode pairs a dark amber fill with **pale** text (`oklch(0.97 0.02 72)`), or button text contrast collapses to ~2.6:1. `--success`/`--destructive` got the same treatment. If you add a new saturated color to the palette, measure its actual WCAG contrast in both themes (OKLCH lightness is not a reliable proxy) rather than assuming a mirror-flip works — see the "Design review pass" in the light-mode plan for the OKLCH→sRGB→relative-luminance conversion used.
- **`CareerPathExplorer`'s React Flow canvas/edge/MiniMap colors don't take CSS variables reliably** — `<Background color>`, `<MiniMap nodeColor>` (a JS callback returning a literal paint value), and `<MiniMap style>`/`<ReactFlow style>` all previously hardcoded raw `oklch(...)` strings that never touched a token and wouldn't respond to the theme class toggle. Fixed via a colocated `FLOW_COLORS.{dark,light}` constant map + a mount-guarded `useTheme()` read (`components/CareerPathExplorer.tsx`) rather than relying on `var(--token)` inside React Flow's props. If you add more hardcoded canvas colors here, extend `FLOW_COLORS` rather than reaching for `var(--brand)` directly in a React Flow color prop.
- **Demo requires migration 003** — `POST /api/demo` will fail without the service_role grants from that migration
- **Public portfolio reads via a definer RPC, not anon table grants** — `/p/[candidateId]` calls `get_public_portfolio(p_id)` (SECURITY DEFINER, migration 005), NOT direct table selects. Do **not** add `grant select ... to anon` on candidate tables to "fix" a portfolio read: the anon key ships in the browser bundle, so a table grant exposes Supabase's public PostgREST endpoint and lets anyone bulk-export all candidate PII. The RPC returns one portfolio by id, gated on `is_public`. If `/p/` 404s after schema changes, check the function exists and `grant execute ... to anon` is present.
- **CSP allows `'unsafe-inline'`** — `next.config.ts` CSP keeps `'unsafe-inline'` (and `'unsafe-eval'`) for script/style because the app uses inline `style={{}}` everywhere and Next injects inline bootstrap scripts. Tightening to nonces is deferred; ship as `Content-Security-Policy-Report-Only` first if you try.
- **React Flow custom nodes need `<Handle>` components** — without `<Handle type="target">` and `<Handle type="source">` in the custom node JSX, React Flow renders 0 edges silently. Handles can be invisible (`opacity: 0, pointerEvents: "none"`) but must be present.
- **React Flow `useEdgesState`** — always initialize with computed data, not `[]`. Initializing empty and filling via `useEffect` causes edges to miss the first render.
- **Mobile nav state lives in the sidebar component** — layouts are server components, so the hamburger open/close `useState` is in `CandidateSidebar` / `EmployerSidebar` directly. Do NOT add a client wrapper around the layout. Both sidebars render a desktop `<aside className="hidden md:flex">` and a mobile top bar + drawer from the same component. Layouts have a `<div className="h-12 md:hidden">` spacer at the top of `<main>` to compensate for the fixed mobile top bar.
- **Full-viewport components use `h-[100dvh]` not `h-screen`** — `CoachChat` and `CareerPathExplorer` use `h-[100dvh]` (dynamic viewport height). `100vh` doesn't adjust when the mobile browser toolbar hides or the keyboard opens; `100dvh` does.
- **Mobile responsive patterns** — page-level content wrappers use `px-4 md:px-8` (not bare `px-8`). Multi-column data grids use `grid-cols-1 sm:grid-cols-3` (not bare `grid-cols-3`). Paired form fields use `grid-cols-1 sm:grid-cols-2`. `CareerPathExplorer` detail panel uses a CSS-only responsive approach: `fixed` bottom sheet on mobile (`md:hidden` equivalent via `md:static`), side panel on desktop.
- **`next/og` `ImageResponse` (favicon/OG images) can't use `oklch()` or `var(--token)`** — Satori (the renderer behind `app/icon.tsx`/`app/apple-icon.tsx`) doesn't resolve CSS custom properties or reliably parse `oklch()`. Hardcode hex equivalents there instead; the real design tokens still work everywhere rendered by the browser (e.g. `components/Logo.tsx`).
- **`col-span-2` in responsive grids** — when a grid changes from `grid-cols-2` to `grid-cols-1 sm:grid-cols-2`, any `col-span-2` children must become `col-span-1 sm:col-span-2` or they break the single-column layout on mobile.
- **RLS policies that cross-reference two tables cause infinite recursion (Postgres 42P17)** — `jobs: employer manage` (001) subqueries `employer_profiles`; migration 007 added `employer_profiles: public read when hiring`, which subqueries `jobs`. Any select touching both tables (e.g. the Jobs page's `employer_profiles(company_name)` embed) now cycles `jobs → employer_profiles → jobs` forever and the query errors out silently, so `allJobs` falls back to `[]`. Fixed in migration 008 by moving the cross-table check into a `SECURITY DEFINER` function (same bypass-RLS pattern as `get_public_portfolio`, 005) so the policy no longer re-triggers the other table's RLS. Rule of thumb: a table-select RLS policy must never subquery a table whose own policy subqueries back into the first table - route it through a definer function instead.
- **Mutating a `ref` in a `useEffect` does not make a `useMemo` see the new value** — `CareerPathExplorer`'s node positions came from `savedPositionsRef.current[id] ?? defaultPos` inside a `useMemo`. The original code populated that ref from `localStorage` inside `useEffect(() => {...}, [])`, which runs *after* the first render/commit - too late for the memo that already ran during that render, and a plain ref mutation doesn't trigger a re-render or invalidate the memo's cache, so restored drag positions silently never applied on page load. Fix: read the ref's initial value synchronously during render (`useRef(readSavedPositions())`), not in an effect. Same trap bites any "reset to default" action - `setState(memoizedValue)` re-applies whatever the memo last cached, which can be stale relative to a ref you just cleared; recompute the target value from state/props directly instead of replaying the stale memo.
- **`eslint-config-next` 16.x bundles the React Compiler's `react-hooks/refs` and `react-hooks/set-state-in-effect` rules in `core-web-vitals`, even though `experimental.reactCompiler` is NOT enabled in `next.config.ts`** — these fire as pure lint (no runtime transform active yet), but they're worth honoring rather than suppressing since they catch exactly the ref-staleness class of bug above. `react-hooks/refs` bans `ref.current` reads inside a `useMemo`/`useCallback`-computed-during-render context (reading it inside the *body* of a `useCallback`-returned function is fine, since that only executes later as an event handler, not during render) - move the read into a `useLayoutEffect` (mount-time, before paint, no visible flash) or an event handler instead. `react-hooks/set-state-in-effect` flags `setState` calls inside a plain `useEffect` used to reset state when a prop/id changes (e.g. clearing roadmap state on `selectedNode?.id` change) - besides the lint, an effect-based reset fires *after* paint, so it visibly flashes the previous item's stale state for one frame; prefer React's "adjust state during render" pattern instead (track the previous key in `useState`, compare and reset inside an `if` in the render body - see `roadmapResetKey` in `CareerPathExplorer`).
