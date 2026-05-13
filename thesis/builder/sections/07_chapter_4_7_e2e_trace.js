const { h2, h3, body, emptyLine, insertImage, figCaption, pageBreak, numberedRuns, run } = require('../utils');

module.exports = function getChapter4_7() {
  return [
    h2("4.7 Comprehensive Multi-Phase Execution Trace"),
    body("To synthesize the disparate architectural patterns discussed thus far—ranging from wCTE-driven transactional outboxes to Semantic Aggregators and Zero-Fan-Out SSE routing—it is imperative to execute an exhaustive trace of a single mutation as it propagates through the entire full-stack pipeline. This trace serves to demonstrate the system's resilience and deterministic behavior under maximum load conditions, where traditional synchronous architectures typically experience catastrophic failure."),
    
    h3("4.7.1 Phase 1: Synchronous Ingress and Atomic Persistance"),
    body("The lifecycle of a mutation commences at the React Client and terminates with the atomic database commit. This phase is characterized by its strict synchronous nature, necessitating sub-50ms execution to unblock the main execution thread of the user's browser environment."),
    emptyLine(),
    insertImage("diagram_e2e_phase1.png"),
    figCaption("Figure 4.7.1: Phase 1 — Synchronous Ingress and Edge Verification"),
    numberedRuns([run("Edge Ingress & Stateless Verification: ", true), run("The client issues a POST /graphql to mark 'Task 99' as COMPLETE. The Cloudflare Edge node, acting as a global distributed entry point, verifies the JWT signature statelessly in < 5ms, ensuring immediate rejection of unauthorized payloads before they reach the internal backbone.")], "e1"),
    numberedRuns([run("Federated Gateway Orchestration: ", true), run("The Apollo Federation Gateway parses the complex GraphQL Abstract Syntax Tree (AST), validates the schema adherence, and routes the mutation to the Node.js Workspace Subgraph via a high-speed internal VPC link.")], "e1"),
    numberedRuns([run("Atomic wCTE Execution: ", true), run("The Workspace service constructs a sophisticated data-modifying Common Table Expression (wCTE). It simultaneously updates the task status, increments the version column for Optimistic Concurrency Control, and serializes the TASK_UPDATED JSON payload into the outbox_events table. The database engine guarantees that this dual-write is either fully committed or rolled back, ensuring absolute consistency.")], "e1"),
    
    h3("4.7.2 Phase 2: Asynchronous Event Propagation"),
    body("Upon the successful commit of the synchronous transaction, the primary database lock is released, and the responsibility for system-wide synchronization is offloaded to the asynchronous event-driven backbone. This decoupling is the fundamental driver of the system's high-throughput capability."),
    emptyLine(),
    insertImage("diagram_e2e_phase2.png"),
    figCaption("Figure 4.7.2: Phase 2 — Outbox Relay and Kafka Partitioning"),
    numberedRuns([run("Reactive Outbox Triggering: ", true), run("The commit triggers a native PostgreSQL LISTEN/NOTIFY socket signal ('outbox_inserted'), which immediately awakens the dormant Outbox Relay process, eliminating the latency overhead associated with traditional interval-based polling.")], "e2"),
    numberedRuns([run("Concurrent SKIP LOCKED Claiming: ", true), run("To allow horizontal scaling of the relay tier, each instance executes a SELECT FOR UPDATE SKIP LOCKED query. This allows multiple relays to process the outbox table concurrently without ever colliding or processing the same event twice.")], "e2"),
    numberedRuns([run("Partition-Aware Kafka Ingestion: ", true), run("The relay publishes the event to the Kafka cluster using the projectId as the partition key. This guarantees that all events for a specific project are processed in strict causal order, a requirement for maintaining deterministic state in the downstream aggregators.")], "e2"),
    numberedRuns([run("Semantic Batch Aggregation: ", true), run("The Kafka Smart Aggregator consumes a massive batch of events. It applies an O(N) Map-Reduce 'Folding' algorithm, compressing redundant updates into a single mathematical delta before executing a bulk SQL UPDATE to adjust denormalized project counters.")], "e2"),

    h3("4.7.3 Phase 3: Real-time Reactivity and Cache Reconciliation"),
    body("The final phase involving the synchronization of the committed state back to all active browser instances viewing the project. This phase utilizes a 'Targeted Routing' approach to minimize network overhead."),
    emptyLine(),
    insertImage("diagram_e2e_phase3.png"),
    figCaption("Figure 4.7.3: Phase 3 — Targeted SSE Routing and Virtual DOM Reconciliation"),
    numberedRuns([run("Zero-Fan-Out Targeted Routing: ", true), run("The Aggregator queries the Redis Routing Table to identify the specific Node.js pods holding persistent Server-Sent Event (SSE) sockets for the affected project. It issues a targeted PUBLISH command, ensuring that zero bandwidth is wasted on server instances that do not serve project stakeholders.")], "e3"),
    numberedRuns([run("Surgical Apollo Cache Modification: ", true), run("The browser-side SSE link intercepts the JSON delta. Rather than triggering a destructive network refetch, it invokes cache.modify(), surgically injecting the updated status into the local normalized memory graph.")], "e3"),
    numberedRuns([run("React 18 Concurrent Rendering: ", true), run("The React state observer detects the granular data change. The Virtual DOM executes a high-speed diffing operation and reconciles the specific Task Card component, rendering the completed status to the user in a sub-300ms roundtrip from the initial click.")], "e3"),
    
    pageBreak(),
  ];
};
