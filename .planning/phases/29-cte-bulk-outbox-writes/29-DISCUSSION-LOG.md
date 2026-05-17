# Phase 29: CTE Bulk Outbox Writes - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-17
**Phase:** 29-cte-bulk-outbox-writes
**Areas discussed:** Scope of CTE Outbox Generation, Missing/Malformed Trace Headers, Recovery Buffer Merging Precedence

---

## Scope of CTE Outbox Generation

| Option | Description | Selected |
|--------|-------------|----------|
| Option A | *Exclusive to Tasks* (Simpler, keeps the CTE query simple and focused only on the high-frequency task table) | |
| Option B | *Dynamic Table-Agnostic CTEs* (Builds dynamic table-mapping metadata in `SmartAggregator` so that updates to Teams or Projects also compile and insert outbox events in a single round-trip) | ✓ |

**User's choice:** Option B (Dynamic Table-Agnostic CTEs)
**Notes:** Dynamically compiling CTE queries allows future scaling of other autopilot domains without separate hardcoded query updates.

---

## Missing/Malformed Trace Headers

| Option | Description | Selected |
|--------|-------------|----------|
| Option A | *Strict Fail-Safe with Logs* (Throw a validation exception immediately and reject the mutation to prevent untraced mutations, logging clearly so that it isn't missing) | ✓ |
| Option B | *System Default Fallback* (Fallback to a generated system `traceId` and `depth = 0` to ensure execution completes safely) | |

**User's choice:** Option A (Strict Fail-Safe with Logs)
**Notes:** Helps track down untraced database mutation paths and prevents system actions from executing without clear tracing telemetry.

---

## Recovery Buffer Merging Precedence

| Option | Description | Selected |
|--------|-------------|----------|
| Option A | *Keep Oldest Trace* (Retains the original parent traceId and lower depth to avoid artificially inflating the loop count during retries) | ✓ |
| Option B | *Adopt Newest Trace* (Adopts the most recent traceId and higher depth to be conservative about recursive loop triggers) | |

**User's choice:** Option A (Keep Oldest Trace)
**Notes:** Better for preventing false-alarms in the loop safety guard.

---

## the agent's Discretion

- Error logging message formatting.
- Specific dynamic casing syntax for serializing fields.

## Deferred Ideas

- None — discussion stayed within phase scope.
