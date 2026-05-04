const { h2, h3, h4, body, emptyLine, imgPlaceholder, figCaption, codeLine, pageBreak } = require('../utils');

module.exports = function getChapter3_3() {
  return [
    h2("3.3 Database Optimization & Denormalization"),
    body("Before detailing the Kafka event pipelines, it is crucial to understand the foundational data layer optimizations applied directly within PostgreSQL that enable the high baseline throughput."),

    h3("3.3.1 Task Reachability Engine: Custom Closure Tables"),
    body("To support infinite task nesting and complex DAG (Directed Acyclic Graph) dependencies, Taskinator rejects slow recursive WITH RECURSIVE queries in favor of a Custom Closure Table architecture. The task_reachability index stores every possible path from every ancestor to every descendant in the graph, tracking the exact depth (number of hops)."),
    emptyLine(),
    imgPlaceholder("Figure 3.3: Task Reachability Engine — Closure Table Cross-Join Expansion"),
    figCaption("Figure 3.3: Task Reachability Engine — Closure Table Cross-Join Expansion"),
    h4("Cross-Join Expansion Mathematics:"),
    body("When a user creates a new dependency linking Task A as a parent of Task B, the engine cannot simply insert a single row. It must query the closure table for all tasks that reach A (the Ancestors) and all tasks reached by B (the Descendants)."),
    body("Every discovered ancestor must now be able to reach every discovered descendant. If Task A has 5 ancestors and Task B has 10 descendants, the system calculates the Cartesian product: 5 \u00D7 10 = 50 new paths. The new depth is calculated mathematically as: Depth(Ancestor -> A) + 1 + Depth(B -> Descendant)."),
    body("By proactively maintaining this matrix during write operations, the React Task Graph can fetch the entire dependency tree of a massive project in a single, index-backed O(1) read query. The normally catastrophic write amplification factor of Closure Tables is entirely mitigated by calculating these cross-joins asynchronously within the Kafka consumer pipeline."),

    h3("3.3.2 Optimistic Locking & Concurrency Control"),
    body("In a high-throughput collaborative environment, multiple users, automation engines, or background services may attempt to update the same task simultaneously. Instead of acquiring pessimistic database locks (SELECT ... FOR UPDATE), which block concurrent reads and severely limit throughput, the system employs Optimistic Locking."),
    body("Every mutable record in the database includes an integer version column. When a client reads a task, it receives the data alongside its current version (e.g., version = 1). When the client attempts an update via GraphQL, it sends the mutation including a WHERE version = 1 clause."),
    body("If another client successfully updated the task in the meantime, the version in the database will have incremented to 2. The subsequent update query will fail, returning 0 modified rows. The Kysely query builder catches this, rejects the stale update, throws a ConcurrencyError, and forces the client to reconcile and retry. This guarantees absolute data integrity without ever implementing read-blocking locks at the database level."),

    h3("3.3.3 CTE-Based Atomic Authorization"),
    body("To avoid executing multiple roundtrips to an external authorization table for every single mutation request, RBAC (Role-Based Access Control) security is baked directly into the SQL mutation utilizing Common Table Expressions (CTEs):"),
    codeLine("WITH auth_check AS (", 120),
    codeLine("    SELECT 1 FROM project_member"),
    codeLine("    WHERE fk_project_id = $1 AND fk_user_id = $2"),
    codeLine(")"),
    codeLine("UPDATE project_task SET title = $3"),
    codeLine("WHERE id = $4 AND EXISTS (SELECT 1 FROM auth_check)"),
    codeLine("RETURNING *;", 0, 120),
    body("This strategy achieves single-trip atomic security. If the user lacks the necessary permissions, the EXISTS clause fails instantly, and the update is safely and silently aborted at the database engine level, saving valuable Node.js CPU cycles and reducing network latency."),

    h3("3.3.4 Strategic Denormalization & Delta Processing"),
    body("Calculating the total number of pending tasks in a project dynamically requires an extremely expensive COUNT(*) query scanning potentially millions of rows. Taskinator denormalizes this value directly onto the Project entity (project.task_count)."),
    body("Crucially, when a task is created, the system does not execute a recalculation query. Instead, an event is fired into Kafka. A background aggregator calculates the mathematical delta (+1) and asynchronously executes an UPDATE project SET task_count = task_count + 1. This purely delta-based approach prevents expensive table scans entirely and allows the analytics dashboard to load instantly."),

    pageBreak(),
  ];
};
