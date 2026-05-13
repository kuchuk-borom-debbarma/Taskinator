const { Paragraph, TextRun } = require('docx');
const { h1, h2, h3, body, emptyLine, insertImage, figCaption, F } = require('../utils');

module.exports = function getChapter10() {
  return [
    h1("10. FRONTEND ENGINEERING AND UX OPTIMIZATION"),
    body("The user experience of the Taskinator platform is as much an engineering challenge as the backend throughput. This chapter explores the optimization techniques used to render massive task graphs at 60 frames per second (FPS) and maintain a fluid, reactive state."),

    h2("10.1 React 18 Concurrent Rendering"),
    body("Taskinator leverages the concurrent rendering capabilities introduced in React 18. By utilizing the 'useTransition' hook, the system can mark certain state updates (such as graph layout recalculations) as 'non-urgent'. This allows the React engine to prioritize urgent interactions—like typing or clicking—ensuring the UI never feels sluggish, even when processing a heavy incoming SSE stream."),

    h2("10.2 D3.js Force-Directed Graph Optimization"),
    body("The visual representation of task dependencies utilizes a custom force-directed graph implemented in D3.js. To prevent the CPU-bound simulation from blocking the main UI thread, Taskinator executes the D3 simulation within a dedicated Web Worker. The worker calculates the node positions in the background and sends the resulting coordinates back to the React component via a high-speed 'PostMessage' channel for rendering."),

    h2("10.3 Apollo Client Cache Internals"),
    body("Maintaining a consistent state across hundreds of task cards requires a sophisticated caching strategy. Taskinator utilizes Apollo Client's normalized cache, which de-duplicates entity data into a flat lookup table. This ensures that if Task A is visible in both the 'List View' and the 'Graph View', updating its status in one view instantly reflects in the other with zero additional network requests, as both components are observing the same normalized cache node."),

    h3("10.3.1 Optimistic UI Updates"),
    body("To provide perceived zero-latency, Taskinator implements 'Optimistic UI' patterns for all primary mutations. When a user completes a task, the UI immediately renders the completed state (e.g., a green checkmark) before the server has even acknowledged the request. If the server later returns an error (e.g., due to a concurrency conflict), the Apollo cache automatically rolls back the change, maintaining a consistent and truthful state while providing an 'Instant Feedback' experience."),
  ];
};
