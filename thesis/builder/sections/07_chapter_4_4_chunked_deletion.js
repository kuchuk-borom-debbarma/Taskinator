const { h2, h3, body, emptyLine, imgPlaceholder, figCaption, pageBreak } = require('../utils');

module.exports = function getChapter4_4() {
  return [
    h2("4.4 Chunked Self-Signaling Deletion (The Bubbling Effect)"),
    body("In hierarchical systems, deleting a root node that possesses 50,000 descendants via a synchronous SQL ON DELETE CASCADE command is computationally disastrous. A standard RDBMS will acquire an exclusive table lock or massive row locks, traversing the foreign key relationships to verify constraints and delete every single child row within a single, massive transaction. This operation can take several seconds to execute. During this window, the database is severely restricted; concurrent operations from other users are blocked, and transaction queues rapidly hit their maximum capacity, resulting in widespread 503 Service Unavailable errors across the entire application."),
    body("Taskinator completely circumvents this bottleneck by implementing a specialized architectural pattern termed \"Declarative Signalling and Self-Chunking.\", colloquially referred to as \"The Bubbling Effect\"."),
    emptyLine(),
    imgPlaceholder("Figure 4.4: Chunked Self-Signaling Deletion (\"The Bubbling Effect\")"),
    figCaption("Figure 4.4: Chunked Self-Signaling Deletion (\"The Bubbling Effect\")"),
    
    h3("4.4.1 The Declarative Signal"),
    body("When an authenticated user requests the deletion of a massive project, the primary API gateway does not execute a SQL DELETE query against the tasks table. Instead, it merely updates the project's status column to 'DELETING' and emits a declarative signal event (PROJECT_DELETED) into the Transactional Outbox. The HTTP request is then immediately resolved, and the user receives a 202 Accepted response in less than 50 milliseconds."),
    
    h3("4.4.2 Bounded Transaction Chunks"),
    body("A specialized asynchronous Background Listener, operating as a distinct Kafka consumer group, receives the PROJECT_DELETED signal. Rather than executing a blind delete, the Listener executes a strictly bounded query using explicit SQL LIMIT parameters: SELECT id FROM project_task WHERE fk_project_id = X LIMIT 2000. It then proceeds to delete exclusively those 2000 specific rows within a heavily constrained transaction."),
    body("By enforcing a strict upper bound of 2000 rows, the maximum continuous duration of the database lock never exceeds 10 to 15 milliseconds. After the chunk is purged, the transaction commits, instantly releasing all locks back to the connection pool. This microscopic lock duration guarantees that concurrent HTTP requests from other active users can seamlessly interleave between the deletion chunks, experiencing zero noticeable latency degradation."),
    
    h3("4.4.3 Recursive Bubbling"),
    body("After the first chunk of 2000 rows is successfully deleted, the Listener checks if the operation is complete. If the initial SELECT query returned exactly 2000 rows, there is a high statistical probability that further descendant rows remain in the database. To address this without locking the thread in a synchronous loop, the Listener deliberately emits a new, identical self-signal (PROJECT_DELETED) back into the outbox."),
    body("This signal propagates through Kafka, eventually re-triggering the Listener a few milliseconds later. The process repeats recursively—\"bubbling\" through the message queue—until a SELECT ... LIMIT 2000 query returns 0 rows. At this point, the mathematical certainty of complete deletion is achieved, the recursive loop terminates, and the parent project record is safely hard-deleted. This pattern represents a fundamental paradigm shift from optimistic database locking to asynchronous, bounded chunk management, proving critical for achieving multi-tenant enterprise scalability."),
    
    pageBreak(),
  ];
};
