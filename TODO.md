# Path OS - TODO

> Intent Form **15 Jun** · Stage 2 build **26 Jul**

## Blockers (nothing renders without these)

- [x] **Supabase project** - create project, run both migrations, add `.env.local` (URL + anon key). App pages can't render until this exists.
- [x] **Groq API key** - switched from Anthropic to Groq (`llama-3.3-70b-versatile`). Add `GROQ_API_KEY` to env.
- [x] **Demo / mock data mode** - seed a candidate + employer + jobs + applications so the full flow is demoable, ideally with one-click demo login. Needed for Intent Form UI review.

## Critical (core loop is broken without these)

- [x] **Employer setup page** `/employer/setup` - form to create `employer_profiles` row (company name, industry, size, website). Dashboard links here but page doesn't exist.
- [x] **Job posting UI** - form for employers to create jobs (title, location, salary range, skills, employment type). Insert into `jobs` table.
- [x] **Apply button** - candidate-side apply action on the jobs page. Insert into `applications` table. Guard against duplicate applications.

## Important (referenced but not wired up)

- [x] **Re-engage API route** `/api/ai/re-engage` - AI scans `talent_pools` against open `jobs`, returns fit suggestions + outreach drafts. Replace the `setTimeout` stub in `re-engage/page.tsx`. [Page exists but stub only]
- [x] **Pipeline stage updates** - make the kanban interactive. Card action updates `application.status` via server action / API route. Supabase realtime optional. [Pipeline page reads-only]
- [x] **Talent pool add** - "Save to pool" button on employer search results. Insert into `talent_pools` with `source: 'scouted'`. [Search page exists but no button]
- [x] **Candidate application tracking** - candidates have no view of jobs they applied to or what stage they're at. Add a "My applications" view.

## AI features (high-impact demo, infra already exists)

- [x] **Resume upload → auto-fill profile** - upload/paste a CV, Claude extracts structured data into the onboarding fields (name, quals, work, skills). Biggest onboarding UX win. Uses `document_url` storage column that already exists.
- [x] **Skill-gap analysis** - given `current_role` + target node, surface the `skill_gaps` already stored on `career_edges` as "here's your gap to Senior SWE" + an AI learning roadmap.
- [x] **Job fit score (candidate side)** - reuse `/api/ai/match` logic in reverse so each job on the board shows a fit % and "why you fit" for the logged-in candidate.
- [x] **AI application note** - generate a tailored cover note at apply-time from candidate profile + job description.
- [x] **AI job description writer (employer)** - employer pastes rough notes, Claude returns a polished JD for the posting form.
- [x] **Personalized path highlighting** - in the career graph, highlight the recommended route from `current_role` to `seeking` with cumulative salary delta + time-to-reach.

## Platform essentials

- [x] **Job board search + filters** - filter by location, salary band, skills, employment type. Currently shows an unfiltered list.
- [ ] **Saved jobs / bookmarks** - let candidates bookmark jobs to revisit.
- [ ] **Employer pipeline analytics** - conversion funnel across stages, time-in-stage. Trading-terminal aesthetic fits the brand.
- [ ] **File upload for qualifications** - `document_url` column exists but no upload flow (Supabase Storage).
- [x] **Run migration 004** - `supabase/migrations/004_credential_url.sql` adds `credential_url` to `qualifications`.

## Polish + completeness

- [x] **Certificates page** - `/certificates` self-service UI: paste Coursera URL → auto-extract details → save → AI skill suggestions → career path tie-in. Portfolio splits Education and Certificates sections with Coursera badge and Recent indicator.
- [x] **Profile editing (basic info)** - `app/(candidate)/profile/edit/` — edit name, location, bio, GitHub/LinkedIn, seeking type, job title, years exp. "Profile" nav item added to `CandidateSidebar`. Employer equivalent at `app/(employer)/employer/profile/` — edit company name, industry, size, website. "Company Profile" nav item added to `EmployerSidebar`. Both do `UPDATE`, not insert. Skills/qualifications/work experience editing still pending below.
- [ ] **Profile editing (skills, quals, work exp)** - edit/delete flows for `candidate_skills`, `qualifications`, `work_experiences` post-onboarding. Still read-only in portfolio view.
- [ ] **Portfolio item CRUD** - add/edit/delete `portfolio_items`. Page renders them but nothing populates them. [Portfolio items seeded in demo but no create/edit UI]
- [ ] **Coach session persistence** - read/write `coach_sessions` so conversations survive reloads. Table exists, route never touches it. [Coach component stores messages in-memory only, no DB persistence]
- [ ] **Profile completeness nudge** - if candidate profile is sparse (no skills, no bio), coach should prompt the user to fill their profile instead of giving hollow generic advice.
- [ ] **Contextual follow-up suggestions** - after each coach response, render 2-3 smart follow-up chips based on the current topic. High demo value.
- [ ] **Rate limiting on coach endpoint** - no guard against abuse. Each request hits Groq API. Add simple per-user request cap (e.g. 30 messages/hour via Supabase or upstash/ratelimit).
- [ ] **Conversation export** - let users copy or download the chat as plain text for reference.
- [x] **Public portfolio page** - shareable no-auth URL (e.g. `/p/[candidateId]`). Landing copy promises this.
- [ ] **Auth profile creation fix** - move the post-signup `profiles` insert into a Supabase DB trigger / server action so a dropped connection doesn't strand the user.
- [x] **Landing page demo flow** - tighten the path a judge walks through for submission.
