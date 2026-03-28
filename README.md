# Taskinator

A hierarchical task management system designed around an event-driven architecture, built to scale.

## Features

- **Projects** — The top-level workspace. Members and teams are scoped to a project.
- **Teams** — Members are grouped into teams, which own and are responsible for tasks.
- **Tasks & Sub-tasks** — Tasks are assigned to teams and can be broken down into sub-tasks, each delegatable to a different team. This creates a clean ownership hierarchy across the task tree.
- **Event System** — Completing a sub-task can fire events configured by the parent team, enabling automated workflow progression without polling:
  - Update the parent task status
  - Spawn a new sub-task assigned to a team
  - Notify a team

Designed to handle a minimum of **10,000 RPS**.