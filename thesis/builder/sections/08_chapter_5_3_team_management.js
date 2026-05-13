const { h2, h3, body, emptyLine, insertImage, figCaption, pageBreak, codeLine } = require('../utils');

module.exports = function getChapter5_3() {
  return [
    h2("5.3 Hierarchical Team Management and Closure Tables"),
    body("While the Task Reachability Engine models deeply nested, multi-parent Directed Acyclic Graphs (DAGs), the organizational structure of users within Taskinator requires a completely different topological model. Organizations are modeled as strict trees with a maximum nesting depth of 50 levels (e.g., Global Corp -> NA Region -> Engineering -> Frontend Team)."),
    
    emptyLine(),
    insertImage("diagram_team_closure_table.png"),
    figCaption("Figure 5.3: Strict Single-Parent Team Closure Table Architecture"),
    
    h3("5.3.1 The 'One Parent' Strict Domain Rule"),
    body("Unlike tasks, which can block multiple downstream dependents, a Team entity is strictly governed by the 'One Parent' domain rule. A team can have an infinite number of sub-teams, but it can only ever report to exactly one parent team. This enforces a strict hierarchical tree structure, preventing circular reporting cycles inherently at the database schema level via a single parent_id Foreign Key."),
    
    h3("5.3.2 The Organizational Reachability Index"),
    body("Querying hierarchical tree data using standard SQL requires recursive CTEs, which degrade exponentially as depth increases. To resolve this, the Workspace Service implements a secondary Closure Table specifically tuned for organizational hierarchies."),
    body("The team_closure table tracks the topological distance between any two teams in the organization:"),
    codeLine("CREATE TABLE team_closure ("),
    codeLine("  ancestor_id UUID NOT NULL,"),
    codeLine("  descendant_id UUID NOT NULL,"),
    codeLine("  depth INT NOT NULL,"),
    codeLine("  PRIMARY KEY (ancestor_id, descendant_id)"),
    codeLine(");"),
    body("When querying for all users within the 'Engineering' department (including all nested sub-teams), the system executes a simple, O(1) indexed join against the team_closure table where ancestor_id = 'Engineering', instantly returning thousands of sub-teams without recursive table scans."),
    
    pageBreak(),
  ];
};
