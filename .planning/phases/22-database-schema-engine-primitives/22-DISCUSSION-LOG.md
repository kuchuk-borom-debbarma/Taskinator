# Phase 22 Discussion Log

**Goal:** Provision the database tables for the new three-layer Autopilot architecture.
**Date:** 2026-05-16

## Topics Discussed

### 1. Primary Key and Hashing Strategy
**Options presented:**
- UUIDs vs Auto-increment integers
- App-side vs DB-side hashing
**User selection:** App-side hashing with the hash acting as the actual primary key for `conditions` and `actions`.
**Notes:** The user explicitly detailed that the application calculates the hash, avoiding DB-side calculation, and that it serves directly as the ID to enforce deduplication.

### 2. Labels Table Uniqueness
**Options presented:**
- Per-project uniqueness vs Global uniqueness
**User selection:** Per-project uniqueness.
**Notes:** Decided to use a standard ID for the labels tables with a `UNIQUE(project_id, name)` constraint to properly namespace labels.

### 3. Autopilot Sequence Storage
**Options presented:** Relational steps table vs JSON array.
**User selection:** JSON array.
**Notes:** The user mandated storing the ordered execution steps (Condition/Action references) directly in a single JSON array on the `autopilots` table to eliminate relational join complexity.
