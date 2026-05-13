const { Paragraph, TextRun } = require('docx');
const { h2, h3, body, codeBlock, emptyLine, insertImage, figCaption, F } = require('../utils');

module.exports = function getChapter3_10() {
  return [
    h2("3.10 Advanced Task Graph Schema Design and Topology"),
    body("A fundamental architectural requirement of the Taskinator platform is the ability to model complex, non-linear workflows where tasks are conceptualized as nodes within a Directed Acyclic Graph (DAG). Traditional hierarchical models—such as simple folder structures or parent-child pointers—are inherently insufficient for capturing the multifaceted reality of modern enterprise dependency management, where a single task might be blocked by multiple prerequisites or contribute to several distinct high-level goals. To resolve this, Taskinator implements a high-performance graph engine engineered directly atop the PostgreSQL relational core, leveraging specialized indexing strategies to bridge the gap between relational storage and graph-based querying."),

    h3("3.10.1 The Focused Network Philosophy: Radial Discovery"),
    body("In large-scale project environments, a single graph may contain tens of thousands of nodes and hundreds of thousands of edges. Attempting to visualize or process this entire dataset synchronously would result in catastrophic browser performance and severe backend memory exhaustion. Taskinator addresses this through a 'Focused Network' design philosophy. In this model, the system prioritizes a central 'Focused Task' (selected by the user) and dynamically generates a subgraph containing its immediate incoming and outgoing dependency paths up to a configurable radial depth (typically 3 to 5 levels)."),
    body("This radial discovery approach ensures that the user is never overwhelmed by irrelevant 'Visual Noise' while simultaneously guaranteeing that the most critical contextual dependencies are always visible and actionable. By bounding the query depth at the storage layer, the system maintains consistent sub-100ms response times regardless of the overall graph size."),
    
    emptyLine(),
    insertImage("diagram_task_graph_logic.png"),
    figCaption("Figure 3.10.1: Focused Task Network with Multi-Level Radial Discovery"),

    h3("3.10.2 Normalized Topological Storage: Nodes and Edges"),
    body("The graph topology is physically persisted across two primary, highly normalized tables. This separation ensures that entity-level metadata (titles, statuses, versions) can be updated without interfering with the underlying topological structure of the graph:"),
    
    codeBlock(`-- The Entity Store
CREATE TABLE project_task (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fk_project_id UUID NOT NULL REFERENCES project(id),
    title TEXT NOT NULL CHECK (char_length(title) > 0),
    status TEXT NOT NULL DEFAULT 'TODO',
    version INTEGER NOT NULL DEFAULT 1 -- Optimistic Concurrency Control
);

-- The Edge Store (Adjacency List)
CREATE TABLE task_link (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_task_id UUID NOT NULL REFERENCES project_task(id),
    target_task_id UUID NOT NULL REFERENCES project_task(id),
    label TEXT NOT NULL DEFAULT 'DEPENDS_ON',
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT chk_not_self_link CHECK (source_task_id <> target_task_id)
);`),
    body("While the 'task_link' table functions as a standard adjacency list, it is insufficient for rapid path traversal over multiple levels. Performing recursive CTE (Common Table Expression) queries for every UI interaction would impose a significant CPU burden on the database during periods of high concurrency."),

    h3("3.10.3 The Reachability Index: Pre-computed Transitive Closure"),
    body("To enable O(1) path discovery and cycle detection, Taskinator maintains a secondary index known as the 'Task Reachability' table. This table stores the transitive closure of the graph—essentially pre-computing every possible path between any two nodes within a project."),
    
    codeBlock(`-- The Transitive Closure Index
CREATE TABLE task_reachability (
    fk_project_id UUID NOT NULL REFERENCES project(id),
    ancestor_task_id UUID NOT NULL REFERENCES project_task(id),
    descendant_task_id UUID NOT NULL REFERENCES project_task(id),
    min_depth INTEGER NOT NULL CHECK (min_depth >= 0),
    PRIMARY KEY (fk_project_id, ancestor_task_id, descendant_task_id)
);`),
    
    body("By incorporating the 'min_depth' attribute into the index, the backend can execute highly efficient range queries to fetch the neighborhood of any task. For example, to retrieve all tasks that Task X is dependent upon within a 3-level depth, the system executes a simple non-recursive SELECT:"),
    
    codeBlock(`-- High-Speed Neighborhood Fetch
SELECT ancestor_task_id, min_depth
FROM task_reachability
WHERE descendant_task_id = $focusedTaskId
  AND min_depth <= 3;`),

    h3("3.10.4 Application-Layer Graph Stitching and Path Construction"),
    body("A key architectural decision in Taskinator is the delegation of path construction to the application tier. While the database serves as a highly optimized 'Search and Retrieval' engine for node IDs, the actual 'Stitching' of these nodes into a coherent Graph Story is performed by the Node.js Workspace service."),
    body("The service fetches the neighborhood IDs from the reachability index and simultaneously retrieves the raw edge metadata from the 'task_link' table. It then utilizes an in-memory Depth-First Search (DFS) algorithm to assemble the final JSON structure returned via GraphQL. This strategy ensures that the database remains unburdened by complex, CPU-intensive path serialization, allowing it to serve thousands of concurrent queries while the application tier handles the heavy compute load in a horizontally scalable manner."),
    body("Furthermore, this separation of concerns allows for advanced client-side features, such as 'Dynamic Path Pruning' and 'In-Memory Cycle Detection', which provide an additional layer of safety and responsiveness to the user interface."),
  ];
};
