const { h2, h3, body, emptyLine, insertImage, figCaption, pageBreak, codeLine } = require('../utils');

module.exports = function getChapter5_4() {
  return [
    h2("5.4 Optimistic Concurrency Control (OCC)"),
    body("In a high-throughput, highly concurrent system operating at 10,000 RPS, multiple network clients will inevitably attempt to mutate the exact same database row simultaneously. For example, two project managers might attempt to update the metadata of 'Task 99' at the exact same millisecond."),
    
    emptyLine(),
    insertImage("diagram_optimistic_locking.png"),
    figCaption("Figure 5.4: Optimistic Concurrency Control Execution Flow"),
    
    h3("5.4.1 The Danger of Pessimistic Locking"),
    body("Traditional RDBMS engineering solves concurrency utilizing Pessimistic Locking via the SELECT ... FOR UPDATE syntax. This instructs PostgreSQL to acquire an exclusive row-level lock on the disk. While safe, this is disastrous for throughput. If Transaction A locks a row, Transaction B is completely suspended by the kernel until A commits. This leads to connection pool starvation, spiraling latency, and eventual cascading failure across the microservice cluster."),
    
    h3("5.4.2 The Version Vector Pattern"),
    body("Taskinator rejects Pessimistic Locking in favor of Optimistic Concurrency Control (OCC). Every primary entity in the database (Tasks, Projects, Teams) includes an integer version column. The system assumes that conflicts are rare and does not acquire any preliminary locks."),
    body("When a client fetches a task, it receives the data alongside the current version (e.g., version = 5). When the client issues an update mutation, it must pass this version back to the server. The SQL update is then strictly bounded by this integer:"),
    codeLine("UPDATE project_task"),
    codeLine("SET status = 'DONE', version = version + 1"),
    codeLine("WHERE id = 'Task-99' AND version = 5;"),
    body("If the other manager updated the task a millisecond prior, the database version would now be 6. The subsequent UPDATE query will gracefully affect exactly 0 rows. The PostgreSQL driver detects this, the application immediately throws a 409 Conflict exception, and the client application prompts the user to refresh the stale UI. This guarantees absolute data integrity without ever blocking concurrent read or write threads."),
    
    pageBreak(),
  ];
};
