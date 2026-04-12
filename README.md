# Taskinator-v2

**A high-performance workflow engine for teams with complex, multi-layered projects.**

Taskinator-v2 is a **workflow orchestration platform** designed to handle projects that are too deep and too fast for traditional tools. It focuses on managing massive task hierarchies while maintaining instant, real-time synchronization.

## Is Taskinator for you?

Taskinator is built for organizations that need more than a simple to-do list. It is designed for teams that require:

*   **Deep Hierarchies**: If your projects have dozens of nested sub-tasks and complex work breakdown structures, Taskinator is built for you.
*   **Automated Workflow Integrity**: If you need to enforce rules—like preventing a project from finishing until every sub-task is verified—our trigger engine handles it automatically.
*   **High-Throughput Reliability**: If you need a backend that stays responsive under heavy load, our event-driven architecture ensures the system never blocks your workflow.

## Core Features

### Task & Sub-Task Management
*   **Nested Tasks**: Create projects and break them down into infinitely nested tasks and sub-tasks. There are no limits on depth, allowing you to map out even the most complex work structures.
*   **Assignments**: Assign tasks to entire teams or specific individual members for clear accountability.

### Automation & Triggers
*   **Custom Automations**: Add logic to any task that reacts to status changes. 
*   **Guard Triggers**: Prevent a parent task from being marked as "DONE" until all of its children tasks are completed.
*   **Real-time Alerts**: Automatically notify parent task owners or other team members the moment a status changes.
*   **Webhooks**: Trigger external webhooks automatically when a specific task milestone is reached.

### Projects & Teams
*   **Project Organization**: Create and manage multiple projects with distinct members.
*   **Team Management**: Organize project members into specialized teams. You can assign project members to one or more teams to reflect your real-world organization.

### Real-time Connectivity
*   **Live Updates**: Stay synchronized with instant, live UI updates powered by GraphQL Subscriptions (SSE).
*   **Centralized Notifications**: Keep track of every important change with a dedicated, high-performance notification service.

## Architecture & Design

Taskinator is an engineering-first platform. We prioritize:
- **Asynchronous Execution**: Using an Event-Driven Architecture (EDA) to offload heavy lifting.
- **Efficient Scaling**: Targeted real-time routing using Redis and Kafka to minimize network noise.
- **Database Performance**: Materialized Paths for fast hierarchy lookups and Optimistic Locking for data integrity.

For a technical deep dive, see our [Detailed Architecture Documentation](./modular-monolith/docs/architecture.md).

## Project Structure

Taskinator-v2 is a full-stack application:
- `modular-monolith/`: Performance-focused Bun/Node.js backend.
- `taskinator-web/`: Modern React-based frontend.

---
Built for speed. Built for scale. Built for the future of work.
