# Project: Configurable Workspace Behaviors (CWB) Automation

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
