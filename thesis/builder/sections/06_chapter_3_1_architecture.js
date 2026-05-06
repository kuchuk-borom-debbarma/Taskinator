const { Paragraph, TextRun } = require('docx');
const { h1, h2, h3, body, numberedRuns, run, emptyLine, insertImage, figCaption, F } = require('../utils');

module.exports = function getChapter3_1() {
  return [
    // ══════════════════════════════════════════════════════════════
    // CHAPTER 3: SYSTEM ANALYSIS AND DESIGN
    // ══════════════════════════════════════════════════════════════
    h1("3. SYSTEM ANALYSIS AND DESIGN"),
    body("The engineering of a high-throughput, horizontally scalable task orchestration engine necessitates a radical departure from traditional, synchronous web application architectures. To achieve the requisite goals of extreme responsiveness, eventual consistency, and data integrity under massive concurrent load, Taskinator adheres to a strict 'non-blocking' full-stack architectural philosophy. This philosophy is centered on the principle of minimizing synchronous wait times at every possible junction of the application lifecycle, from the edge network to the physical storage tier."),

    h2("3.1 Overall System Architecture: A Hybrid Approach"),
    body("The overarching system architecture of Taskinator is conceptualized and implemented as a 'Modular Monolith' underpinned by a robust Event-Driven Architecture (EDA) backbone. This strategic hybrid approach aims to capture the deployment simplicity and developmental velocity of a monolithic application while simultaneously reaping the benefits of microservices: strict domain encapsulation, loose temporal coupling, and the ability to scale operational workloads independently across a distributed cluster."),
    body("By utilizing a modular design within a single deployable unit, the system avoids the inherent complexities and network overhead of cross-service RPC calls during its initial growth phase. However, by strictly utilizing Kafka as the primary inter-domain communication channel for side effects, the architecture remains 'Microservice-Ready'—allowing any individual module (e.g., the Task Graph Engine) to be extracted into a dedicated service with zero changes to the core business logic."),
    emptyLine(),
    insertImage("diagram_system_overview.png"),
    figCaption("Figure 3.1: Full-Stack Layered Architecture and Data Flow — Taskinator"),
    
    h3("3.1.1 Layered Decomposition and Responsibility Mapping"),
    body("The system is physically and logically decomposed into five distinct operational tiers, each responsible for a specific aspect of the request-response and event lifecycle:"),
    
    numberedRuns([run("Layer 1 (Intelligent Presentation & Client State): ", true), run("The frontend is constructed using React 18, leveraging its concurrent rendering features to maintain a responsive UI even during complex state transitions. The centerpiece of this layer is the Task Graph visualization, an SVG-based interactive canvas powered by the D3.js force-directed layout engine. State management is handled by Apollo Client, which provides a normalized in-memory cache that serves as the 'Source of Truth' for the client application. Real-time updates are ingested via persistent Server-Sent Event (SSE) streams, allowing the UI to react to server-side events without user-initiated polling.")], "n2"),
    
    numberedRuns([run("Layer 2 (Stateless Edge & API Gateway): ", true), run("Taskinator utilizes a globally distributed edge network (Cloudflare) to perform stateless JWT verification and initial request filtering. This is followed by the GraphQL API Gateway (Apollo Server), which acts as a strictly-typed contract layer. The gateway validates the structural integrity of incoming JSON payloads, enforces schema constraints, and orchestrates the resolution of complex queries across the underlying domain modules. By utilizing GraphQL, the system eliminates both over-fetching and under-fetching, significantly reducing the payload sizes transmitted over the wire.")], "n2"),
    
    numberedRuns([run("Layer 3 (Encapsulated Domain Modules & Async Workers): ", true), run("The heart of the system resides in the Node.js application tier, which is logically partitioned into domain contexts (Project, Task, Team, Identity). Each module maintains its own internal logic and storage patterns. This layer also houses the Outbox Relay—a specialized background process responsible for the reliable delivery of events—and a suite of Kafka Consumer Workers that handle CPU-intensive tasks such as graph reachability calculation and asynchronous aggregate folding.")], "n2"),
    
    numberedRuns([run("Layer 4 (Persistent Storage & Event Streaming): ", true), run("PostgreSQL 16 serves as the authoritative, durable storage layer, utilizing advanced features like Common Table Expressions (CTEs), Partitioned Indices, and Row Level Security. Parallel to the relational database, Apache Kafka operates as a high-throughput, persistent event log. Kafka provides the 'Glue' of the event-driven system, allowing for the horizontal partitioning of event streams and guaranteeing that the system can scale its processing capacity linearly with the addition of new consumer nodes.")], "n2"),
    
    numberedRuns([run("Layer 5 (Ephemeral Real-Time Routing): ", true), run("To solve the 'Real-Time Fan-Out Problem' (where a single event must reach multiple specific users), Taskinator employs a Redis-based routing tier. Redis maintains a dynamic, ephemeral map of project IDs to active server instances holding SSE connections. This allows for 'Zero-Fan-Out' message delivery, where an event is only transmitted to the specific server pods where interested clients are currently connected, drastically reducing unnecessary network traffic in the cluster.")], "n2"),

    h3("3.1.2 The Non-Blocking Orchestration Lifecycle"),
    body("To demonstrate the operational efficacy of the non-blocking architecture, we must analyze the end-to-end lifecycle of a complex user operation, such as the creation of a cross-project task dependency. In a traditional synchronous system, this operation would involve complex recursive checks and multiple blocking database writes, often exceeding the typical 5-second request timeout. In Taskinator, the operation is decomposed into a series of sub-millisecond atomic steps:"),
    
    numberedRuns([run("The Synchronous Handshake: ", true), run("The user initiates a dependency link via the UI. The browser sends a createTaskLink mutation. The API Gateway validates the request and proxies it to the Workspace module.")], "n3"),
    
    numberedRuns([run("The Atomic wCTE Commit: ", true), run("The backend executes a Data-Modifying Common Table Expression. In a single database roundtrip, the system verifies the user's RBAC permissions, inserts the dependency link into the 'task_link' table, and serializes a 'TASK_LINK_CREATED' event into the 'outbox_events' table. The transaction commits, and the server immediately returns a 200 OK success status to the browser, freeing the user's thread in less than 50ms.")], "n3"),
    
    numberedRuns([run("The Reactive Outbox Wakeup: ", true), run("Simultaneous to the client receiving the success response, the PostgreSQL engine fires a pg_notify signal. The Outbox Relay, which was dormant, instantly wakes up, retrieves the pending event using a 'SKIP LOCKED' query, and publishes it to the Kafka event bus.")], "n3"),
    
    numberedRuns([run("Distributed Multi-Pipe Processing: ", true), run("Once buffered in the Kafka cluster, the event is independently and concurrently processed by multiple consumer pipelines:")], "n3"),
    
    new Paragraph({ spacing: { before: 60, after: 60 }, indent: { left: 1440 }, children: [new TextRun({ text: "\u2013 The Reachability Engine updates the Closure Table, pre-computing the transitive dependencies of the new link to ensure future O(1) path queries.", size: 22, font: F })] }),
    new Paragraph({ spacing: { before: 60, after: 60 }, indent: { left: 1440 }, children: [new TextRun({ text: "\u2013 The Smart Aggregator recalculates the 'Blocked Tasks' count for the project, updating the denormalized analytics counters.", size: 22, font: F })] }),
    new Paragraph({ spacing: { before: 60, after: 120 }, indent: { left: 1440 }, children: [new TextRun({ text: "\u2013 The Real-Time Router identifies active subscribers and pushes a targeted JSON delta over the SSE connection, resulting in an instantaneous UI update on all collaborating users' screens.", size: 22, font: F })] }),

    body("By offloading these complex side effects to the asynchronous tier, Taskinator guarantees that the user experience remains perfectly fluid, regardless of the complexity of the underlying graph operations or the current system-wide load."),
  ];
};
