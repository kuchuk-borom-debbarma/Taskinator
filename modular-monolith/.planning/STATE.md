# Project State: Project-Level Throttling

## Project Reference
- **Core Value**: Prevent any single project from starving system resources (DB, Kafka, CPU, Memory).
- **Current Focus**: Roadmap established, ready for phase 1 initialization.

## Current Position
- **Phase**: 0 (Not started)
- **Plan**: N/A
- **Status**: Initialization
- **Progress**: [----------] 0%

## Performance Metrics
- **Throttling Overhead**: TBD (< 5ms target)
- **Fairness Index**: TBD
- **Rejection Rate**: TBD

## Accumulated Context
### Key Decisions
- Use `rate-limiter-flexible` for API-level throttling (Research finding).
- Use `Bottleneck` for background task concurrency (Research finding).
- Use SQL Window Functions for fair-share outbox fetching (Research finding).

### Todos
- [ ] Initialize Phase 1
- [ ] Setup Redis for throttling state

### Blockers
- None

## Session Continuity
- **Last Action**: Created ROADMAP.md and STATE.md.
- **Next Step**: Start Phase 1: Database & Schema Evolution.
