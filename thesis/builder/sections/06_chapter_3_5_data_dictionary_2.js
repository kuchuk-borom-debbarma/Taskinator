const { Table, WidthType } = require('docx');
const { h2, h3, body, emptyLine, tblCaption, tblHeader, tblRow, CONTENT_W, pageBreak } = require('../utils');

module.exports = function getChapter3_5() {
  return [
    h2("3.5 Data Dictionary: Graph and EDA Entities"),
    body("Beyond standard CRUD entities, the system requires specialized tables to support the Directed Acyclic Graph (DAG) structures and the Event-Driven Architecture (EDA) pipelines."),

    h3("3.5.1 Table: task_reachability"),
    body("This table functions as a Custom Closure Table, providing O(1) read access for infinite-depth DAG traversals. It specifically lacks a surrogate primary key to reduce B-Tree index bloat."),
    emptyLine(),
    tblCaption("Table 3.5.1: task_reachability Data Dictionary"),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [2000, 2000, 5026],
      rows: [
        tblHeader(["Column Name", "Data Type", "Constraints & Description"], [2000, 2000, 5026]),
        tblRow(["fk_project_id", "UUID", "NOT NULL. Bounding context for partition pruning."], [2000, 2000, 5026]),
        tblRow(["ancestor_id", "UUID", "NOT NULL. The origin node of the path."], [2000, 2000, 5026], true),
        tblRow(["descendant_id", "UUID", "NOT NULL. The destination node of the path."], [2000, 2000, 5026]),
        tblRow(["depth", "INTEGER", "NOT NULL. The number of edges (hops) between the ancestor and descendant."], [2000, 2000, 5026], true),
        tblRow(["Composite PK", "CONSTRAINT", "PRIMARY KEY (fk_project_id, ancestor_id, descendant_id). Prevents duplicate path definitions."], [2000, 2000, 5026]),
      ]
    }),
    emptyLine(),

    h3("3.5.2 Table: outbox_events"),
    body("The outbox_events table is the core of the Transactional Outbox pattern. It buffers domain events within the exact same ACID transaction as the business entity mutation."),
    emptyLine(),
    tblCaption("Table 3.5.2: outbox_events Data Dictionary"),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [2000, 2000, 5026],
      rows: [
        tblHeader(["Column Name", "Data Type", "Constraints & Description"], [2000, 2000, 5026]),
        tblRow(["seq_id", "BIGSERIAL", "PRIMARY KEY. Auto-incrementing integer guaranteeing strict chronological insert ordering."], [2000, 2000, 5026]),
        tblRow(["aggregate_id", "UUID", "NOT NULL. The ID of the mutated entity (e.g., the Task ID)."], [2000, 2000, 5026], true),
        tblRow(["event_type", "VARCHAR(100)", "NOT NULL. The domain signal (e.g., 'TASK_CREATED', 'LINK_DELETED')."], [2000, 2000, 5026]),
        tblRow(["payload", "JSONB", "NOT NULL. The serialized JSON representation of the event state."], [2000, 2000, 5026], true),
        tblRow(["status", "VARCHAR(20)", "NOT NULL. DEFAULT 'PENDING'. Used by the Relay for state tracking."], [2000, 2000, 5026]),
      ]
    }),

    pageBreak(),
  ];
};
