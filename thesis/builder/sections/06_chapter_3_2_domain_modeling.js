const { h2, body, emptyLine, imgPlaceholder, figCaption, bulletRuns, run } = require('../utils');

module.exports = function getChapter3_2() {
  return [
    h2("3.2 Domain Modeling and ER Schema"),
    body("Taskinator's domain model is strictly relational, explicitly designed to support massive datasets without resorting to unstructured NoSQL patterns, ensuring rigid data integrity and referential safety."),
    emptyLine(),
    imgPlaceholder("Figure 3.2: Core Domain Entity-Relationship (ER) Model"),
    figCaption("Figure 3.2: Core Domain Entity-Relationship (ER) Model"),
    body("The core entities within the database schema are highly optimized for distinct read/write patterns:"),
    bulletRuns([run("project: ", true), run("Acts as the bounding context for almost all queries. Contains heavily denormalized integer counters (e.g., task_count, completed_task_count) to avoid expensive table scans.")], "b1"),
    bulletRuns([run("project_task: ", true), run("The central operational entity. It utilizes a materialized_path (TEXT) for flat hierarchical indexing and a version (INT) column to enforce optimistic concurrency control across distributed writes.")], "b1"),
    bulletRuns([run("task_link: ", true), run("Represents the directed edges (dependencies) between tasks. It is fundamentally distinct from the parent/child hierarchy, allowing a task to block or relate to tasks located anywhere else within the overarching project graph.")], "b1"),
    bulletRuns([run("task_reachability: ", true), run("The transitive closure index mapping every ancestor task to every descendant task. It deliberately operates without a surrogate primary key to reduce index bloat, utilizing a composite key of (fk_project_id, ancestor_task_id, descendant_task_id).")], "b1"),
    bulletRuns([run("outbox_events: ", true), run("The ephemeral transactional log table responsible for bridging ACID database transactions with the eventual consistency of the Kafka event bus.")], "b1"),
  ];
};
