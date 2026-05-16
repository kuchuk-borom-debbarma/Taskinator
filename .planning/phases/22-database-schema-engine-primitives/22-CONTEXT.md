# Phase 22 Context: Database Schema & Engine Primitives

## Domain
Provision the database tables for the new three-layer Autopilot architecture.

## Decisions
- **Conditions & Actions Storage**: The Primary Key (`id`) for both the `conditions` and `actions` tables is the calculated structural hash. Hash generation is pushed to the application tier (Kotlin service) rather than the database, guaranteeing deduplication at the DB level.
- **Labels Storage (`condition_labels`, `action_labels`)**: These tables store the user-facing names and metadata. They use a standard primary key (UUID/Int) and enforce a `UNIQUE(project_id, name)` index constraint to ensure labels are unique per project. They reference the base logic via a foreign key to the `hash` ID.
- **Autopilot Sequence Storage**: The `autopilots` table will store its execution pipeline steps directly in a JSONB array column (e.g., `[{ "type": "condition", "id": "hash_abc" }, { "type": "action", "id": "hash_xyz" }]`), completely bypassing the need for a separate relational `autopilot_steps` table.

## Canonical Refs
- `/.planning/REQUIREMENTS.md`

## Specifics
- Schema will be written using Kotlin / Exposed ORM within the Taskinator Workspace.
- JSON serialization will be handled by the backend's standard stack (e.g., kotlinx.serialization or Jackson) to interact with PostgreSQL JSONB.
