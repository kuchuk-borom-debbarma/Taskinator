const { Paragraph, TextRun } = require('docx');
const { h1, h2, h3, body, numberedRuns, run, emptyLine, imgPlaceholder, figCaption, F } = require('../utils');

module.exports = function getChapter3_1() {
  return [
    // ══════════════════════════════════════════════════════════════
    // CHAPTER 3: SYSTEM ANALYSIS AND DESIGN
    // ══════════════════════════════════════════════════════════════
    h1("3. SYSTEM ANALYSIS AND DESIGN"),
    body("To achieve the goals of high throughput and extreme scalability, Taskinator follows a strict \"non-blocking\" full-stack architectural philosophy. This philosophy mandates minimizing synchronous wait times at every possible layer of the application."),

    h2("3.1 Overall System Architecture"),
    body("The overarching system architecture of Taskinator is constructed as a Modular Monolith underpinned by an Event-Driven Architecture (EDA) backbone. This hybrid approach provides the deployment simplicity and operational ease of a monolithic application while simultaneously enforcing the strict domain boundaries, loose coupling, and horizontal scalability characteristic of microservice architectures."),
    emptyLine(),
    imgPlaceholder("Figure 3.1: Full-Stack Layered Architecture and Data Flow — Taskinator"),
    figCaption("Figure 3.1: Full-Stack Layered Architecture and Data Flow — Taskinator"),
    body("The architecture is physically and logically divided into five distinct operational layers:"),
    numberedRuns([run("Layer 1 (Client Presentation): ", true), run("The React 18 Frontend, featuring the highly interactive Task Graph visualization powered by D3.js, and Apollo Client for normalized state management. It connects to the backend via HTTP POST for queries and mutations, and utilizing Server-Sent Events (SSE) for unidirectional real-time data ingestion.")], "n2"),
    numberedRuns([run("Layer 2 (API Gateway): ", true), run("The GraphQL server (Apollo Server). This layer handles JWT authentication, validates incoming JSON payloads, and resolves incoming mutations into typed backend service calls.")], "n2"),
    numberedRuns([run("Layer 3 (Application Backend Modules): ", true), run("The core Node.js application, internally subdivided into strongly cohesive domain modules (Project, Task, Team, User). It includes the Outbox Relay for reliable transactional event publishing and dedicated Kafka Consumers for asynchronous background processing.")], "n2"),
    numberedRuns([run("Layer 4 (Data Storage & Streaming): ", true), run("PostgreSQL 16 serves as the primary, persistent source of truth. Apache Kafka acts as the high-throughput, horizontally partitioned event bus bridging the synchronous mutators with the asynchronous side-effect workers.")], "n2"),
    numberedRuns([run("Layer 5 (Real-Time Routing): ", true), run("Redis Pub/Sub operates as a highly volatile, ephemeral routing table, mapping active user websocket/SSE sessions to specific backend server instances for zero-fan-out message delivery.")], "n2"),

    h3("3.1.1 End-to-End Orchestration Lifecycle"),
    body("To truly understand the power of the non-blocking architecture, we must trace a complex user operation completely through the stack. Consider the scenario where a user creates a dependency linking two existing tasks (Task A is marked as a dependency blocking Task B). The operation executes in milliseconds through the targeted event routing pipeline:"),
    numberedRuns([run("The API Request: ", true), run("The client executes a GraphQL mutation createTaskLink to link the tasks.")], "n3"),
    numberedRuns([run("Atomic Write (wCTE): ", true), run("The backend API executes a single Data-Modifying Common Table Expression (wCTE). This atomic query verifies RBAC permissions, inserts the physical link into task_link, and inserts a TASK_LINK_CREATED JSON payload into the outbox_events table simultaneously.")], "n3"),
    numberedRuns([run("Immediate HTTP Response: ", true), run("The database commits the transaction. The API instantly returns an HTTP 200 OK status to the client. The synchronous blocking path is now complete.")], "n3"),
    numberedRuns([run("Reactivity: ", true), run("Upon commit, PostgreSQL fires a pg_notify event. The idle Outbox Relay immediately wakes up and claims the newly inserted event using a SELECT ... FOR UPDATE SKIP LOCKED query.")], "n3"),
    numberedRuns([run("Partitioned Publishing: ", true), run("The relay publishes the serialized event to Kafka, partitioning the message utilizing the projectId to maintain strict causal ordering across the distributed topic.")], "n3"),
    new Paragraph({ numbering: { reference: "n3", level: 0 }, spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "Parallel Execution: ", bold: true, size: 22, font: F }), new TextRun({ text: "Once buffered in Kafka, multiple distinct consumer pipelines process the event simultaneously:", size: 22, font: F })] }),
    new Paragraph({ spacing: { before: 0, after: 60 }, indent: { left: 1440 }, children: [new TextRun({ text: "\u2013 The Smart Aggregator folds the event to update any denormalized analytics counts on the Project entity.", size: 22, font: F })] }),
    new Paragraph({ spacing: { before: 0, after: 60 }, indent: { left: 1440 }, children: [new TextRun({ text: "\u2013 The Reachability Engine reads the event, calculates the necessary graph traversals, and expands the Closure Table to allow rapid future read queries.", size: 22, font: F })] }),
    new Paragraph({ spacing: { before: 0, after: 120 }, indent: { left: 1440 }, children: [new TextRun({ text: "\u2013 The Real-Time Router queries Redis for active connections, pushing the specific payload only to the Node instances serving project stakeholders, triggering an instant UI re-render on their devices.", size: 22, font: F })] }),
  ];
};
