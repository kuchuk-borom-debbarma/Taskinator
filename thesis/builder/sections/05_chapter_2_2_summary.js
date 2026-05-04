const { h2, h3, body, bulletRuns, run, pageBreak } = require('../utils');

module.exports = function getChapter2_2() {
  return [
    h2("2.2 Summary of Literature Review"),
    body("To effectively address these substantial research gaps, the architecture of Taskinator synthesizes several advanced concepts spanning distributed systems research, database theory, and reactive programming."),

    h3("Hierarchical Data Models"),
    body("When representing hierarchical and graph-based data, traditional relational databases offer several models, each presenting distinct trade-offs between read and write performance:"),
    bulletRuns([run("Adjacency List (parent_id): ", true), run("Extremely simple to implement and update. However, it requires slow, recursive CTEs to retrieve deep sub-trees, making it a severe bottleneck for read-heavy applications displaying complex UI graphs.")], "b5"),
    bulletRuns([run("Materialized Path (Path Enumeration): ", true), run("Stores the full ancestry as a structured string (e.g., 1.2.5.). It provides extremely fast read access using LIKE queries. However, string manipulation operations scale very poorly when a node with thousands of descendants is moved to a new parent, and it cannot easily represent multi-parent dependencies (Directed Acyclic Graphs).")], "b5"),
    bulletRuns([run("Nested Sets: ", true), run("Uses left_id and right_id boundaries to define subsets. While read performance is exceptional, inserting a single node requires recalculating the boundaries for half the table, resulting in unacceptable lock contention in high-write environments.")], "b5"),
    bulletRuns([run("Closure Table: ", true), run("Stores all discrete paths between nodes in a transitive closure matrix. While traditional literature highlights the severe O(depth\u00B2) write amplification, Taskinator proves that customized closure implementations can mitigate this by batching updates asynchronously. By storing only structural reachability rather than strict, weighted paths, and computing the exact visual rendering paths in-memory on the application layer, the database read operations remain consistently O(1).")], "b5"),

    h3("Consistency Models and the CAP Theorem"),
    body("Modern high-throughput web applications frequently transition away from Strong Consistency models (where ACID transactions block until they are globally committed to all replicas) towards Eventual Consistency. Kleppmann (2017) emphasizes in \"Designing Data-Intensive Applications\" that strong consistency requires synchronous distributed consensus protocols (such as Paxos or Raft), which inherently and severely limit write throughput and system availability under partition events."),
    body("Taskinator fully embraces the BASE model (Basically Available, Soft state, Eventual consistency). By utilizing strategic denormalization for reads and asynchronous event processing pipelines for writes, the system prioritizes high Availability. While this introduces inherent complexity in the User Interface regarding stale data reads, Taskinator mitigates this using advanced Optimistic UI update mechanisms on the React client side."),

    h3("The Transactional Outbox Pattern"),
    body("The \"Dual-Write Problem\"—where a system must write business data to a primary database and simultaneously publish a domain event to a message broker—is a well-documented failure mode in distributed systems. If the database commit succeeds but the broker publish fails due to network jitter, the system enters a permanently inconsistent state."),
    body("The Transactional Outbox pattern solves this by writing the event payload to a dedicated outbox table within the exact same ACID transaction as the business data mutation. Taskinator implements this foundational pattern but significantly enhances its performance using PostgreSQL's Data-Modifying CTEs (wCTEs). This enhancement eliminates multi-statement transaction overhead, guaranteeing absolute atomicity in a single network roundtrip."),

    h3("Concurrency and Locking Strategies"),
    body("To maintain data integrity during highly concurrent updates, traditional monolithic systems rely heavily on Pessimistic Locking (SELECT ... FOR UPDATE). While this guarantees safety, it forces concurrent threads to block and wait, severely limiting overall throughput."),
    body("Optimistic Locking, which utilizes an incrementing version column, is proposed in academic literature as a high-performance alternative for environments where read-to-write ratios are high and direct write conflicts on the same record are relatively rare. By outright rejecting update statements that reference stale version numbers, the system forces the client to retry the operation. This preserves data integrity without ever acquiring long-lived, throughput-killing database locks. Taskinator implements Optimistic Locking globally across all major domain entities."),

    h3("Event Streaming and Apache Kafka"),
    body("Apache Kafka fundamentally differs from traditional message queues (like RabbitMQ or ActiveMQ) because it acts as an immutable, partitioned, append-only log. Literature surrounding stream processing emphasizes the critical importance of Partitioning Keys to guarantee causal message ordering. By strictly partitioning all domain events by their associated projectId, Taskinator ensures that an \"Update Task\" event is never accidentally processed before the preceding \"Create Task\" event, regardless of network transport jitter or pod restarts. Furthermore, Kafka's consumer group mechanics allow multiple independent downstream services (e.g., the Reachability Engine and the Real-Time Router) to process the exact same event stream simultaneously without interfering with each other's offsets."),
    body("By actively synthesizing these advanced patterns—Custom Closure Tables, wCTE Outboxes, Optimistic Locking, and Targeted Redis Routing—Taskinator proposes a novel, fully integrated framework that directly addresses the specific research gaps associated with scaling complex orchestration systems."),

    pageBreak(),
  ];
};
