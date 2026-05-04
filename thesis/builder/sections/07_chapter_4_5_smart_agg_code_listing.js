const { h2, h3, body, codeLine, pageBreak } = require('../utils');

module.exports = function getChapter4_5() {
  return [
    h2("4.5 Algorithmic Implementation: Semantic Folding"),
    body("The theoretical concept of Semantic Folding requires a highly efficient, in-memory algorithmic implementation. The Smart Aggregator consumer must process arrays of up to 10,000 Kafka events in mere milliseconds before committing the mathematical deltas to the database."),

    h3("4.5.1 The Kafka Consumer Batch Loop"),
    body("The following Node.js code excerpt demonstrates the implementation of the O(N) folding loop. The algorithm iterates over the chronological batch array exactly once, accumulating the net changes in a Map data structure to achieve spatial and temporal efficiency."),
    
    codeLine("async function processBatch(messages: KafkaMessage[]) {", 120),
    codeLine("  // O(1) Lookup Map for Project Deltas"),
    codeLine("  const projectDeltas = new Map<string, { total: number; completed: number }>();"),
    codeLine(""),
    codeLine("  for (const msg of messages) {"),
    codeLine("    const event = JSON.parse(msg.value.toString());"),
    codeLine("    const pid = event.projectId;"),
    codeLine(""),
    codeLine("    // Initialize the delta tracker if missing"),
    codeLine("    if (!projectDeltas.has(pid)) {"),
    codeLine("      projectDeltas.set(pid, { total: 0, completed: 0 });"),
    codeLine("    }"),
    codeLine(""),
    codeLine("    const current = projectDeltas.get(pid)!;"),
    codeLine(""),
    codeLine("    // Apply algorithmic state folding"),
    codeLine("    switch (event.type) {"),
    codeLine("      case 'TASK_CREATED':"),
    codeLine("        current.total += 1;"),
    codeLine("        break;"),
    codeLine("      case 'TASK_DELETED':"),
    codeLine("        current.total -= 1;"),
    codeLine("        if (event.status === 'DONE') current.completed -= 1;"),
    codeLine("        break;"),
    codeLine("      case 'TASK_STATUS_CHANGED':"),
    codeLine("        if (event.newStatus === 'DONE') current.completed += 1;"),
    codeLine("        if (event.oldStatus === 'DONE') current.completed -= 1;"),
    codeLine("        break;"),
    codeLine("    }"),
    codeLine("  }"),
    codeLine(""),
    codeLine("  // Phase 2: Flush the optimized Map to the Database"),
    codeLine("  await flushDeltasToDatabase(projectDeltas);"),
    codeLine("}", 0, 120),
    
    h3("4.5.2 Complexity Analysis"),
    body("The time complexity of this array reduction is strictly O(N), where N is the number of events in the batch. The space complexity is O(K), where K is the number of unique projects affected within that specific time slice. Because Kafka guarantees that all events for a specific project land on the same partition (and thus the same consumer thread), there is absolute mathematical certainty that no other Node.js instance is concurrently attempting to calculate the deltas for project 'pid'. This eliminates the need for distributed Redis locking mechanisms, freeing up substantial network bandwidth."),

    pageBreak(),
  ];
};
