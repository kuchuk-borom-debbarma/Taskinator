const { h2, h3, body, emptyLine, insertImage, figCaption, bulletRuns, run } = require('../utils');

module.exports = function getChapter3_2() {
  return [
    h2("3.2 Domain Modeling and ER Schema: Structural Foundations"),
    body("The conceptual heart of the Taskinator platform is its domain model—a strictly relational, highly normalized schema engineered to maintain absolute referential integrity while supporting the high-velocity data ingestion patterns required of an enterprise orchestration engine. Unlike unstructured NoSQL approaches, which often sacrifice schema safety for write performance, Taskinator leverages the mature indexing and constraint-enforcement features of PostgreSQL to ensure that the system remains a 'Source of Truth' for all project-related metadata."),
    emptyLine(),
    insertImage("diagram_erd_full.png"),
    figCaption("Figure 3.2: Comprehensive Domain Entity-Relationship (ER) Diagram"),
    
    h3("3.2.1 Entity Decomposition and Responsibility Mapping"),
    body("The core entities within the database schema are meticulously partitioned to optimize for distinct read and write workloads, ensuring that high-frequency updates to individual tasks do not impede the performance of high-level project reporting:"),
    
    bulletRuns([run("Project Context (the Root Entity): ", true), run("The 'project' table serves as the primary bounding context for nearly 95% of all database queries. It encapsulates high-level metadata and, crucially, hosts heavily denormalized integer counters (e.g., task_count, completion_percentage). These counters are updated via asynchronous delta processing, enabling O(1) performance for project-wide analytics dashboards.")], "b1"),
    
    bulletRuns([run("Project Task (the Operational Unit): ", true), run("The 'project_task' table is the most frequently mutated entity in the system. It is designed for 'Surgical Writes', where individual fields (status, title) can be updated with minimal row-level locking. It incorporates a 'version' column for Optimistic Concurrency Control, ensuring that distributed actors never inadvertently overwrite each other's changes.")], "b1"),
    
    bulletRuns([run("Task Link (the Topological Adjacency List): ", true), run("The 'task_link' table persists the directed edges that constitute the project's dependency graph. By separating topological links from the task entity itself, Taskinator allows for a highly flexible Directed Acyclic Graph (DAG) structure, where tasks can have multiple parents or block multiple descendants without modifying the central task record.")], "b1"),
    
    bulletRuns([run("Task Reachability (the Transitive Closure Index): ", true), run("As discussed in Chapter 3.3, this table provides the pre-computed path matrix for the entire project graph. To minimize storage overhead and index bloat, it utilizes a compact composite primary key consisting of (fk_project_id, ancestor_id, descendant_id), allowing for extremely high-speed path verification and neighbor discovery.")], "b1"),
    
    bulletRuns([run("Outbox Events (the Transactional Buffer): ", true), run("The 'outbox_events' table acts as the critical bridge between the synchronous relational world and the asynchronous event bus. Every business mutation is accompanied by a row insertion into this table within the same ACID transaction, guaranteeing that an event notification is never lost or duplicated during a system crash.")], "b1"),

    h3("3.2.2 Normalization vs. Performance Trade-offs"),
    body("While the system adheres to Third Normal Form (3NF) for core domain entities to prevent data anomalies, it strategically introduces denormalized 'Aggregate Shards' in the Project and Team tables. This selective denormalization is the key to maintaining extreme performance; it allows the system to serve complex, high-level summary views (which are read-intensive) without performing expensive JOIN or COUNT operations across millions of rows at runtime. These denormalized fields are eventually consistent, with the synchronization lag typically remaining under 250ms."),
  ];
};
