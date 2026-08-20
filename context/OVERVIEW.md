# Path OS

## Overview

A two-sided career platform that matches candidates to opportunities and helps employers build talent pipelines. Originally built as the Talentbank Hackathon 2026 entry, later rebranded to Path OS. Live at [path-os-five-omega.vercel.app](https://path-os-five-omega.vercel.app).

## Goals

1. Let a candidate go from CV upload to a filled-out, AI-enriched profile in minutes, not a manual form slog.
2. Give candidates a real career-planning tool, not just a job board - salary benchmarks, a career graph, and skill-gap-aware path recommendations.
3. Give employers a working pipeline (post → search → pipeline → re-engage) without needing a full ATS.
4. Demonstrate one genuinely agentic feature (multi-step tool-calling coach), distinct from the several single-call "AI-assisted" features in the app.

## Core User Flow

**Candidate:** sign up → onboarding (resume upload with AI auto-fill, or manual entry) → dashboard → explore career graph / browse jobs / talk to Coach → apply to jobs → track application pipeline stage.

**Employer:** sign up → company setup → post a job → search/scout candidates into a talent pool → manage applicants through a pipeline board → re-engage saved talent with AI-ranked fit suggestions.

## Features

### Candidate side
- Onboarding with AI-parsed resume auto-fill (paste or upload a CV, the AI Gateway model extracts structured fields)
- Profile editing (basic info, education, work experience, skills, portfolio items)
- Interactive career graph with salary benchmarking and skill-gap-aware path highlighting
- AI Coach - agentic, multi-step tool-calling chat (see Agentic Features below)
- Coursera certificate auto-parse + skill suggestions
- Job discovery with filtering (location, salary, skills, employment type)
- Applications with pipeline-stage tracking
- Shareable no-auth public portfolio page (`/p/[candidateId]`)

### Employer side
- Company profile setup and editing
- Job posting and management
- Talent search, save to talent pools
- Kanban-style pipeline management across recruiting stages
- AI-ranked re-engagement suggestions against saved talent, with a deterministic guardrail excluding candidates already in an active pipeline

### Shared AI features
- Job fit scoring (candidate skills vs. job requirements)
- CV / certificate auto-extraction to pre-fill profile data
- Personalized career path and learning-roadmap recommendations from skill gaps

## Scope

### In Scope
- Candidate and employer web app on Next.js, Supabase-backed
- Demo mode with one-click seeded candidate/employer accounts
- Single-region Vercel AI Gateway-hosted LLM features (fit scoring, extraction, re-engagement, the two agentic coaches)

### Out of Scope (for now)
- Coach conversation persistence across sessions (table exists, unused - see `context/TRACKER.md`)
- Payment/billing
- Multi-language support

## Success Criteria

1. A signed-up candidate can complete onboarding via resume upload and see an auto-filled profile.
2. A candidate can find and apply to a job, and see it reflected in Applications with the correct pipeline stage.
3. An employer can post a job, search/save a candidate, and move an applicant through pipeline stages on the kanban board.
4. The Coach can chain a search + an apply action in one conversation turn (the standard demo test of multi-step tool use).
5. `/p/[candidateId]` renders a candidate's public portfolio with no auth, respecting their `is_public` flag.
