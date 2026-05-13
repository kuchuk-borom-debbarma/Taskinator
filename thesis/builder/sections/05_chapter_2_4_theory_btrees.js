const { h2, h3, body, pageBreak } = require('../utils');

module.exports = function getChapter2_4() {
  return [
    h2("2.4 Concurrency Models and B-Tree Index Contention"),
    body("To understand the necessity of advanced Event-Driven Architectures (EDA) and the Transactional Outbox pattern, one must first analyze the internal mechanics of Relational Database Management Systems (RDBMS) under high concurrency."),
    
    h3("2.4.1 The B-Tree Indexing Mechanism"),
    body("PostgreSQL, like most relational databases, utilizes B-Tree (Balanced Tree) data structures to maintain indexes on primary and foreign keys. The B-Tree guarantees O(log N) search, insertion, and deletion times. However, this mathematical guarantee assumes that the tree operations are occurring sequentially."),
    body("In a high-throughput environment (e.g., 10,000 RPS), thousands of threads are attempting to insert new rows simultaneously. Every insertion requires the database engine to traverse the B-Tree and write the new index leaf node. If the tree becomes unbalanced, the engine must perform a 'Page Split' operation, physically reallocating data across the disk blocks."),
    
    h3("2.4.2 Row-Level Locks and Deadlocks"),
    body("During a Page Split, or when multiple threads attempt to update records that reside on the same physical disk page, PostgreSQL must acquire highly restrictive latches (lightweight memory locks). If multiple application pods are polling a single queue table simultaneously (the Thundering Herd scenario), they inevitably attempt to lock the same index pages."),
    body("This contention causes CPU context switching to skyrocket. More critically, if Thread A locks Row 1 and needs Row 2, while Thread B locks Row 2 and needs Row 1, a classic Deadlock occurs. The database engine is forced to arbitrarily terminate one of the transactions, resulting in a 500 Internal Server Error returned to the client."),
    body("Taskinator's usage of the SKIP LOCKED directive fundamentally alters this interaction. By instructing the query planner to instantly bypass any rows that currently hold a lock, the system entirely avoids the queueing and waiting phases. Threads never compete for the same B-Tree leaf nodes concurrently, allowing the database engine to process writes in parallel without triggering catastrophic deadlocks. This deep understanding of storage layer internals is what allows the Node.js application layer to scale horizontally without overwhelming the persistence layer."),

    pageBreak(),
  ];
};
