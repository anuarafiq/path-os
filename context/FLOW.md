# App Flow

Screen-by-screen detail behind [`OVERVIEW.md`](./OVERVIEW.md)'s Core User Flow. Each screen cross-references its matching subsection in [`.claude/ARCHITECTURE.md`](../.claude/ARCHITECTURE.md) for implementation detail - this file covers user-facing behavior, not code.

## Screens

### Signup / Login (`/signup`, `/login`)
- **Purpose**: create an account or sign in, as either a candidate or an employer.
- **Entry points**: landing page nav/CTAs, demo login buttons on the landing page.
- **Actions**: submit → on signup, redirects candidates to `/onboarding` and employers to `/employer/dashboard`.
- **Success state**: signed-in session, redirected per role.
- **Error state**: Supabase auth error surfaced inline. Known gap: post-signup `profiles` row insert is a sync server action, not a DB trigger - a dropped connection can strand a user without a profile row (tracked in `context/TRACKER.md`).

### Onboarding (`/onboarding`, candidate)
- **Purpose**: build out a full candidate profile before reaching the dashboard.
- **Entry points**: signup redirect (candidate role).
- **Actions**: paste or upload a CV → AI auto-fill parses it into the wizard's fields (skills matched against the canonical skill list, pre-selected "mid" level); "Skip, fill manually" bypasses; resume file itself can also be uploaded separately (stored, not parsed) via `ResumeUpload`. Wizard steps collect education, work experience, skills, portfolio links. Finish writes everything to `candidate_profiles` and related tables.
- **Success state**: redirected to `/dashboard` with a populated profile.
- **Error state**: parse failures leave the wizard in manual-entry state; input over 20,000 characters is rejected before the API call.

### Candidate Dashboard (`/dashboard`)
- **Purpose**: home base after login - quick actions into every major feature.
- **Entry points**: post-login/onboarding redirect, sidebar "Dashboard" link.
- **Actions**: quick-action cards → Explore, Jobs, Coach (opens the coach side panel, not a page navigation), Certificates, etc.
- **Success state**: cards render with the candidate's current stats.

### Career Explorer (`/explore`)
- **Purpose**: visualize the career graph, see salary bands, and get a personalized route + skill-gap roadmap toward a target role.
- **Entry points**: sidebar "Explore Paths", dashboard quick action.
- **Actions**: pick a target role → shortest-path route highlights (Dijkstra by transition time), off-route nodes/edges dim; "Generate Learning Roadmap" (hidden once all gaps are covered) calls the AI skill-gap endpoint; drag nodes to reposition (persisted to `localStorage`); "Reset layout" clears saved positions.
- **Success state**: route animates in hop-by-hop; roadmap panel shows summary + steps.
- **Error state**: roadmap generation failure shows an inline error, doesn't block the graph itself.

### Job Board (`/jobs`)
- **Purpose**: browse and filter open jobs, apply.
- **Entry points**: sidebar "Jobs", dashboard quick action.
- **Actions**: filter by keyword/location/employment type/salary/skills → list updates client-side; "Apply" → generates an AI cover note (editable) → "Submit" or "Skip note" inserts into `applications`; each card shows an AI fit score.
- **Success state**: applied jobs show as applied on return visits (`initialApplied` pre-hydrated); fit score pill color-coded by match strength.
- **Error state**: cover-note generation failure falls through to an empty editable textarea, doesn't block applying; fit score hides itself on error rather than showing a stale/wrong value.

### Applications (`/applications`)
- **Purpose**: track submitted applications and their pipeline stage.
- **Entry points**: sidebar "My Applications" (after Jobs).
- **Actions**: read-only list, ordered most recent first.
- **Success state**: status badge reflects current pipeline stage (applied/reviewed/shortlisted/offered/rejected).

### ATS Checker (`/ats-checker`)
- **Purpose**: score a resume against a job description, list matched/missing keywords and format issues.
- **Entry points**: profile dropdown ("Portfolio/Certificates/Applications" group), not top-level nav.
- **Actions**: choose resume source (uploaded PDF vs. pasted text) and job source (pick an open listing vs. paste external JD) → submit.
- **Success state**: score, matched/missing keywords, format issues (PDF path only), summary.
- **Error state**: parse/generation failures return a structured error, not a silent blank result.

### Certificates (`/certificates`)
- **Purpose**: self-service Coursera credential intake with AI skill suggestions.
- **Entry points**: sidebar "Certificates".
- **Actions**: paste Coursera URL → auto-extract details → save → AI suggests skills tied to it → shows which career roles those skills move the candidate toward.
- **Success state**: cert appears on the private portfolio with a Coursera badge, Verify link, and "Recent" badge if earned within 90 days.

### Profile Edit (`/profile/edit`)
- **Purpose**: edit everything set during onboarding, post-onboarding.
- **Entry points**: sidebar "Profile" (between Portfolio and Certificates).
- **Actions**: edit basic info (including the `is_public` visibility checkbox), attach/replace/remove resume, add/delete education, work experience, skills (with inline level change), portfolio items.
- **Success state**: each section updates independently (optimistic local state, no full-page refresh needed).

### Public Portfolio (`/p/[candidateId]`)
- **Purpose**: no-auth, shareable portfolio page.
- **Entry points**: "Share" button on the private `/portfolio` page (copies the link); links from employer Search/Re-engage/Pipeline (`PortfolioLink`).
- **Actions**: read-only. Renders header/bio/Education/Certificates/Work/Skills/Projects.
- **Success state**: page renders if `is_public = true`.
- **Error state**: `notFound()` if the candidate is private or the id doesn't exist - never leaks the existence of a private profile.

### Employer Setup (`/employer/setup`)
- **Purpose**: create the employer's company profile, required before anything else on the employer side.
- **Entry points**: signup redirect (employer role), dashboard link if no profile exists yet.
- **Actions**: single-step form → insert into `employer_profiles`.
- **Success state**: redirected to `/employer/dashboard`.
- **Error state**: duplicate-profile unique violation redirects to dashboard instead of erroring.

### Employer Dashboard (`/employer/dashboard`)
- **Purpose**: home base after login - quick actions into every major employer feature.
- **Entry points**: post-login/setup redirect, sidebar "Dashboard" link.
- **Actions**: quick-action cards → Jobs, Search (highlighted "Find talent" tile), Pipeline, Re-engage, Hiring Assistant (coach panel).

### Job Posting (`/employer/jobs`, `/employer/jobs/new`)
- **Purpose**: create and manage open positions.
- **Entry points**: sidebar "Jobs".
- **Actions**: fill job form → "Polish with AI" rewrites the description → submit inserts into `jobs`.
- **Success state**: job appears in the employer's list and, if `status = 'open'`, in the public job board.

### Talent Search (`/employer/search`)
- **Purpose**: scout candidates, save to a talent pool.
- **Entry points**: sidebar "Find talent" (highlighted tile on dashboard).
- **Actions**: search/filter candidates → "Save to pool" → insert into `talent_pools` with `source: 'scouted'`; view a candidate's public portfolio.
- **Success state**: button shows "Saved ✓"; duplicate save is a no-op, not an error.

### Pipeline (`/employer/pipeline`)
- **Purpose**: move applicants through recruiting stages.
- **Entry points**: sidebar "Pipeline".
- **Actions**: drag a card between stage columns, or use ←/→ chevrons; ✕ rejects (moves to a collapsible rejected tray with "Restore →").
- **Success state**: stage updates optimistically, animates via view transition.
- **Error state**: failed update reverts the card and shows "Update failed." A candidate with `is_public = false` shows as "Private profile" rather than looking broken - the row is real, just hidden.

### Re-engage (`/employer/re-engage`)
- **Purpose**: AI-ranked outreach suggestions against saved talent.
- **Entry points**: sidebar "Re-engage", dashboard quick action.
- **Actions**: generates up to 5 fit suggestions with outreach drafts, excluding candidates already in an active pipeline (checked deterministically before prompting, not left to the model).
- **Success state**: suggestion list with fit note + draft message per candidate.
- **Error state**: empty pool or job list returns `{ suggestions: [] }`, not an error page.

### Coach (candidate) / Hiring Assistant (employer) - side panel, not a page
- **Purpose**: agentic, multi-step tool-calling assistant that can search, edit the profile/job data, and navigate the app on the user's behalf.
- **Entry points**: sidebar "AI Coach" / "Hiring Assistant", dashboard highlighted tile, any component using `useCoachPanel()`. `/coach` and `/employer/coach` as URLs just redirect to the dashboard - the real UI lives in the shell's side panel, not a route.
- **Actions**: free-text chat; tool calls (search jobs, edit skills/profile, apply, check application status, post a job, move a pipeline stage, save to pool, navigate) run mid-conversation and show inline traces (e.g. a nav chip for `navigateTo`).
- **Success state**: streamed response with tool results reflected in the UI immediately (e.g. a completed apply shows up without a page refresh).
- **Error state**: rate-limited at 30 messages/hour per user (429 + `Retry-After`); generation failures degrade gracefully rather than 500ing the route.

## User Journeys

### First-time candidate: signup to first application
1. Landing page → Sign up (candidate) → Onboarding (resume upload, AI auto-fill) → Dashboard
2. Dashboard → Jobs → filter → Apply (AI cover note) → Submit
3. Applications → see the new application with `applied` status

### First-time employer: signup to first pipeline move
1. Landing page → Sign up (employer) → Employer Setup (company profile) → Employer Dashboard
2. Dashboard → Jobs → New Job → Polish with AI → Submit
3. Dashboard → Search → find a candidate → Save to pool
4. Pipeline → move an applicant from `applied` → `reviewed`

### Demo walkthrough (judge/reviewer path)
1. Landing page → one-click demo login (candidate or employer) → seeded account with realistic data
2. Candidate: Coach → "Find me jobs..." → "Apply to the first job you found for me." (chains a search + apply in one turn - the standard test of multi-step tool use)
3. Employer: Re-engage → AI-ranked suggestions against the seeded talent pool

## Open Questions

- Should coach conversations persist across sessions? Table (`coach_sessions`) exists, route doesn't touch it - see `context/TRACKER.md`.
- Should a candidate who opts out (`is_public = false`) still be visible to employers they've already applied to? Currently they become fully invisible, including in the pipeline they applied to (shown as "Private profile" but not by name).
