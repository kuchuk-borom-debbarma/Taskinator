# Pull Request: Unified GraphQL Architecture & Real-time Stream Consolidation

## 📋 Overview
This pull request fundamentally re-architects the Taskinator communication layer, transitioning from fragmented REST/SSE endpoints to a unified, production-grade **Modular GraphQL** system. It introduces a single-pipe real-time event stream and an ordered system bootloader to ensure maximum reliability and developer productivity.

## 🚀 Key Architectural Changes

### 1. Modular GraphQL Engine
- **Vertical Schema Separation**: Decomposed the monolithic schema into domain-specific files (`task.graphql`, `team.graphql`, `project.graphql`, etc.) within `src/graphql/schema/`.
- **Domain-Specific Resolvers**: Resolvers are now organized by module in `src/graphql/resolvers/` and aggregated dynamically.
- **Type-Safe Loading**: Implemented [schema.ts](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/modular-monolith/src/graphql/schema.ts) using `@graphql-tools` to merge SDL files and resolvers at runtime, maintaining strict domain boundaries.

### 2. Unified Real-time Event Stream
- **Consolidated Connection**: Replaced multiple, separate SSE connections with a single `Subscription.realtimeStream`.
- **Event Multiplexing**: Implemented a `RealtimeEvent` union to stream Task Creations, Updates, Deletions, and Notifications through one stable pipe.
- **Kafka Fan-out Logic**: Updated the real-time bridge to broadcast individual `NOTIFICATION.CREATED` events via Kafka, ensuring all server instances can deliver updates to their locally connected clients.

### 3. Ordered 4-Phase Boot Sequence
- **Infrastructure Guarantee**: Refactored the application entry point to follow a strict sequential bootloader:
    1. **Phase 1**: Kafka Infrastructure (Topics & Producer)
    2. **Phase 2**: Domain Services & Event Listeners
    3. **Phase 3**: Public API (GraphQL/REST)
    4. **Phase 4**: Background Outbox Relay
- **Impact**: This eliminates "cold start" issues where the API could start accepting traffic before internal event listeners were ready.

### 4. Frontend GraphQL Integration
- **Unified Data Fetching**: Migrated the web client to use GraphQL as the primary data source, significantly reducing the number of round-trips to the backend.
- **Improved Real-time Hook**: Refactored `useRealtime.ts` to manage a single, persistent subscription connection that handles workspace updates and notification badges in parallel.

## 🧪 Verification & Stability
- **Type Safety**: Passed a full `tsc --noEmit` check on the backend with 0 errors.
- **Manual Verification**:
    - [x] Confirmed "Read-time Notification" badge updates instantly on event receipt.
    - [x] Verified "Workspace Task" updates reflect in real-time across multiple browser tabs.
    - [x] Confirmed the ordered boot sequence prevents event loss during server startup.

---
**Branch**: `endpoint/graphql`  
**Merge Target**: `dev`  
**Status**: Ready for Review
