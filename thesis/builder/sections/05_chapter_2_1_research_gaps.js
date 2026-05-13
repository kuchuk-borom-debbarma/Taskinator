const { h1, h2, h4, body } = require('../utils');

module.exports = function getChapter2_1() {
  return [
    // ══════════════════════════════════════════════════════════════
    // CHAPTER 2: LITERATURE SURVEY
    // ══════════════════════════════════════════════════════════════
    h1("2. LITERATURE SURVEY"),

    h2("2.1 Research Gaps in Workflow Orchestration"),
    body("The evolution of workflow orchestration and project management tools has been extensively documented in academic literature and industry whitepapers. However, there remains a significant gap between theoretical architectural patterns and their practical application in high-throughput, real-time enterprise systems. A critical analysis of the current literature reveals several distinct research gaps that motivate the development of the Taskinator platform."),

    h4("1. Scalability Limitations in Hierarchical Data Models:"),
    body("A fundamental requirement of any advanced task management system is the ability to handle deeply hierarchical data (tasks, sub-tasks, sub-sub-tasks, and arbitrary directed dependencies). Traditional database literature heavily favors the Adjacency List model (utilizing a simple parent_id foreign key column) due to its ease of implementation and referential integrity. However, as documented by Celko (2012) in \"Trees and Hierarchies in SQL\", deep tree traversals within this model necessitate the use of recursive Common Table Expressions (CTEs). Recursive CTEs degrade exponentially in performance as tree depth and branching factors increase, making them unsuitable for real-time reads at massive scale."),
    body("Conversely, while the Closure Table pattern—which stores all transitive paths between nodes—is discussed theoretically as a solution for O(1) read performance, it is frequently dismissed in practical large-scale applications due to its severe O(D\u00B2) write amplification factor during insertion and deletion. There is a noticeable gap in current literature demonstrating how to effectively mitigate this write amplification using asynchronous event-driven batching methodologies, a technique that could make Closure Tables viable for systems targeting 10,000 RPS."),

    h4("2. The Thundering Herd Problem in Transactional Outboxes:"),
    body("To achieve Eventual Consistency without suffering from dual-write failures (where a database commits but the message broker publish fails), the Transactional Outbox pattern is widely recommended in microservice architecture literature (Richardson, 2018). However, standard implementations of this pattern rely on background worker threads using setInterval polling to query the outbox table for un-published events."),
    body("In a horizontally scaled cloud environment consisting of dozens of backend pods, this primitive polling strategy creates a catastrophic \"Thundering Herd\" problem. Multiple pods query the exact same database rows simultaneously, leading to severe row-level lock contention, CPU spikes, and eventual deadlocks. While existing literature often points to complex solutions like Change Data Capture (CDC) using Debezium and Kafka Connect to solve this, these solutions introduce massive infrastructural overhead and operational complexity. There is a pressing need for research into simpler, native database mechanisms—such as PostgreSQL's reactive LISTEN/NOTIFY combined with SKIP LOCKED concurrency controls—to bridge this gap efficiently without external CDC dependencies."),

    h4("3. Write Amplification from Cascading Deletions:"),
    body("When a root node in a deeply nested graph is deleted, traditional Relational Database Management System (RDBMS) design dictates the use of ON DELETE CASCADE foreign key constraints to maintain referential integrity. At enterprise scale, this approach is disastrous. A single HTTP request triggering a synchronous cascade across 50,000 descendant rows will acquire and hold exclusive database locks for several seconds. During this window, any concurrent operations touching those tables are blocked, causing massive transaction timeout failures across the entire system."),
    body("Current literature lacks comprehensive, peer-reviewed patterns for \"Chunked Self-Signaling Deletions\" or \"Recursive Queued Cleanups\" that perform unbounded graph deletions using bounded, time-sliced transactions."),

    h4("4. Network Saturation in Real-Time Systems:"),
    body("Modern web applications rely heavily on WebSockets or Server-Sent Events (SSE) to provide real-time interactivity. The prevalent architectural pattern for distributing these events across a cluster of backend nodes is \"Pub/Sub Fan-Out\" (typically implemented via Redis PUBLISH). If a data mutation occurs, the payload is blindly broadcast to every single connected server instance, which then checks its local memory to see if it holds the relevant client connection."),
    body("At high scale, this brute-force fan-out methodology leads to an overwhelming volume of unnecessary internal network traffic, essentially turning internal Pub/Sub into a localized DDoS attack. Highly targeted routing strategies that actively track client locations to eliminate fan-out are severely underrepresented in current distributed web architecture studies."),
  ];
};
