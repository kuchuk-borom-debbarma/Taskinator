const { Paragraph, TextRun, Table, WidthType } = require('docx');
const { h1, h2, body, emptyLine, tblHeader, tblRow, tblCaption, CONTENT_W } = require('../utils');

module.exports = function getAppendix() {
  return [
    h1("APPENDICES"),

    h2("Appendix A: Glossary of Terms"),
    body("This appendix provides a quick reference for the technical terminology used throughout the thesis."),
    emptyLine(),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [2000, 7026],
      rows: [
        tblHeader(["Term", "Definition"], [2000, 7026]),
        tblRow(["ACID", "Atomicity, Consistency, Isolation, Durability - A set of properties that guarantee database transactions are processed reliably."], [2000, 7026]),
        tblRow(["DAG", "Directed Acyclic Graph - A mathematical structure consisting of nodes and directed edges with no cycles."], [2000, 7026], true),
        tblRow(["EDA", "Event-Driven Architecture - A software architecture pattern promoting the production, detection, and consumption of events."], [2000, 7026]),
        tblRow(["JWT", "JSON Web Token - An open standard for securely transmitting information between parties as a JSON object."], [2000, 7026], true),
        tblRow(["RPS", "Requests Per Second - A common metric for measuring the throughput of a system."], [2000, 7026]),
        tblRow(["wCTE", "Writeable Common Table Expression - A PostgreSQL feature that allows performing data-modifying operations within a CTE."], [2000, 7026], true),
        tblRow(["SSE", "Server-Sent Events - A technology enabling servers to push real-time notifications to web pages over HTTP."], [2000, 7026]),
      ]
    }),

    h2("Appendix B: Configuration Snippets"),
    body("Representative configuration snippets for the Taskinator infrastructure backbone."),
    emptyLine(),
    body("Kafka Topic Configuration:"),
    body("Topic: project_events, Partitions: 12, Replication Factor: 3, Cleanup Policy: Delete, Retention: 168h"),
    emptyLine(),
    body("Redis Routing Table Schema:"),
    body("Key: project:routing:<projectId>, Type: SET, Members: <podIp>:<port>"),
  ];
};
