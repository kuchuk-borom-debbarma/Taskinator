# Project: Taskinator v2

## Current State
- **Last Shipped:** v1.0 - CWB Automation (2026-05-23)
- **Status:** Stable, Legacy AST purged.
- **Core Engine:** Configurable Workspace Behaviors (`behavior_rule`) with Pre-Action Guards and Post-Action Cascades.

## Next Milestone Goals (TBD)
- [ ] Autopilot Hardening (Advanced triggers, concurrency limits).
- [ ] Advanced Notification Engine (`AUTO_NOTIFY`).
- [ ] UI Dashboard for Automation monitoring.

---

<details>
<summary>v1.0: CWB Automation Details</summary>

## Overview
Replace legacy `auto_action` system with a simplified, flat-targeting rule engine (`behavior_rule`).
Focus on Pre-Action Guards (preventive) and Post-Action Cascades (reactive via Kafka).

## Objectives
- Implement `behavior_rule` table and Kysely schema.
- Add synchronous Pre-Action Guard hooks in `TaskService`.
- Implement asynchronous Post-Event Cascade consumers for Kafka.
- Delete legacy code bloat (AST engines, step cursors).
- Provide dynamic settings catalog for UI.

## Decisions
- **Migration:** Fresh Start (Wipe old `auto_action` data).
- **Cascades:** Kafka Native (Asynchronous).
- **Testing:** E2E Heavy (Real DB/Kafka integration).

## Tech Stack
- Kysely (PostgreSQL)
- Kafka (Event-driven cascades)
- TypeScript
- Jest (E2E)
</details>
