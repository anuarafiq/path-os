# Path OS

A two-sided career platform that matches candidates to opportunities and helps employers build talent pipelines.

**Live:** [path-os-five-omega.vercel.app](https://path-os-five-omega.vercel.app)

## Features

### Candidate side
- **Onboarding** - structured intake of education, work history, skills, and portfolio links; resume upload with AI-parsed auto-fill (paste or upload a CV, the AI Gateway model extracts structured fields)
- **Profile editing** - dedicated editors for basic info, education, work experience, skills, and portfolio items post-onboarding
- **Career exploration** - interactive graph of roles and career paths with salary benchmarking
- **AI coach (agentic)** - not a canned Q&A bot. Runs a real tool-calling loop, see [Agentic Features](#agentic-features) below.
- **Certificates** - auto-parse and store Coursera credentials; skill suggestions tied to career progression
- **Job discovery** - browse open positions (demo mode includes filtering by salary, location, skills)
- **Applications** - apply to jobs and track pipeline stage

### Employer side
- **Setup** - single-step company profile creation
- **Company profile** - edit company name, industry, size, website post-setup
- **Job posting** - create and manage open positions
- **Talent search** - scout candidate profiles and save to talent pools
- **Pipeline** - manage applications through recruiting stages
- **Re-engagement** - AI-ranked fit suggestions against saved talent, with a deterministic guardrail (candidates already in an active pipeline are excluded before the LLM ever sees them, not left to a model self-check) so outreach never targets someone who's already applied

### Shared AI features
- **Job fit scoring** - matches candidate skills to job requirements via LLM
- **Auto-extraction** - parses CVs and certificates to pre-fill profile data
- **Personalized recommendations** - suggests career paths and learning roadmaps based on skill gaps

> **Agentic vs. AI-assisted:** the Coach is the one genuinely agentic feature in the app - it chooses which tools to call and when, across multiple steps, based on the conversation. Everything else above (fit scoring, extraction, re-engagement, recommendations) is a single well-prompted LLM call, which is a real distinction if judges probe "how is this agentic."

## Agentic Features

The Coach (candidate side) and its employer counterpart are the genuinely agentic parts of the app. Each runs a real tool-calling loop (Vercel AI SDK `streamText`, `stopWhen: stepCountIs(5)`) against a model routed through the Vercel AI Gateway (`openai/gpt-5.6-luna`, previously Groq `llama-3.3-70b-versatile`) - the model decides which tools to call, in what order, and reasons over the result before replying. Everything else labeled "AI" in this app (fit scoring, extraction, re-engagement) is a single prompted LLM call, not a loop.

### Candidate Coach tools
Route: `app/api/ai/coach/route.ts`. Chat UI: `components/CoachChat.tsx`.

| Tool | What it does |
|---|---|
| `findMatchingJobs` | Search open jobs by skill/location |
| `getSalaryBenchmarks` | Pull live salary bands (MYR) for a role |
| `addSkillToProfile` / `removeSkillFromProfile` | Edit the candidate's skill list |
| `updateProfile` | Update bio, location, seeking status, job title, etc. |
| `getCareerPathOptions` | Shortest-path + skill-gap traversal of the career graph, optionally toward a stated target role |
| `getApplicationStatus` | Check real application/pipeline status |
| `applyToJob` | Submit an application on the candidate's behalf |
| `navigateTo` | Route the candidate to a page in the app |

### Employer Coach tools
Route: `app/api/ai/employer-coach/route.ts`. Chat UI: `components/EmployerCoach.tsx`. Similar pattern - writes/posts job descriptions, searches candidates, navigates the employer around the app.

### How to try it
Log in as the demo candidate (see [Demo Mode](#demo-mode)), open **Coach**, and ask things like:
- "Find me jobs in Kuala Lumpur that use React." (`findMatchingJobs`)
- "What's the salary range for a Product Manager in Malaysia?" (`getSalaryBenchmarks`)
- "Add TypeScript to my profile as a senior skill." (`addSkillToProfile`)
- "What roles can I move into from my current job?" (`getCareerPathOptions`)
- "Apply to the first job you found for me." - chains a search + an apply in one turn, the best test of multi-step tool use
- "Take me to my applications page." (`navigateTo`)

### Limitations
- **Correctness-critical logic is always deterministic, never delegated to a check tool.** Originally forced by Groq's unreliable tool-calling (a forced "submit" tool for final structured output caused `400 tool_use_failed`; a tool the model was *instructed* to call before every item was silently skipped for at least one item in live testing). The current Vercel AI Gateway model (`openai/gpt-5.6-luna`) doesn't reproduce those failures, but the safeguard (e.g. re-engagement's "don't suggest jobs already applied to") stays as defense in depth.
- **Rate limits:** hit Groq's 12,000 tokens/min cap during testing under the previous provider; current Vercel AI Gateway limits not yet stress-tested.
- **No conversation persistence** - the Coach has no memory across sessions; each chat starts fresh.
- **No abuse guard** - no per-user request cap on the Coach endpoint yet (tracked in [Known Issues](#known-issues--decisions)).
- **`stepCountIs(5)`** caps the tool loop at 5 steps per turn - a task needing more chained calls will stop short and hand back to the user instead of continuing silently.

## Stack

- **Frontend:** Next.js 16.2.7 (App Router, Turbopack), React 19, Tailwind CSS v4, shadcn/ui
- **Backend:** Next.js API routes, Supabase (PostgreSQL + Auth)
- **AI:** Vercel AI Gateway (`openai/gpt-5.6-luna`) via Vercel AI SDK (`ai@6`); Google Gemini for PDF resume parsing
- **Visualization:** React Flow for career graph
- **Design:** Light mode by default with a full dark mode toggle (`next-themes`), cyan brand accent

## Setup

### Prerequisites
1. **Supabase project** - create a project at [supabase.com](https://supabase.com)
2. **Vercel account linked to this project** - AI features route through the Vercel AI Gateway, authenticated via an OIDC token, not a per-provider API key
3. **Node.js 20.9+** and npm

### Installation

1. Clone and install:
```bash
git clone <repo>
cd path-os
npm install
```

2. Set up environment variables:
```bash
vercel link
vercel env pull .env.local
```
Pulls `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `VERCEL_OIDC_TOKEN` (the AI Gateway auth token, expires ~24h - re-run `vercel env pull` when it does) into `.env.local`.

3. Run Supabase migrations:
```bash
# In Supabase dashboard, run all migrations in supabase/migrations/
# Or via CLI: supabase db push
```

4. Start the dev server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Demo Mode

One-click demo login buttons on the landing page seed a full demo account:
- **Candidate:** "Ahmad Chicken" (UTM CS, Grab intern, 5 skills, 2 portfolio projects)
- **Employer:** "TechCorp Malaysia" (3 open jobs, sample applications)

Access via the landing page or direct API call:
```bash
curl -X POST http://localhost:3000/api/demo
```

## Architecture

```
app/
├── (auth)/              # Signup, login, logout flows
├── (candidate)/         # Candidate routes
│   ├── onboarding       # Profile setup wizard
│   ├── dashboard        # Home page after login
│   ├── portfolio        # View profile + qualifications
│   ├── profile/edit     # Edit basic info, education, work exp, skills, portfolio
│   ├── certificates     # Coursera credential mgmt
│   ├── coach            # AI coaching chat
│   ├── explore          # Career graph visualization
│   ├── jobs             # Job board
│   ├── applications     # Track submitted applications + pipeline stage
│   └── pay              # Salary information
├── (employer)/employer/ # Employer routes
│   ├── setup            # Company profile creation
│   ├── profile          # Edit company details
│   ├── dashboard        # Home page after login
│   ├── jobs             # Post + manage open positions
│   ├── search           # Talent search
│   ├── pipeline         # Kanban-style application tracking
│   └── re-engage        # AI-ranked outreach suggestions
├── p/[candidateId]/     # Public, no-auth portfolio page
└── api/
    ├── ai/              # AI endpoints (coach, matching, extraction)
    ├── resumes/         # Resume upload + AI parsing
    ├── certificates/    # Coursera parsing + skill suggestions
    ├── demo             # Demo account seeding
    └── ...
```

## Known Issues & Decisions

- **Next.js 16 breaking changes:** `middleware.ts` renamed to `proxy.ts`; Supabase generics removed due to bundler issue
- **RLS setup:** Supabase service_role requires explicit `GRANT` statements (see `supabase/migrations/003_service_role_grants.sql`)
- **Auth flow:** Post-signup profile creation should migrate to a DB trigger (currently sync server action)
- **Coach rate limiting:** No abuse guard; add per-user request cap before production

See [TODO.md](./TODO.md) for the full roadmap and feature blockers, or [`context/TRACKER.md`](./context/TRACKER.md) for the same backlog in status-tracker form.

## Project Status

- **Blockers resolved:** Supabase, AI Gateway integration, demo mode
- **Core loop complete:** job posting, apply flow, application tracking, pipeline, re-engagement, resume auto-fill, profile editing
- **Remaining:** saved jobs/bookmarks, coach session persistence, rate limiting on coach endpoint, employer pipeline analytics

For detailed feature status, see [TODO.md](./TODO.md).

## Design Standards

All frontend work follows these constraints:
- Light mode by default (with a full dark mode toggle) - cyan brand accent, purple/pink/amber/mint secondary family
- Typography: Bricolage Grotesque (headings) + Geist Sans (body)
- No side-stripe card borders, no gradient text
- OKLCH color space for all custom colors
- Salary/metric numbers use tabular-nums

See `.impeccable.md` for the full design system.

## Development

```bash
npm run dev        # Start dev server
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run linter
npm test           # Run unit/API tests (Vitest)
npm run test:e2e   # Run end-to-end tests (Playwright)
npm run seed:demo  # Seed demo candidate + employer data locally
```

## Contributing

This is a hackathon project with tight deadlines, originally built as the Talentbank Hackathon 2026 entry and later rebranded to Path OS. See [`context/`](./context/) for product/architecture/schema/flow docs, [`.claude/CLAUDE.md`](./.claude/CLAUDE.md) for stack/design-token/gotcha reference, [`.claude/ARCHITECTURE.md`](./.claude/ARCHITECTURE.md) for feature-by-feature implementation detail, and [TODO.md](./TODO.md) for the task list.
