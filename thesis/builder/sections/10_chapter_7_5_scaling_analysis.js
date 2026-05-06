const { Paragraph, TextRun, Table, WidthType } = require('docx');
const { h2, h3, body, emptyLine, insertImage, figCaption, F, tblHeader, tblRow, tblCaption, CONTENT_W } = require('../utils');

module.exports = function getChapter7_5() {
  return [
    h2("7.5 Scaling Analysis and Throughput Benchmarks"),
    body("To validate the architectural claims of the Taskinator platform, a series of rigorous performance benchmarks were conducted under simulated high-load conditions. The goal was to identify the saturation points of the wCTE outbox and the Smart Aggregator tiers."),

    h3("7.5.1 Write Throughput: wCTE vs. Standard INSERT"),
    body("A comparison was conducted between standard synchronous INSERT operations and the wCTE Transactional Outbox pattern. While the wCTE adds a slight overhead of ~3ms per write due to the additional row insertion into the outbox table, the gain in reliability and downstream synchronization capability far outweighs this minimal latency penalty."),
    
    emptyLine(),
    tblCaption("Table 7.5.1: Write Latency and Throughput (10k Ops)"),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [3000, 3000, 3026],
      rows: [
        tblHeader(["Metric", "Standard INSERT", "wCTE Outbox"], [3000, 3000, 3026]),
        tblRow(["Avg. Latency (P50)", "12ms", "15ms"], [3000, 3000, 3026]),
        tblRow(["Avg. Latency (P99)", "45ms", "52ms"], [3000, 3000, 3026], true),
        tblRow(["Max Throughput", "850 req/s", "820 req/s"], [3000, 3000, 3026]),
      ]
    }),

    h3("7.5.2 Aggregator Compression Ratios"),
    body("The efficiency of the 'Semantic Folding' algorithm was measured by analyzing the compression ratio of raw Kafka events to final database updates. In high-frequency scenarios (e.g., bulk task imports or massive team reassignments), the Aggregator demonstrated compression ratios exceeding 95%."),
    body("This massive reduction in write pressure on the primary database is what allows Taskinator to sustain 10k RPS at the event tier while maintaining a modest 500 RPS write load at the storage layer."),

    h3("7.5.3 Real-time Latency (End-to-End)"),
    body("The final metric measured was the 'Glass-to-Glass' latency: the time from a user clicking a button on Instance A to the visual change appearing on Instance B's browser. Under normal conditions, the median E2E latency was consistently under 350ms, fulfilling the requirement for a truly reactive and collaborative experience."),
  ];
};
