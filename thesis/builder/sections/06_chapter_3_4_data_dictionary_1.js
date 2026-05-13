const { Table, WidthType } = require('docx');
const { h2, h3, body, emptyLine, tblCaption, tblHeader, tblRow, CONTENT_W, pageBreak } = require('../utils');

module.exports = function getChapter3_4() {
  return [
    h2("3.4 Data Dictionary: Core Entities"),
    body("To support the high-throughput orchestration engine, the PostgreSQL schema is strictly typed. The following data dictionaries provide exhaustive documentation of the core tables, their column definitions, and the constraints employed to guarantee referential integrity at the storage layer."),

    h3("3.4.1 Table: project"),
    body("The project table represents the highest level bounding context for all operations. It utilizes strategic denormalization (storing aggregate counts) to prevent expensive read-time table scans."),
    emptyLine(),
    tblCaption("Table 3.4.1: project Data Dictionary"),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [2000, 2000, 5026],
      rows: [
        tblHeader(["Column Name", "Data Type", "Constraints & Description"], [2000, 2000, 5026]),
        tblRow(["id", "UUID", "PRIMARY KEY. System-generated UUIDv4."], [2000, 2000, 5026]),
        tblRow(["name", "VARCHAR(255)", "NOT NULL. The human-readable title of the project."], [2000, 2000, 5026], true),
        tblRow(["task_count", "INTEGER", "NOT NULL. DEFAULT 0. Denormalized total task count, updated via Smart Aggregator."], [2000, 2000, 5026]),
        tblRow(["completed_count", "INTEGER", "NOT NULL. DEFAULT 0. Denormalized count of tasks with status 'DONE'."], [2000, 2000, 5026], true),
        tblRow(["created_at", "TIMESTAMPTZ", "NOT NULL. DEFAULT NOW(). Stored in UTC."], [2000, 2000, 5026]),
        tblRow(["version", "INTEGER", "NOT NULL. DEFAULT 1. Used for Optimistic Concurrency Control (OCC)."], [2000, 2000, 5026], true),
      ]
    }),
    emptyLine(),

    h3("3.4.2 Table: project_task"),
    body("The project_task table is the central operational entity. It stores individual units of work. Crucially, it does not store strict parent-child hierarchies as foreign keys, delegating graph structure to the specialized reachability and link tables."),
    emptyLine(),
    tblCaption("Table 3.4.2: project_task Data Dictionary"),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [2000, 2000, 5026],
      rows: [
        tblHeader(["Column Name", "Data Type", "Constraints & Description"], [2000, 2000, 5026]),
        tblRow(["id", "UUID", "PRIMARY KEY. System-generated UUIDv4."], [2000, 2000, 5026]),
        tblRow(["fk_project_id", "UUID", "FOREIGN KEY references project(id) ON DELETE CASCADE. Bounding context."], [2000, 2000, 5026], true),
        tblRow(["title", "VARCHAR(500)", "NOT NULL. The descriptive title of the task."], [2000, 2000, 5026]),
        tblRow(["status", "VARCHAR(50)", "NOT NULL. Enum: 'TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED'."], [2000, 2000, 5026], true),
        tblRow(["version", "INTEGER", "NOT NULL. DEFAULT 1. Optimistic Locking version integer."], [2000, 2000, 5026]),
        tblRow(["created_at", "TIMESTAMPTZ", "NOT NULL. DEFAULT NOW(). UTC timestamp."], [2000, 2000, 5026], true),
      ]
    }),
    emptyLine(),

    h3("3.4.3 Table: task_link"),
    body("The task_link table represents the directed edges in the task graph. It is a lightweight join table that stores only direct relationships between nodes."),
    emptyLine(),
    tblCaption("Table 3.4.3: task_link Data Dictionary"),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [2000, 2000, 5026],
      rows: [
        tblHeader(["Column Name", "Data Type", "Constraints & Description"], [2000, 2000, 5026]),
        tblRow(["id", "UUID", "PRIMARY KEY. Unique edge identifier."], [2000, 2000, 5026]),
        tblRow(["source_task_id", "UUID", "FOREIGN KEY references project_task(id). The 'From' node."], [2000, 2000, 5026], true),
        tblRow(["target_task_id", "UUID", "FOREIGN KEY references project_task(id). The 'To' node."], [2000, 2000, 5026]),
        tblRow(["label", "VARCHAR(50)", "NOT NULL. User-defined relationship label (e.g., 'blocks')."], [2000, 2000, 5026], true),
      ]
    }),
    emptyLine(),

    h3("3.4.4 Table: task_reachability"),
    body("The task_reachability table is the transitive closure index. It stores all possible paths in the graph to enable O(1) connectivity checks."),
    emptyLine(),
    tblCaption("Table 3.4.4: task_reachability Data Dictionary"),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [2000, 2000, 5026],
      rows: [
        tblHeader(["Column Name", "Data Type", "Constraints & Description"], [2000, 2000, 5026]),
        tblRow(["fk_project_id", "UUID", "COMPOSITE PRIMARY KEY. Project context."], [2000, 2000, 5026]),
        tblRow(["ancestor_task_id", "UUID", "COMPOSITE PRIMARY KEY. The starting node."], [2000, 2000, 5026], true),
        tblRow(["descendant_task_id", "UUID", "COMPOSITE PRIMARY KEY. The destination node."], [2000, 2000, 5026]),
        tblRow(["min_depth", "INTEGER", "NOT NULL. The shortest distance between the nodes."], [2000, 2000, 5026], true),
      ]
    }),
    
    h3("3.4.5 Table: project_member"),
    body("The project_member table manages user access to specific projects, including their assigned roles and permissions within that context."),
    emptyLine(),
    tblCaption("Table 3.4.5: project_member Data Dictionary"),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [2000, 2000, 5026],
      rows: [
        tblHeader(["Column Name", "Data Type", "Constraints & Description"], [2000, 2000, 5026]),
        tblRow(["fk_project_id", "UUID", "COMPOSITE PK, REFERENCES project(id)."], [2000, 2000, 5026]),
        tblRow(["fk_user_id", "UUID", "COMPOSITE PK. External identity reference."], [2000, 2000, 5026], true),
        tblRow(["role", "VARCHAR(50)", "NOT NULL. Enum: 'OWNER', 'ADMIN', 'MEMBER', 'VIEWER'."], [2000, 2000, 5026]),
        tblRow(["joined_at", "TIMESTAMPTZ", "DEFAULT now(). UTC join timestamp."], [2000, 2000, 5026], true),
      ]
    }),
    emptyLine(),

    h3("3.4.6 Table: team"),
    body("Teams are organizational units that can be nested to reflect company hierarchies. Access control is inherited down the team tree."),
    emptyLine(),
    tblCaption("Table 3.4.6: team Data Dictionary"),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [2000, 2000, 5026],
      rows: [
        tblHeader(["Column Name", "Data Type", "Constraints & Description"], [2000, 2000, 5026]),
        tblRow(["id", "UUID", "PRIMARY KEY. Unique team identifier."], [2000, 2000, 5026]),
        tblRow(["name", "VARCHAR(255)", "NOT NULL. Human-readable team name."], [2000, 2000, 5026], true),
        tblRow(["parent_team_id", "UUID", "NULLABLE, REFERENCES team(id). Enables nesting."], [2000, 2000, 5026]),
        tblRow(["created_at", "TIMESTAMPTZ", "DEFAULT now()."], [2000, 2000, 5026], true),
      ]
    }),

    pageBreak(),
  ];
};
