const { h2, h3, body, emptyLine, insertImage, figCaption, pageBreak, numberedRuns, run } = require('../utils');

module.exports = function getChapter4_7() {
  return [
    h2("4.7 Comprehensive End-to-End Execution Trace"),
    body("To synthesize the disparate architectural patterns discussed thus far—from wCTE transaction outboxes to Semantic Aggregators and Zero-Fan-Out SSE routing—it is necessary to trace a single mutation through the entire full-stack pipeline under maximum load conditions."),
    
    emptyLine(),
    insertImage("diagram_e2e_sequence.png"),
    figCaption("Figure 4.7: Comprehensive End-to-End Architecture Flow"),
    
    h3("4.7.1 The Synchronous Phase (0ms - 50ms)"),
    body("The lifecycle of a mutation begins at the React Client and ends with the database commit. This phase must be as fast as possible to unblock the client thread."),
    numberedRuns([run("Edge Ingress: ", true), run("The client issues a POST /graphql to mark 'Task 99' as COMPLETE. The Cloudflare Edge node verifies the JWT statelessly in < 5ms and proxies the request. ")], "e1"),
    numberedRuns([run("Gateway Routing: ", true), run("The Apollo Federation Gateway parses the GraphQL AST and routes the mutation to the Node.js Workspace Subgraph. ")], "e1"),
    numberedRuns([run("wCTE Execution: ", true), run("The Workspace service constructs a data-modifying CTE. It atomically updates the task status in project_task, increments the version for OCC, and inserts a JSON payload into the outbox_events table. The transaction commits, and a 200 OK is returned to the client.")], "e1"),
    
    h3("4.7.2 The Asynchronous Phase (50ms - 250ms)"),
    body("Once the synchronous database lock is released, the heavy lifting is offloaded to the asynchronous event bus."),
    numberedRuns([run("Postgres Notification: ", true), run("The outbox table trigger emits a native PG_NOTIFY via sockets, waking up the dormant Outbox Relay. ")], "e2"),
    numberedRuns([run("SKIP LOCKED Retrieval: ", true), run("The Relay executes a SELECT FOR UPDATE SKIP LOCKED, claiming the event row exclusively, bypassing concurrent relays. It publishes the event to the Kafka cluster using the project_id as the partition key to guarantee strict ordering.")], "e2"),
    numberedRuns([run("Smart Aggregation: ", true), run("The Kafka Smart Aggregator consumer pulls a massive batch of 10,000 events. It applies the Semantic Folding O(N) Map-Reduce algorithm, compressing 500 duplicate 'Task 99' complete events into a single delta. It executes one SQL UPDATE to adjust the project completion counters.")], "e2"),
    
    h3("4.7.3 The Reactivity Phase (250ms - 300ms)"),
    body("The final state must be synchronized back to all active browsers viewing the project."),
    numberedRuns([run("Targeted SSE Routing: ", true), run("The Aggregator queries the Redis Sets to find the exact Node.js pods holding open Server-Sent Event sockets for the specific project. It utilizes SADD/PUBLISH to target only those pods, achieving Zero-Fan-Out.")], "e3"),
    numberedRuns([run("Cache Reconciliation: ", true), run("The targeted pod streams the JSON delta over the SSE socket back to the browser. Apollo Client intercepts the delta, executes cache.modify() to bypass the network, and surgically updates the local memory graph. React 18 detects the pure data change and executes a highly optimized virtual DOM reconciliation, instantly rendering the checkmark UI.")], "e3"),
    
    pageBreak(),
  ];
};
