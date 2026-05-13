const { h2, h3, body, emptyLine, insertImage, figCaption, codeLine, pageBreak } = require('../utils');

module.exports = function getChapter4_6() {
  return [
    h2("4.6 PostgreSQL Driver Optimizations at 10,000 RPS"),
    body("Achieving 10,000 Requests Per Second (RPS) requires optimizations that extend far beyond application-level caching or standard database indexing. At extreme throughputs, the actual Transmission Control Protocol (TCP) overhead of the database driver communicating with the PostgreSQL connection pool becomes the primary bottleneck."),
    
    emptyLine(),
    insertImage("diagram_pg_driver_batching.png"),
    figCaption("Figure 4.6: Database Driver Multi-Insert Packet Batching"),
    
    h3("4.6.1 The TCP Packet Problem"),
    body("When a Node.js application needs to insert 100 domain events into an outbox table, the naive approach is to loop over the array and execute 100 individual INSERT INTO queries using an ORM. Even if these queries are executed concurrently using Promise.all(), the underlying pg driver will open 100 independent TCP connections (or rapidly cycle the connection pool), sending 100 distinct network packets to the database server. PostgreSQL must then parse the Abstract Syntax Tree (AST) of the query 100 times, acquire locks 100 times, and reply with 100 network ACKs."),
    body("This completely saturates the networking layer, causing severe CPU spikes on both the application nodes and the database kernel."),
    
    h3("4.6.2 reWriteBatchedInserts and resultedValues"),
    body("Taskinator utilizes specialized driver configurations, specifically the reWriteBatchedInserts=true parameter natively supported by advanced PostgreSQL JDBC and Node.js drivers. Instead of emitting individual queries, the driver intercepts the batch and dynamically rewrites the SQL string in memory into a single, massive VALUES clause:"),
    codeLine("INSERT INTO outbox_events (id, payload) VALUES"),
    codeLine("  (uuid(), '{\"key\": \"val1\"}'),"),
    codeLine("  (uuid(), '{\"key\": \"val2\"}'),"),
    codeLine("  ... (up to 1,000 rows);"),
    body("This reduces the network IO from 1,000 TCP roundtrips to exactly 1. The PostgreSQL engine parses the AST once and writes the data to the B-Tree index sequentially, maximizing disk IOPS. To retrieve the auto-generated primary keys without executing a secondary SELECT, the driver leverages the native RETURNING clause, mapping the resulting UUIDs back to the in-memory array using the resultedValues property. This combination of techniques is mandatory to prevent connection pool exhaustion at scale."),

    pageBreak(),
  ];
};
