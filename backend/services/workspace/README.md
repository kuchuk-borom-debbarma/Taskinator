

## 🎯 Role

The **Workspace Service** is the "Source of Truth" for the organizational skeleton of Taskinator. It manages the fundamental structure of how work is partitioned and who owns it. It is designed to handle the **Project-Team-Task** lifecycle as a single, highly cohesive unit to ensure that structural integrity is never compromised by network latency or partial updates.

---

## 🚧 Boundaries

### ✅ What it Owns (Internal)

* **Structural Hierarchy:** Managing the parent-child relationships for Projects, Teams, and Tasks.
* **Organizational Topology:** Defining nested team structures (e.g., Engineering > Backend) and the membership of users within those teams.
* **Core Task State:** Storing the "Physical" task (ID, Title, Description) and its current lifecycle status (To-Do, Done).
* **Relationship Integrity:** Enforcing graph-level rules, specifically **Cycle Detection** for blockers and task-to-task dependencies.
* **Delegation Authority:** Controlling the "Hand-off" logic when a task moves from one team's scope to another.

### ❌ What it Does NOT Own (External)

* **Identity Management:** It does not handle passwords, logins, or profile edits (managed by the **Identity Service**).
* **Workflow Automation:** It does not decide "what happens next." It emits state changes, but the **Flow Service** owns the custom automation rules.
* **Communication Delivery:** It does not send emails or Slack pings. It identifies *who* should be notified, but the **Nexus Service** handles the delivery.
* **Read Projections:** It is optimized for writing and structure, not for massive cross-team analytics (managed by the **Insight Service**).

---