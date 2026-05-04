const { h1, h2, h3, body, emptyLine, imgPlaceholder, figCaption, codeLine, pageBreak } = require('../utils');

module.exports = function getChapter4_1() {
  return [
    h1("4. EVENT-DRIVEN PIPELINE (EDA) IMPLEMENTATION"),
    body("The foundational backbone of Taskinator is its highly tuned Event-Driven Architecture (EDA). This architecture rejects synchronous side-effect processing entirely, instead utilizing pervasive batching strategies that begin all the way upstream at the producer level and carry through to the downstream consumers. The primary motivation for this architecture is to decouple fast, optimistic writes from expensive, blocking reads and analytics updates."),

    h2("4.1 The Transactional Outbox Pattern & wCTE"),
    body("A classic, well-documented failure mode in distributed systems occurs when a database transaction successfully commits, but the application Node.js process crashes milliseconds before publishing the resulting domain event to Apache Kafka. This creates a ghost state: the data exists in the database, but downstream systems (analytics, search indexing, real-time UIs) are completely unaware, leaving the system permanently inconsistent."),
    body("To completely eradicate this dual-write problem, Taskinator utilizes the Transactional Outbox Pattern. This guarantees absolute atomic writes: the business entity mutation and the domain event emission are committed to the same exact SQL database simultaneously. If either fails, the entire transaction rolls back."),
    emptyLine(),
    imgPlaceholder("Figure 4.1: Transactional Outbox Workflow using wCTE"),
    figCaption("Figure 4.1: Transactional Outbox Workflow using wCTE"),
    
    h3("4.1.1 Eliminating Multi-Statement Overhead with Data-Modifying CTEs"),
    body("While traditional Outbox implementations execute multiple sequential SQL statements (e.g., BEGIN, INSERT INTO entities, INSERT INTO outbox, COMMIT), this approach is fundamentally slow. It requires multiple network round-trips between the Node.js application server and the PostgreSQL database engine, increasing the total duration of the transaction lock."),
    body("Taskinator optimizes this by exclusively utilizing PostgreSQL's Data-Modifying Common Table Expressions (wCTE). A single SQL query is compiled using Kysely and sent to the database. This query uses WITH clauses to insert the business data and immediately insert the serialized JSON payload into the outbox_events table simultaneously, entirely within the database engine's execution planner:"),
    codeLine("WITH inserted_task AS (", 120),
    codeLine("  INSERT INTO project_task (id, fk_project_id, title, status, version)"),
    codeLine("  VALUES ($1, $2, $3, $4, 1)"),
    codeLine("  RETURNING *"),
    codeLine("),"),
    codeLine("inserted_event AS ("),
    codeLine("  INSERT INTO outbox_events (aggregate_id, event_type, payload)"),
    codeLine("  VALUES ("),
    codeLine("    (SELECT id FROM inserted_task),"),
    codeLine("    'TASK_CREATED',"),
    codeLine("    jsonb_build_object('id', (SELECT id FROM inserted_task), 'status', $4)"),
    codeLine("  )"),
    codeLine(")"),
    codeLine("SELECT * FROM inserted_task;", 0, 120),
    body("This pattern ensures that network latency is incurred only once per HTTP request. The database engine executes the statements atomically in memory before writing to the write-ahead log (WAL). If a constraint is violated on the outbox table, the task insertion is cleanly aborted, and the application receives an immediate rejection. This single-trip architecture is a crucial factor in achieving the target of 10,000 RPS, as it drastically reduces connection pool exhaustion on the PgBouncer layer."),
  ];
};
