const { Paragraph, TextRun } = require('docx');
const { h2, h3, body, codeBlock, emptyLine, insertImage, figCaption, F } = require('../utils');

module.exports = function getChapter5_6() {
  return [
    h2("5.6 Distributed Data Lifecycle and Event Synchronization"),
    body("The integrity and operational efficiency of a distributed ecosystem are intrinsically linked to the predictable and deterministic flow of data across disparate service boundaries. Taskinator ensures this multi-tier synchronization through an advanced combination of 'Semantic Folding' and 'Silent Purge' architectural policies. These mechanisms are designed to manage the entire lifecycle of project-wide events—from their initial reactive emission to their final reconciliation and garbage collection—while strictly avoiding the common pitfalls of event-driven architectures, such as network congestion and infinite cascading loops."),

    h3("5.6.1 Semantic Event Folding in Aggregators"),
    body("To optimize Apache Kafka throughput and minimize downstream compute costs, Taskinator's 'Smart Aggregators' implement a sophisticated 'Semantic Folding' algorithm during the ingestion of high-frequency event streams. When multiple mutations occur for the same primary entity within a configurable temporal window (typically a 100ms micro-batch), the aggregator 'folds' these operations into a single logical state transition."),
    body("Consider a high-frequency scenario where a project is rapidly created, updated multiple times, and then deleted in the same batch. A naive system would propagate four distinct events, triggering four sets of downstream cache updates and database writes. In contrast, the Taskinator folding logic applies a mathematical Map-Reduce operation over the batch: (+1 created, -1 deleted = 0 net change). The aggregator effectively cancels both events at the ingestion tier, preventing any unnecessary noise from propagating to the Analytics and Real-time sub-systems."),
    emptyLine(),
    insertImage("diagram_lifecycle_folding.png"),
    figCaption("Figure 5.6.1: Semantic Folding and Batch Compression Logic"),
    
    codeBlock(`// Advanced Semantic Folding Logic
function foldLifecycleBalance(events) {
    let balance = 0;
    const finalState = {};
    
    for (const event of events) {
        if (event.type === 'CREATED') balance++;
        if (event.type === 'DELETED') balance--;
        
        // Accumulate intermediate attribute changes
        Object.assign(finalState, event.payload);
    }
    
    // Only emit the net logical outcome of the batch
    return { balance, finalState }; 
}`),

    h3("5.6.2 The Silent Purge Policy for Cascading Cleanups"),
    body("A critical challenge in mature Event-Driven Architectures is the mitigation of 'Event Storms'—phenomena where a single root-level deletion (e.g., a Project) triggers a cascade of thousands of individual child deletion events (e.g., Tasks, Teams, Members), potentially saturating the message bus and causing downstream consumer lag. To combat this, Taskinator enforces a strict 'Silent Purge' policy for all recursive garbage collection operations."),
    body("When a Project is marked for deletion, the Project Module emits a single, authoritative 'PROJECT_DELETED' signal via Kafka. All interested modules (Team, Task, Auth) consume this signal and initiate a 'Silent Purge'. This entails executing high-speed, direct SQL bulk deletions on their internal tables using the project_id as a bounding key. Crucially, these cascading deletions are specifically configured to **not** emit further Kafka events. By breaking the event chain at the leaf level, Taskinator maintains absolute system stability and predictable latency even during massive data purging operations."),
    emptyLine(),
    insertImage("diagram_lifecycle_purge.png"),
    figCaption("Figure 5.6.2: Silent Purge Cascades and Event Chain Termination"),

    h3("5.6.3 Proactive Atomic Counter Reconciliation"),
    body("While denormalized counts (such as project.task_count or team.members_count) are updated with sub-second latency via the asynchronous aggregation pipeline, there exists a theoretical non-zero probability of 'state drift' due to race conditions or partition rebalancing. Taskinator addresses this by incorporating a 'Proactive Reconciliation' mechanism directly into the aggregator tier."),
    body("Every 10,000 processed events, or upon the detection of a significant consumer lag, the system triggers a background reconciliation 'Sweep'. This worker executes a highly optimized read-only COUNT query against the source-of-truth tables and compares the result with the denormalized state. Any identified discrepancies are corrected via an atomic UPSERT, ensuring that while the system is highly performant and eventually consistent, it is also fundamentally self-healing and accurate in the long term."),
  ];
};
