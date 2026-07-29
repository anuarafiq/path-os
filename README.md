# Path OS

A two-sided career platform that matches candidates to opportunities and helps employers build talent pipelines.

## Features

### Candidate side
- **Onboarding** - structured intake of education, work history, skills, and portfolio links; resume upload with AI-parsed auto-fill (paste or upload a CV, Groq extracts structured fields)
- **Profile editing** - dedicated editors for basic info, education, work experience, skills, and portfolio items post-onboarding
- **Career exploration** - interactive graph of roles and career paths with salary benchmarking
- **AI coach (agentic)** - not a canned Q&A bot. Runs a real tool-calling loop (Vercel AI SDK, `stopWhen: stepCountIs(5)`) with 8 tools it decides when to invoke: search open jobs, pull live salary benchmarks, add/remove a skill on the candidate's profile, update profile fields, apply to a job directly, traverse the career graph toward a stated target role (shortest-path + skill gaps), and check real application status. It reasons over the candidate's actual data, not a static prompt.
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
