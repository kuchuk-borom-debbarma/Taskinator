# PR: Real-time Infrastructure, Keyset Pagination, and Authorization Refinement

## Overview
This PR introduces the real-time event streaming infrastructure (SSE), migrates the entire system to high-performance keyset-based pagination, and refactor the team/project membership authorization to better support collaborative workflows.

## Key Changes

### 📡 Real-time & SSE Infrastructure
- **SSE Manager**: Implemented a localized SSE registry with multi-project mapping and heartbeat support.
- **Kafka Fan-out**: Integrated Kafka consumers to broadcast project-level events (task updates, project triggers) to connected users.
- **Security**: Scoped real-time updates to project membership, preventing unauthorized event leakage.

### 📈 Universal Keyset Pagination
- **Optimization**: All LIST-based endpoints (`/projects`, `/tasks`, `/teams`, `/notifications`) now use keyset-based pagination (`cursor` + `limit`).
- **Performance**: Optimized for 10k RPS by replacing offset-based scans with index-friendly cursor queries.
- **Stability**: Fixed frontend regressions where the UI expected raw arrays instead of the new `{ data, nextCursor }` wrapper.

### 🔐 Authorization & Search Refinements
- **Project-Scoped User Search**: Restricted team member suggestions to users already part of the project (Owner or Members).
- **Team Membership**:
    - Reverted automatic creator membership; creators are now distinct from members unless manually added.
    - Expanded management permissions: Project Owners, Team Creators, and existing Team Members can now manage team composition.
- **Task Triggers**: Implemented missing authorization checks for trigger creation to ensure only project members can add automations.

### 🛠️ Developer Experience & Docs
- **Explicit Extensions**: Standardized imports to include `.ts` extensions for better compatibility.
- **Architecture Docs**: Added `docs/SSE Architecture.md` and updated stability/connection tuning guidelines.

## Verification Plan

### Automated Coverage
- [x] Kafka consumer tests for event processing.
- [x] SQL unit tests for keyset pagination boundary conditions.

### Manual Verification
- [x] Verified SSE connection stability under network fluctuation.
- [x] Confirmed "Created by" label update in Team UI.
- [x] Verified that adding team members only suggests project-participating users.
- [x] Confirmed task trigger creation is restricted to project members.

## Technical Notes
- **SSE Tuning**: Increased backend connection timeout and added socket-level logging for better observability during peak loads.
- **Null Handling**: Fixed edge cases in user search queries where missing search strings were causing SQL syntax errors.

---
**Branch**: `feature/server-sent-event`  
**Merge Target**: `dev`
