const { h2, h3, body, emptyLine, insertImage, figCaption, codeLine, pageBreak } = require('../utils');

module.exports = function getChapter4_3() {
  return [
    h2("4.3 Smart Batch Aggregation & Semantic Folding"),
    body("Pushing millions of events efficiently into the Kafka broker solves the upstream producer bottleneck. However, if the downstream consumers cannot process these events rapidly enough, Kafka will experience massive partition lag. Naive consumer implementations process one Kafka event at a time, executing a separate database transaction for every incoming event. At 10,000 RPS, executing 10,000 sequential UPDATE transactions to modify counters or analytics will instantly exhaust the database connection pool."),
    body("To mitigate this, Taskinator introduces a specialized background worker pattern called the Smart Batch Aggregator."),
    emptyLine(),
    insertImage("diagram_aggregator_folding.png"),
    figCaption("Figure 4.3: Smart Batch Aggregator Data Flow and Semantic Folding"),
    
    h3("4.3.1 Kafka Partitioning Strategy"),
    body("The prerequisite for semantic folding is strict causal ordering. The Kafka producer explicitly sets the message partitioning key to the projectId. This guarantees that all events related to \"Project A\"—regardless of which node generated them or when they occurred—will consistently land on the exact same Kafka topic partition. Consequently, only one specific consumer thread will ever process the event stream for Project A at a given time, eliminating the possibility of distributed race conditions during aggregation."),
    
    h3("4.3.2 The Semantic Folding Algorithm"),
    body("The Kafka consumer is configured to ingest massive chunks of events (e.g., batchSize: 5000) from the broker and buffer them chronologically in memory. Instead of executing 5000 individual SQL queries, the aggregator loops over the buffered array and executes a Semantic Folding Algorithm."),
    body("If the aggregator detects 50 \"Task Created\" events and 20 \"Task Deleted\" events pertaining to the exact same project within the 500-millisecond batch window, it does not execute 70 individual SQL updates. Instead, it calculates a net mathematical delta (+30). It then executes a single, highly optimized, batched database update to the denormalized project.task_count metric."),
    codeLine("// Semantic Folding Algorithm Snippet", 120),
    codeLine("const deltas = new Map<string, number>();"),
    codeLine(""),
    codeLine("for (const event of batch) {"),
    codeLine("  if (event.type === 'TASK_CREATED') {"),
    codeLine("    deltas.set(event.projectId, (deltas.get(event.projectId) || 0) + 1);"),
    codeLine("  } else if (event.type === 'TASK_DELETED') {"),
    codeLine("    deltas.set(event.projectId, (deltas.get(event.projectId) || 0) - 1);"),
    codeLine("  }"),
    codeLine("}"),
    codeLine(""),
    codeLine("// Execute folded updates"),
    codeLine("await db.transaction().execute(async (trx) => {"),
    codeLine("  for (const [projectId, delta] of deltas) {"),
    codeLine("    if (delta !== 0) {"),
    codeLine("      await trx.updateTable('project')"),
    codeLine("        .set((eb) => ({ task_count: eb('task_count', '+', delta) }))"),
    codeLine("        .where('id', '=', projectId)"),
    codeLine("        .execute();"),
    codeLine("    }"),
    codeLine("  }"),
    codeLine("});", 0, 120),
    body("By performing these mathematical reductions purely in the Node.js V8 memory heap, the aggregator collapses thousands of sequential database operations into a handful of batched updates. This drastically reduces database write amplification, minimizes transaction overhead, and ensures that the analytics dashboard remains incredibly responsive, even under peak enterprise loads."),
    
    pageBreak(),
  ];
};
