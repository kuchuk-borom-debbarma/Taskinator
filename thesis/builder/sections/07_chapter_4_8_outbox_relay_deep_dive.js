const { Paragraph, TextRun } = require('docx');
const { h2, h3, body, codeBlock, emptyLine, insertImage, figCaption, F } = require('../utils');

module.exports = function getChapter4_8() {
  return [
    h2("4.8 Transactional Outbox Relay Deep Dive"),
    body("The Transactional Outbox pattern is the engine of reliability in Taskinator. While Chapter 4.1 introduced the wCTE pattern for atomic writes, this section details the high-performance relay mechanism that ensures these events are eventually published to the Kafka event bus with 'at-least-once' delivery guarantees."),

    h3("4.8.1 Polling vs. Push-Based Notifications"),
    body("To minimize latency, the Outbox Relay does not rely solely on interval polling. Instead, it utilizes PostgreSQL's 'LISTEN/NOTIFY' mechanism. When a wCTE transaction commits, the database fires a 'pg_notify' signal. The idle relay process, which is 'listening' on that channel, wakes up instantly to process the new events."),
    
    codeBlock(`-- Triggered within the wCTE transaction
NOTIFY outbox_inserted;`),

    h3("4.8.2 The Concurrent Claim Loop"),
    body("In a distributed environment where multiple relay instances may be running, we must prevent duplicate processing at the source. The relay uses a 'SELECT ... FOR UPDATE SKIP LOCKED' query to atomically claim a batch of events."),
    
    codeBlock(`WITH claimed_events AS (
    SELECT id FROM outbox_events
    WHERE status = 'PENDING'
    ORDER BY created_at ASC
    LIMIT 100
    FOR UPDATE SKIP LOCKED
)
UPDATE outbox_events
SET status = 'PROCESSING', claimed_by = $instanceId
WHERE id IN (SELECT id FROM claimed_events)
RETURNING *;`),
    
    body("This query ensures that each relay instance gets a unique set of events without blocking other instances, allowing the system to scale linearly as event volume grows."),

    h3("4.8.3 The 'Delete-on-Success' Strategy"),
    body("Once the relay receives an acknowledgement (ACK) from Kafka, it immediately deletes the processed events from the 'outbox_events' table. This 'Hard Delete' strategy is critical for maintaining O(1) polling performance. By keeping the table size near zero, we avoid the performance degradation typically associated with large, long-lived tables in relational databases."),

    emptyLine(),
    insertImage("diagram_outbox_flow.png"),
    figCaption("Figure 4.8: Outbox Relay Lifecycle and Kafka Integration"),

    h3("4.8.4 Error Handling and Retries"),
    body("If the relay process crashes or Kafka is unavailable, the 'PROCESSING' status acts as a safety net. A separate 'Cleanup Worker' monitors the table for events that have been in 'PROCESSING' for longer than 60 seconds and resets them to 'PENDING', allowing them to be re-claimed by a healthy relay instance. This ensures that no event is ever lost, even in the event of partial system failure."),
  ];
};
