const { h2, h3, h4, body, emptyLine, pageBreak } = require('../utils');

module.exports = function getChapter2_3() {
  return [
    h2("2.3 The Evolution of Directed Acyclic Graphs in Task Management"),
    body("The conceptual framework of representing tasks as nodes and dependencies as edges is fundamentally rooted in the mathematical study of Graph Theory, first formalized by Leonhard Euler in 1736. However, the application of this theory to complex project orchestration requires a specific subset known as a Directed Acyclic Graph (DAG)."),
    
    h3("2.3.1 Historical Context: From Gantt to DAGs"),
    body("Early project management tools heavily relied on the Gantt chart, introduced by Henry Gantt around 1910. While Gantt charts provide an excellent visual timeline, their underlying data structures are typically flat or strictly hierarchical (trees). In a strict tree hierarchy, a task can only have a single parent. This limitation is severe in modern software engineering, where a single 'Backend API' task might simultaneously block the 'Frontend UI' task, the 'Mobile App' task, and the 'QA Automation' task."),
    body("By transitioning the underlying data model from a Tree to a DAG, modern systems permit multi-parent and multi-child relationships. The critical constraint of a DAG is that it must remain 'Acyclic'—meaning it is mathematically impossible to follow a sequence of directed edges and return to the starting node. If Task A blocks Task B, and Task B blocks Task C, it is a fatal logical error for Task C to block Task A. Such a cycle would create an infinite dependency loop, rendering the project permanently deadlocked."),

    h3("2.3.2 The Computational Cost of Cycle Detection"),
    body("While DAGs provide the necessary expressive power for enterprise workflows, they introduce massive computational complexity during data mutation. Every time a user attempts to create a new dependency link (an edge) between two existing tasks, the system must perform a Cycle Detection algorithm before permitting the database write."),
    body("Traditional algorithms, such as Tarjan's strongly connected components algorithm or simple Depth-First Search (DFS), require loading the entire graph into memory and traversing it. In a project with 100,000 tasks, a synchronous DFS cycle check during an HTTP POST request will easily exceed acceptable latency thresholds (typically < 100ms for web applications)."),
    body("Taskinator's implementation of the Custom Closure Table completely eliminates the need for runtime DFS. Because the Closure Table maintains a pre-calculated index of all reachability paths, checking for a cycle is reduced to a single, instant O(1) SQL query: SELECT 1 FROM task_reachability WHERE ancestor_id = $child AND descendant_id = $parent. If a row exists, the new link would create a cycle, and the insertion is instantly rejected."),

    pageBreak(),
  ];
};
