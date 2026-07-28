# Path OS — Project Instructions

## Stack
Next.js 16.2.7 (App Router, Turbopack) + Supabase + Groq API (llama-3.3-70b-versatile via @ai-sdk/groq) + Tailwind CSS v4 + shadcn/ui + React Flow

Deadlines: Intent Form **15 June 2026** · Stage 2 build **26 July 2026**

See [ARCHITECTURE.md](ARCHITECTURE.md) for feature implementation notes.

## Documentation Rule
After completing any feature, update `.claude/ARCHITECTURE.md` under the relevant domain section before marking the task done. Add to `CLAUDE.md` only if there is a genuine gotcha - a non-obvious trap, broken convention, or decision that would surprise a fresh instance.

---

## Design

Dark mode. Amber/gold accent on deep navy-black. Salary/metric numbers feel like a trading terminal.

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
- **Color token trap:** `--accent` in Tailwind/globals.css resolves to shadcn's dark muted surface, not the amber. Use `--brand` / `--brand-dim` / `--brand-subtle` for amber/gold.
- **Supabase generics removed** from client wrappers — use plain `createBrowserClient()`, cast with `as unknown as` where needed (TS bundler moduleResolution issue)
- **RLS trap:** if post-signup redirect to onboarding breaks, check `profiles` table has `SELECT` policy allowing `auth.uid() = id`
- **service_role grants:** Supabase service_role does not get table grants automatically when RLS is enabled — must `GRANT ... TO service_role` explicitly (see `supabase/migrations/003_service_role_grants.sql`)
- **`input[type="month"]` picker icon** styled via `::-webkit-calendar-picker-indicator` in `globals.css` — inverted + amber tint on hover
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
