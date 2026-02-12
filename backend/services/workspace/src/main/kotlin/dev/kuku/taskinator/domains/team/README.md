# Team Domain

Teams represent the structural topology of the organization. They are organized recursively to mirror the breakdown of responsibilities within a project.

## Core Rules
1. **Recursive Structure**: Teams can have one parent and many children, forming a tree.
2. **Hierarchy Limit**: The hierarchy is capped at a maximum depth of **50 levels** to prevent infinite recursion and maintain query performance.
3. **Project Scoping**: 
   - A Team belongs to exactly one Project.
   - A Team's parent must belong to the same Project.
4. **Membership**:
   - Only users who are already Members of the Project can join a Team.
   - A user can be a member of multiple teams within the same project.
5. **Naming**: Team names must be unique within a Project context.

## Recursive Delegation Logic
The team hierarchy exists primarily to facilitate the fractal delegation of work:
- **Direct Delegation**: A parent team can delegate work (tasks) to its **direct children**.
- **Autonomy**: A parent team does not need to know the internal structure or members of its child teams; it only needs to know that the child team exists and has accepted a sub-task.
- **Closure Table**: The hierarchy is managed via a Closure Table for high-performance ancestry and descendant lookups.