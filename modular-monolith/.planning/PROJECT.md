# Project: Project-Level Throttling

## Core Value
Prevent any single project from starving system resources (DB, Kafka, CPU, Memory) regardless of operation type (graph updates, automations, API calls).

## Context
The modular monolith handles complex task links and cascading automations. Heavy projects can currently hog the Outbox Relay, Reachability Engine, and DB connections, impacting other projects.

## Success Criteria
- [ ] Resource usage is metered per project.
- [ ] Fair-share scheduling for event processing.
- [ ] Configurable limits (soft/hard) per project.
- [ ] No single project can block the global Outbox Relay or Reachability Engine.

