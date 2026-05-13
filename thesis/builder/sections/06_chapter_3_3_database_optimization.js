const { h2, h3, h4, body, emptyLine, insertImage, figCaption, codeLine, codeBlock, pageBreak } = require('../utils');

module.exports = function getChapter3_3() {
  return [
    h2("3.3 Database Optimization & Denormalization: Scaling the Storage Tier"),
    body("The realization of a high-throughput orchestration engine is fundamentally predicated on the efficiency of its underlying data persistence layer. While application-layer optimizations provide significant gains, the ultimate bottleneck in any distributed system is typically the database's ability to handle concurrent I/O while maintaining strict referential integrity. Taskinator implements a multi-faceted database strategy within PostgreSQL 16, utilizing advanced indexing, non-blocking concurrency controls, and strategic denormalization to achieve its 10k RPS target."),

    h3("3.3.1 Evolutionary Trajectory of Hierarchical Storage"),
    body("The selection of an optimal strategy for persisting and querying complex hierarchies is one of the most critical architectural decisions in the system's development. The storage model for task dependencies evolved through two distinct phases, each representing a significant leap in performance and flexibility."),
    
    h4("Phase 1: Materialized Paths and the Combinatorial Bottleneck"),
    body("In the initial prototype phase, the system utilized a Materialized Path strategy (also known as Path Enumeration). In this model, each task entity persisted its full ancestry as a delimited string of unique identifiers (e.g., 'root_id/parent_id/child_id'). While this allowed for extremely rapid discovery of entire subtrees using simple, index-backed prefix matches (e.g., LIKE 'root/parent/%'), it proved to be fundamentally incompatible with a true Graph model."),
    body("As the requirements evolved to support multi-parent dependencies (where a single task contributes to multiple workstreams), Materialized Paths reached a 'Combinatorial Explosion'. Attempting to store every possible path for a highly interconnected node led to massive data redundancy and severe 'Write Amplification', where a single topological change required updating thousands of descendant path strings. This limitation necessitated a transition to a more mathematically robust model."),

    h4("Phase 2: The Transitive Closure Index and Reachability Engine"),
    body("To support infinite task nesting and the complex topology of Directed Acyclic Graphs (DAGs), Taskinator migrated to a custom 'Reachability Index'—a specialized implementation of a Closure Table. This index persists every possible path between every ancestor and every descendant in the project graph. Crucially, the index tracks the 'min_depth' (the number of hops along the shortest path), which allows for bounded neighborhood queries."),
    emptyLine(),
    insertImage("diagram_closure_table_math.png"),
    figCaption("Figure 3.3.1: Reachability Engine — Transitive Closure Expansion and Depth Calculation"),
    
    h4("The Mathematics of Cross-Join Expansion:"),
    body("The primary challenge of Closure Tables is the significant write amplification during edge creation. When a user establishes a dependency linking Task A (the Source) to Task B (the Target), the system must proactively calculate and persist the 'Transitive Closure'. This involves querying the index for all nodes that reach Task A (the Ancestor set) and all nodes reached by Task B (the Descendant set)."),
    body("The system then calculates the Cartesian product of these two sets: for every discovered ancestor and every discovered descendant, a new reachability record is generated. If Task A possesses $N$ ancestors and Task B possesses $M$ descendants, the operation results in $N \times M$ new entries. The depth of the new path is calculated as: $Depth(Ancestor \to Source) + 1 + Depth(Target \to Descendant)$. By offloading this potentially expensive $O(N \times M)$ operation to the asynchronous Kafka consumer tier, Taskinator ensures that the synchronous user interaction remains entirely unaffected by the topological complexity of the graph."),

    h3("3.3.2 Non-Blocking Optimistic Concurrency Control"),
    body("In high-concurrency environments, traditional pessimistic locking mechanisms (e.g., SELECT ... FOR UPDATE) are catastrophic for throughput, as they force readers to wait for writers, leading to widespread queueing and system timeouts. Taskinator adopts an 'Optimistic Concurrency Control' (OCC) strategy to maintain data integrity without sacrificing availability."),
    body("Every mutable entity in the database is equipped with a monotonically increasing 'version' column. When a client retrieves a task, the current version is included in the response payload. Upon attempting a mutation (e.g., updating a status), the client transmits the version it originally read. The database query specifically includes a filter: WHERE id = $targetId AND version = $readVersion. If a concurrent update has modified the task in the interim, the version will have incremented, the update will fail to match any rows, and the system will return a specialized ConcurrencyError. This mechanism guarantees that the 'Last-Writer-Wins' problem is solved while ensuring that read operations are never blocked by concurrent writes."),

    h3("3.3.3 Single-Trip Atomic Authorization via wCTEs"),
    body("To minimize the latency of authorization checks, which typically require a secondary database roundtrip to verify user-project relationships, Taskinator embeds the security logic directly into the business mutation utilizing 'Writeable Common Table Expressions' (wCTEs)."),
    codeBlock(`-- Atomic Single-Trip Update with Embedded RBAC
WITH auth_context AS (
    SELECT 1 FROM project_member
    WHERE fk_project_id = $projectId 
      AND fk_user_id = $userId 
      AND role IN ('ADMIN', 'EDITOR')
)
UPDATE project_task 
SET title = $newTitle, 
    version = version + 1 -- Increment OCC Version
WHERE id = $taskId 
  AND version = $expectedVersion -- Verify OCC Version
  AND EXISTS (SELECT 1 FROM auth_context) -- Final Security Gate
RETURNING *;`),
    body("This strategy ensures that the entire operation—permission verification, optimistic locking check, and data persistence—is executed as a single atomic unit by the database engine. If any check fails, the transaction is silently aborted, ensuring that unauthorized or stale updates never compromise the system state."),

    h3("3.3.4 Dynamic Denormalization and Delta-Based Aggregation"),
    body("The retrieval of high-level project metrics (e.g., 'Total Tasks', 'Completion Percentage') is a common but expensive operation in large datasets, often requiring full table scans or complex recursive counts. To optimize read performance, Taskinator utilizes 'Strategic Denormalization', where aggregate counts are persisted directly onto the Project entity."),
    body("Unlike naive denormalization strategies that recalculate totals on every write, Taskinator utilizes a 'Delta-Based' approach. When a task is created or its status changes, a granular event (e.g., TASK_CREATED) is emitted to the event bus. A specialized 'Smart Aggregator' consumes these events and executes a mathematical increment or decrement: UPDATE project SET task_count = task_count + 1. This prevents the need for expensive aggregate queries entirely, allowing the project dashboard to load with O(1) complexity even for projects containing millions of tasks."),

    pageBreak(),
  ];
};
