# API Reference (GraphQL)

Taskinator-v2 provides a powerful GraphQL API for managing projects, teams, tasks, and real-time notifications. The API is hosted at `http://localhost:4000/graphql`.

## 🧭 Core Queries

### Authentication
- `me`: Returns the currently authenticated user.
- `user(id: ID!)`: Fetch a user by ID.

### Projects & Teams
- `projects(ids: [ID!])`: Fetch authorized projects.
- `project(id: ID!)`: Detailed project view including members and teams.
- `team(id: ID!)`: Detailed team view including assigned tasks.

### Tasks
- `task(id: ID!)`: Fetch a specific task.
- `tasks(ids: [ID!]!)`: Batch fetch tasks.

### Notifications
- `notifications`: Paginated list of user notifications.
- `unreadNotificationsCount`: Quick badge count for the UI.

## ✍️ Key Mutations

### Project Management
- `createProject(name, description)`
- `updateProject(id, version, name, description)`
- `deleteProjects(projectIds)`

### Team & Membership
- `createTeam(projectId, name)`
- `addProjectMembers(projectId, userIds)`
- `addTeamMembers(projectId, teamId, userIds)`

### Task Operations
- `task.create(input)`
- `task.update(taskId, input)`
- `task.delete(projectId, taskId)`
- `task.createLink(input)`: Create relationships (dependencies) between tasks.

## 📡 Real-time Subscriptions

- `realtimeStream(projectId: String)`: A unified SSE stream that delivers notifications and live task updates to the client. This is the core of our "Instant Sync" capability.

## 🛡 Security & Concurrency

- **Bearer Token**: All requests (except `signIn` and `signUp`) require a valid JWT in the `Authorization` header.
- **Optimistic Locking**: Mutations that update shared data (Projects, Teams, Tasks) require a `version` field. If the version in the database doesn't match your input, the request will fail with a `CONFLICT_ERROR`.
- **Atomic Authorization**: Permission checks are baked into the database queries via CTEs, ensuring that users can only modify data they are authorized to access.
