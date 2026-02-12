# Project Domain

The Project is the top-level container for all organizational activities. It acts as the ultimate boundary for security, data sharding, and hierarchy.

## Core Rules
1. **Ownership**: Every project is owned by a single User (the creator). The owner has absolute authority.
2. **Uniqueness**: Project names must be unique for a specific user (e.g., User A cannot have two projects named "Taskinator").
3. **Membership**: 
   - A Project can have many Members.
   - Members are existing Users invited to the project.
   - Only Project Members (including the Owner) can be part of Teams or be assigned Tasks.
4. **Sharding**: All downstream entities (Teams, Tasks, Memberships) are sharded by `project_id` to ensure performance at scale and prevent cross-project data leakage.

## Security Context
Most service operations require a `userId` and `projectId` to verify that the actor has the right to view or modify the project's resources.