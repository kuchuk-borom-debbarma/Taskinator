# Task Domain

The Task domain implements a **Fractal Task Management** model, where tasks are recursive and their delegation is governed by the Project's Team Topology.

## Core Rules
1. **Project Scoping**: Every task belongs to a Project.
2. **Recursive Nature**: A Task can have one parent and multiple sub-tasks.
3. **Primary Assignment**: A task is always assigned to a **Team** (mandatory context). 
4. **Secondary Assignment**: A task can optionally be assigned to a **Member** within that team.

## The Delegation Protocol
The power to delegate is distributed throughout the hierarchy:

### 1. Root Tasks
- Created at the Project level.
- Can be assigned to any Team within the project.

### 2. Sub-tasks
- Created by a member of the team currently holding the parent task.
- **Assignment Constraint**: A sub-task can only be assigned to:
    - **The Same Team**: For internal work breakdown.
    - **A Direct Child Team**: To delegate responsibility down the organizational tree.
- **Member Assignment**: A sub-task can be assigned to any member of the *newly* assigned team.

## Status & Responsibility
- The **Assigned Team** is responsible for the task's completion.
- The **Assigned Member** is the primary worker/point of contact.
- Status updates (Pending -> In Progress -> Done) are performed by the assigned team/member.
- A parent task's completion usually depends on the completion of its sub-tasks (to be enforced by business logic).