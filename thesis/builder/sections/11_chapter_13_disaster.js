const { Paragraph, TextRun, Table, WidthType } = require('docx');
const { h1, h2, h3, body, emptyLine, tblHeader, tblRow, tblCaption, CONTENT_W, pageBreak } = require('../utils');

module.exports = function getChapter13_Disaster() {
  return [
    h1("13. FAILURE MODES AND DISASTER RECOVERY"),
    body("Resilience is a primary architectural goal of Taskinator. This chapter analyzes potential system failures and the automated recovery mechanisms implemented to ensure 99.9% availability."),

    h2("13.1 Database Outages and Read-Only Mode"),
    body("In the event of a primary PostgreSQL failure, the system is designed to gracefully degrade. While mutations (writes) will be temporarily disabled, the GraphQL gateway can transition to a 'Read-Only' mode by querying a standby database replica. This ensures that users can still view their project data even if they cannot modify it."),

    h2("13.2 Kafka Consumer Lag and Backpressure"),
    body("If the Smart Aggregator falls behind (e.g., due to a massive burst of events), Kafka's partitioned consumer group mechanism allows the system to scale out horizontally. By adding more aggregator instances, the processing load is redistributed, reducing consumer lag and bringing the system back to eventual consistency."),

    h2("13.3 Redis Cache Invalidation and Warm-up"),
    body("The Redis routing table is ephemeral. If a Redis node fails, the system performs a 'Silent Recovery'. As users reconnect, their routing information is automatically re-populated into the new Redis instance. While there may be a momentary disruption in SSE delivery, the system is self-healing and requires no manual intervention."),

    emptyLine(),
    tblCaption("Table 13.1: Failure Mode and Recovery Strategy Matrix"),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [2500, 3000, 3526],
      rows: [
        tblHeader(["Component", "Failure Scenario", "Recovery Strategy"], [2500, 3000, 3526]),
        tblRow(["PostgreSQL", "Primary node failure", "Automated failover to hot-standby replica."], [2500, 3000, 3526]),
        tblRow(["Kafka", "Partition leader failure", "Zookeeper/Kraft triggers leader re-election."], [2500, 3000, 3526], true),
        tblRow(["Workspace", "Process crash", "Kubernetes Kubelet restarts the pod immediately."], [2500, 3000, 3526]),
        tblRow(["Redis", "Cache node failure", "Stateless re-population via active user connections."], [2500, 3000, 3526], true),
      ]
    }),

    pageBreak(),
  ];
};
