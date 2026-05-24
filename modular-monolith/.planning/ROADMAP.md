# Roadmap: Taskinator v2

## Shipped Milestones
- [x] **v1.0: CWB Automation** (2026-05-23) — [Archive](.planning/milestones/v1.0/v1.0-ROADMAP.md)

## Current Milestone: v1.1 — Search Module

Cross-entity search, task filtering, and sorting — making everything in the
project quickly discoverable from a single place.

### Scope

- [ ] **Global search** — search across tasks, teams, and members in one query.
      Results grouped by entity type with keyboard-navigable UI (⌘K / Ctrl+K).
- [ ] **Task filtering** — filter task lists by status, assignee, team, priority,
      date range, and any combination thereof.
- [ ] **Task sorting** — sort by priority, created date, updated date, status,
      and assignee; multi-column sort support.
- [ ] **Member search** — find members within a team or across the whole project.
- [ ] **Team search** — search and filter the teams list.
- [ ] **URL-persisted filters** — active filters and sort order reflected in the
      URL so views are shareable and survive page refresh.
- [ ] **Backend search API** — full-text search via PostgreSQL `tsvector` / `tsquery`
      with an indexed `search_vector` column on relevant tables, or a lightweight
      `ILIKE` approach for MVP.
- [ ] **Pagination continuity** — filtered/sorted queries still cursor-paginate
      correctly without N+1 or count-explosion issues.

### Out of scope for v1.1
- Saved / pinned filter presets (v1.2+)
- Cross-project search (requires auth scoping changes)
- Full-text search inside task descriptions (v1.2+)
