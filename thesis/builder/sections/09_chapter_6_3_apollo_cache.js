const { h2, body, emptyLine, insertImage, figCaption, codeLine, pageBreak } = require('../utils');

module.exports = function getChapter6_3() {
  return [
    h2("6.3 Apollo Client Cache Reconciliation"),
    body("When the targeted SSE payload arrives at the browser (e.g., { id: \"Task:123\", status: \"DONE\" }), the client must process it without triggering a network refetch. A naive approach would simply force a re-render of the entire page, causing a massive layout recalculation and dropping the frame rate to zero."),
    emptyLine(),
    insertImage("fig_7_2_apollo_reconciliation.png"),
    figCaption("Figure 6.3: Apollo Client SSE State Reconciliation Sequence"),
    body("Taskinator hooks the SSE stream directly into the Apollo GraphQL Link architecture. Apollo maintains a highly normalized, flat, in-memory cache mapping unique IDs (derived from the GraphQL __typename and id fields) to object data."),
    body("Upon receiving the SSE payload, the client executes the cache.modify method. This method surgically locates the specific object in the cache (e.g., Task:123) and injects the delta mutation directly into memory, bypassing the React component tree entirely:"),
    codeLine("// Apollo Cache Modification Snippet", 120),
    codeLine("apolloClient.cache.modify({"),
    codeLine("  id: apolloClient.cache.identify({ __typename: 'Task', id: event.id }),"),
    codeLine("  fields: {"),
    codeLine("    status() {"),
    codeLine("      return event.status; // Inject the new status without a network request"),
    codeLine("    }"),
    codeLine("  }"),
    codeLine("});", 0, 120),
    body("Because the React components are structurally bound to specific cached references via the useQuery or useFragment hooks, React instantly detects that the specific node in the cache has changed. It triggers a granular, localized re-render of only that specific Task UI component (e.g., changing the SVG circle color from red to green)."),
    body("This completely preserves O(1) rendering performance on the client device, preventing complete screen freezes or layout thrashing, and ensuring that the UI remains flawlessly synced with the Eventual Consistency model of the backend without user intervention."),

    pageBreak(),
  ];
};
