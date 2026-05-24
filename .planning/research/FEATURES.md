# Feature Landscape

**Domain:** Event-Driven Task Automation
**Researched:** Today

## Table Stakes

Features users expect in an automation system. Missing these means the product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Task Mutation Triggers | The core of the system. Changing status, assignee, or custom fields must trigger events. | Low | Foundational to ECA. |
| Basic Conditions | "If status is X", "If assignee is empty". | Low | Essential for filtering events. |
| Core Actions | Update task status, create a new subtask, reassign. | Med | Must reuse the internal API to prevent duplicate logic. |
| Audit Logging | Seeing *why* a task changed (e.g., "Automated by Rule XYZ"). | Med | Required to prevent user confusion when "ghosts" move their tasks. |

## Differentiators

Features that set product apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| State-Comparison Conditions | "If status changed FROM 'In Progress' TO 'Done'". | Med | Requires passing the `before` state in the event payload. |
| Infinite Loop Detection | Automatically pausing rules that trigger each other in a cycle. | High | Protects system stability and earns enterprise trust. |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Hardcoded Workflows | Defeats the purpose of the flexible event-driven pivot. | Surface an API or UI for configurable rules. |
| Synchronous Execution | Causes extreme API latency during task mutation. | Use a background worker queue for actions. |

## Feature Dependencies

```
Task Mutation Triggers → Core Actions (Actions require events)
Basic Conditions → State-Comparison Conditions
```

## MVP Recommendation

Prioritize:
1. Task Mutation Triggers (Event Emission)
2. Basic Conditions (Rule Evaluation)
3. Core Actions (Worker Execution)

Defer: Infinite Loop Detection (can start with simple `source != system` flags before building full cycle detection).