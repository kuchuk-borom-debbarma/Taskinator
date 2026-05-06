const { Table, WidthType } = require('docx');
const { h1, h2, h3, body, emptyLine, insertImage, figCaption, tblHeader, tblRow, tblCaption, CONTENT_W } = require('../utils');

module.exports = function getChapter9() {
  return [
    h1("9. COMPARATIVE ARCHITECTURAL ANALYSIS"),
    body("To contextualize the contributions of Taskinator, this chapter provides a comparative analysis of its architecture against industry-standard project management platforms, focusing on their handling of task hierarchies and real-time synchronization."),

    h2("9.1 Taskinator vs. Jira (Atlassian)"),
    body("Jira is a highly mature platform that primarily utilizes a relational database (typically PostgreSQL or SQL Server) with a synchronous processing model. While Jira supports hierarchical tasks (Epics, Stories, Sub-tasks), these hierarchies are strictly bounded and often require complex JQL (Jira Query Language) searches for path traversal. Taskinator's use of a pre-computed Transitive Closure Index (Reachability Engine) allows for far more flexible and performant graph traversals compared to Jira's traditional parent-pointer model."),

    h2("9.2 Taskinator vs. Trello (Atlassian)"),
    body("Trello utilizes a flat 'Board and Card' model, which is highly intuitive but fundamentally limited in its ability to handle complex dependencies and nested workflows. Trello's real-time updates are powered by WebSockets, which work well for its relatively small state payloads. However, Taskinator's 'Semantic Folding' and 'Targeted SSE Routing' are specifically designed to handle the 'Event Storms' that occur in massive enterprise graphs, a scenario where Trello's flat broadcast model would struggle."),

    h2("9.3 Taskinator vs. Linear"),
    body("Linear is a modern project management tool that emphasizes speed and a high-quality user experience. Linear utilizes an 'Offline-First' architecture where a significant portion of the application state is synced to the client's local IndexedDB. While Taskinator also prioritizes client-side cache reconciliation (via Apollo), it focuses more on the 'Server-Side Throughput' and 'Atomic Outbox Reliability' needed for 10k RPS scenarios, whereas Linear is optimized for the latency of individual user interactions."),

    emptyLine(),
    tblCaption("Table 9.1: Architectural Comparison Matrix"),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [2000, 2000, 2000, 3026],
      rows: [
        tblHeader(["Feature", "Jira", "Trello", "Taskinator"], [2000, 2000, 2000, 3026]),
        tblRow(["Primary Hierarchy", "Strict 3-Level", "Flat/Lists", "Infinite DAG"], [2000, 2000, 2000, 3026]),
        tblRow(["Real-Time Mechanism", "WebSockets/Polling", "WebSockets", "SSE + Targeted Redis"], [2000, 2000, 2000, 3026], true),
        tblRow(["Consistency Model", "Strong (Blocking)", "Eventual", "Eventual (Non-Blocking)"], [2000, 2000, 2000, 3026]),
        tblRow(["Scaling Target", "Enterprise/Stable", "Consumer/SME", "High-Throughput/Reactive"], [2000, 2000, 2000, 3026], true),
      ]
    }),
  ];
};
