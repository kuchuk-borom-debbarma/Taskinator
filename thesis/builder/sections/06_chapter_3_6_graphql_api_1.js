const { Table, WidthType } = require('docx');
const { h2, h3, body, emptyLine, tblCaption, tblHeader, tblRow, CONTENT_W, pageBreak } = require('../utils');

module.exports = function getChapter3_6() {
  return [
    h2("3.6 GraphQL API Contracts: Queries"),
    body("The system architecture exposes data exclusively through a strongly-typed GraphQL Gateway (Apollo Server). This abstraction layer shields the internal relational database schema from the frontend React clients, allowing for independent API versioning and precise payload fetching."),

    h3("3.6.1 Query: getProject"),
    body("Retrieves a specific project and its aggregated metadata. Uses DataLoader under the hood to batch requests if queried concurrently."),
    emptyLine(),
    tblCaption("Table 3.6.1: getProject API Contract"),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [2000, 2000, 5026],
      rows: [
        tblHeader(["Argument / Field", "GraphQL Type", "Description"], [2000, 2000, 5026]),
        tblRow(["Input: id", "ID!", "The UUID of the project to retrieve."], [2000, 2000, 5026]),
        tblRow(["Return", "Project", "The resolved Project object."], [2000, 2000, 5026], true),
        tblRow(["Auth Required", "Boolean", "Yes. User must have an active JWT and Project Membership."], [2000, 2000, 5026]),
      ]
    }),
    emptyLine(),

    h3("3.6.2 Query: getTaskGraph"),
    body("The most critical read query in the application. It retrieves the entire DAG structure for a project in a single database round-trip by querying the task_reachability closure table, mapping the edges into memory, and constructing nested DTOs (Data Transfer Objects) for the D3.js visualization engine."),
    emptyLine(),
    tblCaption("Table 3.6.2: getTaskGraph API Contract"),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [2000, 2000, 5026],
      rows: [
        tblHeader(["Argument / Field", "GraphQL Type", "Description"], [2000, 2000, 5026]),
        tblRow(["Input: projectId", "ID!", "The bounding project context."], [2000, 2000, 5026]),
        tblRow(["Return", "[ProjectTask!]!", "An array of localized Task nodes, enriched with parent/child edge IDs."], [2000, 2000, 5026], true),
        tblRow(["Performance", "O(1) DB Read", "Returns instantly regardless of tree depth due to the Custom Closure index."], [2000, 2000, 5026]),
      ]
    }),

    h3("3.6.3 Query: getMe"),
    body("Retrieves the authenticated user's profile and their global role assignments."),
    emptyLine(),
    tblCaption("Table 3.6.3: getMe API Contract"),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [2000, 2000, 5026],
      rows: [
        tblHeader(["Field", "GraphQL Type", "Description"], [2000, 2000, 5026]),
        tblRow(["id", "ID!", "The unique user identifier."], [2000, 2000, 5026]),
        tblRow(["email", "String!", "The user's verified email address."], [2000, 2000, 5026], true),
        tblRow(["projects", "[Project!]", "List of projects the user is a member of."], [2000, 2000, 5026]),
      ]
    }),
    emptyLine(),

    h3("3.6.4 Query: getTeamTree"),
    body("Retrieves the nested hierarchy of teams for the organization. Uses a recursive resolver with a depth limit of 10 to prevent DoS attacks."),
    emptyLine(),
    tblCaption("Table 3.6.4: getTeamTree API Contract"),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [2000, 2000, 5026],
      rows: [
        tblHeader(["Field", "GraphQL Type", "Description"], [2000, 2000, 5026]),
        tblRow(["id", "ID!", "The unique team identifier."], [2000, 2000, 5026]),
        tblRow(["name", "String!", "The team name."], [2000, 2000, 5026], true),
        tblRow(["children", "[Team!]", "Nested sub-teams."], [2000, 2000, 5026]),
      ]
    }),

    pageBreak(),
  ];
};
