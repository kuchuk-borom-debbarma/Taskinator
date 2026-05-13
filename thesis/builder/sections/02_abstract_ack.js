const { Paragraph, TextRun } = require('docx');
const { emptyLine, centeredBold, body, pageBreak, F } = require('../utils');

module.exports = function getAbstractAndAck() {
  return [
    // ══════════════════════════════════════════════════════════════
    // ABSTRACT
    // ══════════════════════════════════════════════════════════════
    centeredBold("ABSTRACT", 26),
    emptyLine(),
    body("The demand for highly performant project management tools has grown exponentially as modern enterprises manage complex, deeply nested workflows. Traditional task management applications rely on strictly normalized database schemas and synchronous APIs that struggle to scale when subjected to massive task hierarchies, real-time synchronization demands, and high-frequency event triggers."),
    body('This thesis presents the design, implementation, and performance evaluation of "Taskinator," a full-stack project and task management application engineered for extreme scalability and real-time responsiveness. The system integrates a modern, interactive React-based frontend featuring a dynamic Task Graph visualization with a high-performance, event-driven Node.js backend.'),
    body("The core contribution is a comprehensive architectural framework capable of sustaining 10,000 Requests Per Second (RPS) without sacrificing data integrity. This is achieved through optimizations across three primary layers: (1) at the Database Layer, a Custom Closure Table pattern (Task Reachability Engine) for ultra-fast querying of infinite task hierarchies, combined with Optimistic Locking to prevent distributed race conditions; (2) at the Event-Driven Architecture (EDA) Layer, a Transactional Outbox pattern powered by atomic Data-Modifying Common Table Expressions (wCTE), with reactive PostgreSQL LISTEN/NOTIFY mechanics and SKIP LOCKED concurrency controls ensuring zero-loss event publishing across horizontally scaled pods; (3) at the Consumer Layer, a Smart Batch Aggregator performs strict chronological sorting and semantic event folding to trim down batches into net deltas, drastically reducing database write amplification and preventing infinite recursive loops."),
    body("Crucially, this thesis explores the necessary architectural trade-offs required to achieve this scale, specifically analyzing the drawbacks of Eventual Consistency. To maintain high read-throughput, the system employs aggressive Denormalization strategies for aggregate counts and user metadata. Real-time client updates are achieved via a zero-fan-out targeted routing mechanism using Redis and Server-Sent Events (SSE), directly intercepted by the Apollo GraphQL cache for instant UI reconciliation."),
    body("Experimental evaluations demonstrate that the application's asynchronous, batch-first processing model—including chunked self-signaling recursive deletions—successfully eliminates long-transaction database locks. The proposed architecture proves that by combining strict data access patterns, reactive frontend visualization, and a highly tuned event-driven backend, complex orchestration tools can achieve extreme scalability."),

    pageBreak(),

    // ══════════════════════════════════════════════════════════════
    // ACKNOWLEDGEMENT
    // ══════════════════════════════════════════════════════════════
    centeredBold("ACKNOWLEDGEMENT", 26),
    emptyLine(),
    body("I would like to express my special thanks of gratitude to my guide Dr. Abhijit Biswas for his able guidance and support in completing the project. A special thanks to the university administration, including the Principal, HOD, and Dean, for providing us with the necessary resources and opportunities to gain knowledge."),
    body("I would also like to thank God for giving me the strength and capability to complete this project. Finally, I extend my sincere thanks to my family, friends, and the entire ICFAI family for their continuous support."),
    emptyLine(),
    new Paragraph({ spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "Name: ", bold: true, size: 22, font: F }), new TextRun({ text: "Kuchuk Borom Debbarma", size: 22, font: F })] }),
    new Paragraph({ spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "Course: ", bold: true, size: 22, font: F }), new TextRun({ text: "M.Tech CSE", size: 22, font: F })] }),

    pageBreak(),
  ];
};
