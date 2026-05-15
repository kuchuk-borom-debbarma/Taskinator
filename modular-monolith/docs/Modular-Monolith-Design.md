# Modular Monolith System Design

Taskinator-v2 is structured as a **Modular Monolith**. This approach gives us the development speed and deployment simplicity of a monolith while maintaining the architectural discipline and scalability of microservices.

## 🏗 Module Structure

Every domain area (e.g., `task`, `project`, `team`, `auth`) is encapsulated within its own directory in `src/modules/`. Each module follows a strict internal organization:

```text
src/modules/{domain}/
├── index.ts              # Module entry point (exports public singleton)
├── {Domain}Service.ts    # Public Interface (The "Contract")
└── internal/             # Private Implementation
    ├── {Domain}ServiceImpl.ts
    ├── {Domain}Queries.ts
    └── listeners/        # Domain-specific event consumers
```

### 1. The Public Contract (`Service.ts`)
Each module defines a public interface that other modules are allowed to use. This interface represents the "Supported API" of the module.

### 2. The Internal Implementation (`internal/`)
The actual logic, database queries, and helper functions are hidden inside the `internal/` directory. Other modules are **forbidden** from importing directly from `internal/`.

### 3. Singleton Single Entry Point
Each module exports a single instance of its service (e.g., `export const taskService = new TaskServiceImpl()`). This instance is initialized during the global application bootstrap.

## 📡 Cross-Module Communication

We use two primary patterns for communication between modules to prevent tight coupling:

### 1. Direct Service Calls (Read-Heavy)
For simple data retrieval (e.g., the Task module needs to know if a Project exists), modules can call each other's public service methods directly.

### 2. Internal Event Bus (Write-Heavy / Cascading)
For actions that have side effects in other domains, we use an asynchronous event-driven approach. 
- **Example**: When a `Project` is deleted, the Project module doesn't know about `Tasks`. It simply publishes a `project.deleted` event.
- **Reaction**: The `Task` module has a listener (`ProjectAggregated_DeleteProjectTask`) that subscribes to this event and performs the cleanup of all tasks belonging to that project.

## 🗄 Database Strategy

All modules share a single PostgreSQL database instance but maintain **Logical Separation**:
- Each module "owns" its own set of tables (e.g., `task` module owns `project_task`).
- Modules should avoid cross-module table joins in SQL. Instead, they should fetch IDs and perform logic in the service layer or use denormalized columns updated via events.

## 🚀 Benefits of this Design

- **Independence**: Developers can work on the `task` module without fear of breaking the `auth` module.
- **Scalability**: If a specific module (like `task`) becomes a bottleneck, it is already "migration-ready" to be extracted into a standalone microservice with minimal code changes.
- **Testability**: Each module can be unit tested in isolation by mocking its dependencies on other module services.
