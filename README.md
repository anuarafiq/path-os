# Path OS

A two-sided career platform that matches candidates to opportunities and helps employers build talent pipelines.

**Live:** [path-os-five-omega.vercel.app](https://path-os-five-omega.vercel.app)

## Features

### Candidate side
- **Onboarding** - structured intake of education, work history, skills, and portfolio links; resume upload with AI-parsed auto-fill (paste or upload a CV, Groq extracts structured fields)
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

The Coach (candidate side) and its employer counterpart are the genuinely agentic parts of the app. Each runs a real tool-calling loop (Vercel AI SDK `streamText`, `stopWhen: stepCountIs(5)`) against Groq `llama-3.3-70b-versatile` - the model decides which tools to call, in what order, and reasons over the result before replying. Everything else labeled "AI" in this app (fit scoring, extraction, re-engagement) is a single prompted LLM call, not a loop.

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
- **Groq tool-calling is unreliable for anything conditional or structured.** A forced "submit" tool for final structured output previously caused `400 tool_use_failed`; a tool the model was *instructed* to call before every item was silently skipped for at least one item in live testing. Correctness-critical logic (e.g. re-engagement's "don't suggest jobs already applied to") is done deterministically in code, never left to the model deciding to call a check tool.
- **12,000 tokens/min Groq rate limit** on this plan - repeated testing in a short window can trip `429 rate_limit_exceeded`.
- **No conversation persistence** - the Coach has no memory across sessions; each chat starts fresh.
- **No abuse guard** - no per-user request cap on the Coach endpoint yet (tracked in [Known Issues](#known-issues--decisions)).
- **`stepCountIs(5)`** caps the tool loop at 5 steps per turn - a task needing more chained calls will stop short and hand back to the user instead of continuing silently.

## Stack

- **Frontend:** Next.js 16.2.7 (App Router, Turbopack), React 19, Tailwind CSS v4, shadcn/ui
- **Backend:** Next.js API routes, Supabase (PostgreSQL + Auth)
- **AI:** Groq API (`llama-3.3-70b-versatile`) via Vercel AI SDK
- **Visualization:** React Flow for career graph
- **Design:** Dark mode by default with a light mode toggle (`next-themes`), amber/gold accent, trading-terminal aesthetic

## Setup

### Prerequisites
1. **Supabase project** - create a project at [supabase.com](https://supabase.com)
2. **Groq API key** - get one at [console.groq.com](https://console.groq.com)
3. **Node.js 20.9+** and npm

### Installation

1. Clone and install:
```bash
git clone <repo>
cd path-os
npm install
```

2. Set up environment variables (`.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GROQ_API_KEY=your-groq-key
```

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

See [TODO.md](./TODO.md) for the full roadmap and feature blockers.

## Project Status

- **Blockers resolved:** Supabase, Groq integration, demo mode
- **Core loop complete:** job posting, apply flow, application tracking, pipeline, re-engagement, resume auto-fill, profile editing
- **Remaining:** saved jobs/bookmarks, coach session persistence, rate limiting on coach endpoint, employer pipeline analytics

For detailed feature status, see [TODO.md](./TODO.md).

## Design Standards

All frontend work follows these constraints:
- Dark mode by default (with light mode toggle) - amber/gold accent on deep navy-black
- Typography: Bricolage Grotesque (headings) + Geist Sans (body)
- No side-stripe card borders, no gradient text
- OKLCH color space for all custom colors
- Salary/metric numbers use tabular-nums for terminal aesthetic

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

This is a hackathon project with tight deadlines, originally built as the Talentbank Hackathon 2026 entry and later rebranded to Path OS. See [CLAUDE.md](./.claude/CLAUDE.md) for project-specific instructions and [TODO.md](./TODO.md) for the task list.
