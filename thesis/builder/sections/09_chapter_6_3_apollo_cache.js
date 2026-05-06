const { h2, h3, body, emptyLine, insertImage, figCaption, codeLine, pageBreak } = require('../utils');

module.exports = function getChapter6_3() {
  return [
    h2("6.3 Reactive State Management: Apollo Client Cache Reconciliation"),
    body("The realization of a truly reactive user interface necessitates a state management strategy capable of reconciling asynchronous server-side events with the local browser-resident state without incurring the destructive overhead of full-page reloads or broad-spectrum network refetches. Taskinator achieves this through a sophisticated integration of Apollo Client's normalized In-Memory Cache and granular Server-Sent Event (SSE) ingestion."),

    h3("6.3.1 Asynchronous SSE Ingress and Link Interception"),
    body("When a targeted SSE payload arrives at the browser—for instance, a JSON fragment indicating that 'Task 123' has transitioned to 'DONE'—the client must process it with surgical precision. A naive approach would involve forcing a GraphQL query refetch, which would trigger a network roundtrip, re-parse a massive response, and potentially cause a layout shift that degrades the user experience."),
    body("Instead, Taskinator employs a custom 'SSE Link' within the Apollo client-side middleware chain. This link intercepts the incoming streaming data and immediately broadcasts it to the internal cache layer, bypassing the network fetch tier entirely. This architectural pattern ensures that the 'Time to UI Update' is limited only by the raw network latency of the SSE stream itself, typically resulting in near-instantaneous visual feedback."),
    emptyLine(),
    insertImage("diagram_apollo_sse_ingress.png"),
    figCaption("Figure 6.3.1: SSE Ingress and Apollo Link Interception Sequence"),

    h3("6.3.2 Granular Cache Modification and Virtual DOM Reconciliation"),
    body("The internal Apollo cache operates as a highly normalized graph of data entities, where each object is uniquely identified via a deterministic key (e.g., 'Task:123'). Upon receiving a delta from the SSE link, Taskinator utilizes the 'cache.modify()' API to execute a direct, granular update of the specific entity field."),
    
    codeLine("// Apollo Cache Surgical Modification", 120),
    codeLine("apolloClient.cache.modify({"),
    codeLine("  id: apolloClient.cache.identify({ __typename: 'Task', id: event.id }),"),
    codeLine("  fields: {"),
    codeLine("    status() { return event.status; }"),
    codeLine("  }"),
    codeLine("});", 0, 120),

    body("This operation is fundamentally 'pure'; it does not alter the underlying component state directly but instead updates the source-of-truth from which components derive their properties via Reactive Hooks. React 18's concurrent rendering engine detects this change in the normalized store and initiates a high-speed Virtual DOM diffing operation."),
    body("Because the update is granular, React identify that only the specific Task Card component associated with the modified ID requires reconciliation. The other hundreds of components in the project view remain untouched, avoiding expensive layout recalculations and maintaining a consistent 60 FPS frame rate even during high-frequency real-time updates from multiple concurrent users."),
    emptyLine(),
    insertImage("diagram_apollo_reconciliation.png"),
    figCaption("Figure 6.3.2: Granular Cache Update and React Reconciliation Flow"),

    h3("6.3.3 Resilience against Network Partitioning and Synchronization"),
    body("Distributed real-time systems must account for transient network failures. If an SSE connection is severed due to infrastructure instability, the Apollo Cache maintains the last known authoritative state locally. Upon reconnection, the client executes a 'Sync Query' or 'Delta Fetch' to retrieve only the operations that transpired during the period of disconnection. This ensures the local cache is reconciled with the server-side state without requiring a full application reset, providing a seamless 'Offline-to-Online' transition for the end user."),

    pageBreak(),
  ];
};
