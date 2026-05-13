const { h2, h3, body, pageBreak } = require('../utils');

module.exports = function getChapter5_2() {
  return [
    h2("5.2 Team Hierarchy and Inheritance"),
    body("Enterprise organizations rarely operate flat lists of users. Access control is typically managed via nested hierarchies: a Global Admin team contains the Engineering team, which contains the Frontend sub-team. If a project is assigned to the Engineering team, all members of the Frontend sub-team must automatically inherit access."),
    body("This introduces a complex challenge for the CTE-based authorization model, as determining inherited membership requires calculating paths through a Directed Acyclic Graph (DAG) of teams during the mutation."),

    h3("5.2.1 Team Closure Tables"),
    body("To support instant O(1) inheritance checks, Taskinator applies the Custom Closure Table pattern not just to the tasks, but also to the Team organizational structures. A team_reachability table explicitly stores every mathematical path from an ancestor team to all descendant sub-teams."),
    body("When the aforementioned auth_check CTE executes, it does not merely check if the user is a direct member of the project. It executes a highly optimized JOIN against the team_reachability index to determine if the user belongs to ANY team that is mathematically deemed a descendant of the team assigned to the project."),
    body("Because the reachability matrix is calculated asynchronously via Kafka during team restructuring events, the read-path mutation query remains blazingly fast. This architectural decision ensures that even in organizations with thousands of deeply nested sub-teams, the authorization overhead remains constant, completely circumventing the catastrophic performance degradation associated with runtime recursive traversals."),
    
    pageBreak(),
  ];
};
