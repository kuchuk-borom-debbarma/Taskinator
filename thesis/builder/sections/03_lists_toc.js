const { centeredBold, emptyLine, tocEntry, pageBreak } = require('../utils');

module.exports = function getListsAndTOC() {
  return [
    // ══════════════════════════════════════════════════════════════
    // LIST OF FIGURES
    // ══════════════════════════════════════════════════════════════
    centeredBold("List of Figures", 24),
    emptyLine(),
    tocEntry("Figure 3.1: Full-Stack Layered Architecture and Data Flow — Taskinator", "14"),
    tocEntry("Figure 3.2: Core Domain Entity-Relationship (ER) Model", "17"),
    tocEntry("Figure 3.3: Task Reachability Engine — Closure Table Cross-Join Expansion", "19"),
    tocEntry("Figure 4.1: Transactional Outbox Workflow using wCTE", "23"),
    tocEntry("Figure 4.2: Concurrent Outbox Polling: Mitigating the Thundering Herd with SKIP LOCKED", "26"),
    tocEntry("Figure 4.3: Smart Batch Aggregator Data Flow and Semantic Folding", "28"),
    tocEntry("Figure 4.4: Chunked Self-Signaling Deletion (\"The Bubbling Effect\")", "31"),
    tocEntry("Figure 5.1: Targeted Redis Routing for Real-time Server-Sent Events (SSE)", "34"),
    tocEntry("Figure 5.2: Apollo Client SSE State Reconciliation Sequence", "36"),
    tocEntry("Figure 6.1: Automation Trigger Engine and System Actor Flow", "39"),
    tocEntry("Figure 6.2: Containerized Testing Architecture and Mutation Testing", "41"),
    emptyLine(),

    // ══════════════════════════════════════════════════════════════
    // LIST OF TABLES
    // ══════════════════════════════════════════════════════════════
    centeredBold("List of Tables", 24),
    emptyLine(),
    tocEntry("Table 6.1: Performance Metrics at 10,000 RPS", "43"),
    tocEntry("Table 6.2: Chunked vs Unbounded Deletion Benchmarks", "45"),

    pageBreak(),

    // ══════════════════════════════════════════════════════════════
    // TABLE OF CONTENTS
    // ══════════════════════════════════════════════════════════════
    centeredBold("Table of Contents", 24),
    emptyLine(),
    tocEntry("1. INTRODUCTION", "6"),
    tocEntry("1.1 Problem Definition", "6", 360),
    tocEntry("1.2 Project Overview", "7", 360),
    tocEntry("1.3 Hardware Specification", "9", 360),
    tocEntry("1.4 Software Specification", "10", 360),
    tocEntry("2. LITERATURE SURVEY", "13"),
    tocEntry("2.1 Research Gaps in Workflow Orchestration", "13", 360),
    tocEntry("2.2 Summary of Literature Review", "15", 360),
    tocEntry("3. SYSTEM ANALYSIS AND DESIGN", "19"),
    tocEntry("3.1 Overall System Architecture", "19", 360),
    tocEntry("3.2 Domain Modeling and ER Schema", "22", 360),
    tocEntry("3.3 Database Optimization & Denormalization", "24", 360),
    tocEntry("4. EVENT-DRIVEN PIPELINE (EDA) IMPLEMENTATION", "28"),
    tocEntry("4.1 The Transactional Outbox Pattern & wCTE", "28", 360),
    tocEntry("4.2 Concurrent Outbox Relays: Mitigating the Thundering Herd", "31", 360),
    tocEntry("4.3 Smart Batch Aggregation & Semantic Folding", "33", 360),
    tocEntry("4.4 Chunked Self-Signaling Deletion (The Bubbling Effect)", "36", 360),
    tocEntry("5. FRONTEND ARCHITECTURE AND REAL-TIME SYNCHRONIZATION", "38"),
    tocEntry("5.1 The React Task Graph and D3.js Visualization", "38", 360),
    tocEntry("5.2 Zero-Fan-Out Targeted Routing via Redis", "39", 360),
    tocEntry("5.3 Apollo Client Cache Reconciliation", "41", 360),
    tocEntry("6. IMPLEMENTATION, AUTOMATION, AND TESTING", "43"),
    tocEntry("6.1 Automation and Trigger Engine", "43", 360),
    tocEntry("6.2 Testing Methodology", "45", 360),
    tocEntry("6.3 Performance Analysis and Metrics", "47", 360),
    tocEntry("7. CONCLUSION AND FUTURE WORK", "51"),
    tocEntry("7.1 Conclusion", "51", 360),
    tocEntry("7.2 Future Work", "52", 360),
    tocEntry("REFERENCES", "53"),

    pageBreak(),
  ];
};
