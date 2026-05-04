const { Table, WidthType } = require('docx');
const { h2, h3, body, emptyLine, tblCaption, tblHeader, tblRow, CONTENT_W, pageBreak } = require('../utils');

module.exports = function getChapter3_7() {
  return [
    h2("3.7 GraphQL API Contracts: Mutations"),
    body("Mutations in Taskinator are responsible for executing the wCTE atomic transactions. They do not wait for background tasks to complete, ensuring the synchronous execution path remains under 50ms."),

    h3("3.7.1 Mutation: createTaskLink"),
    body("Establishes a directed dependency (edge) between two existing tasks. Internally checks for cyclical references against the closure table before allowing the insertion."),
    emptyLine(),
    tblCaption("Table 3.7.1: createTaskLink API Contract"),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [2000, 2000, 5026],
      rows: [
        tblHeader(["Argument / Field", "GraphQL Type", "Description"], [2000, 2000, 5026]),
        tblRow(["Input: parentId", "ID!", "The UUID of the blocking task."], [2000, 2000, 5026]),
        tblRow(["Input: childId", "ID!", "The UUID of the blocked task."], [2000, 2000, 5026], true),
        tblRow(["Return", "TaskLink!", "The resolved edge object."], [2000, 2000, 5026]),
        tblRow(["Side Effects", "Kafka Event", "Emits LINK_CREATED. Triggers Reachability Engine cross-join."], [2000, 2000, 5026], true),
      ]
    }),
    emptyLine(),

    h3("3.7.2 Mutation: deleteTaskChunked"),
    body("Initiates the Chunked Self-Signaling 'Bubbling' deletion process. It does not perform the actual deletion synchronously; it only updates the state and fires the initial signal."),
    emptyLine(),
    tblCaption("Table 3.7.2: deleteTaskChunked API Contract"),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [2000, 2000, 5026],
      rows: [
        tblHeader(["Argument / Field", "GraphQL Type", "Description"], [2000, 2000, 5026]),
        tblRow(["Input: taskId", "ID!", "The root task to be deleted."], [2000, 2000, 5026]),
        tblRow(["Return", "Boolean!", "Always returns true if the signal was successfully queued."], [2000, 2000, 5026], true),
        tblRow(["Latency", "< 50ms", "Bypasses all PostgreSQL CASCADE locking mechanisms."], [2000, 2000, 5026]),
      ]
    }),

    pageBreak(),
  ];
};
