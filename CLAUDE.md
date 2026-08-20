## Project Context

Read these files in order before implementing or making any architectural decision:

1. `context/OVERVIEW.md` — product definition, goals, features, scope
2. `context/ARCHITECTURE.md` — system structure, boundaries, storage model, invariants. Index-level; full feature-by-feature implementation detail is in `.claude/ARCHITECTURE.md`
3. `context/SCHEMA.md` — database tables, relationships, RLS policies, definer functions
4. `context/FLOW.md` — screen-by-screen flow, user journeys, actions, success/error states
5. `context/TRACKER.md` — current phase, completed work, open questions, next steps. Read last, reflects current state

`.claude/CLAUDE.md` has the full stack/design-token/gotcha reference. Update `context/TRACKER.md` after each meaningful implementation change; if a change alters the architecture, scope, schema, or flow documented above, update the relevant `context/` file too rather than letting it drift.

@AGENTS.md
