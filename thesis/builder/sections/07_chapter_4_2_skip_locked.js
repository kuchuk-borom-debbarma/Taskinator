const { h2, h3, body, emptyLine, insertImage, figCaption } = require('../utils');

module.exports = function getChapter4_2() {
  return [
    h2("4.2 Concurrent Outbox Relays: Mitigating the Thundering Herd"),
    body("Writing events safely to the outbox is only the first phase; the system must efficiently relay these events to the Kafka broker. Traditional outbox relays utilize primitive setInterval loops within background worker threads to repeatedly poll the database (e.g., SELECT * FROM outbox_events WHERE status = 'PENDING')."),
    body("At an operational scale of 10,000 RPS, this polling methodology is catastrophic. Even when the system is relatively idle, aggressive polling introduces severe database CPU load and saturates network bandwidth."),
    body("Taskinator discards polling entirely in favor of reactivity. The Outbox Relay connects via the native pg driver and executes a persistent LISTEN outbox_event_notification command. When the aforementioned wCTE commits, PostgreSQL natively pushes a highly efficient, lightweight notification through the socket, instantly waking the idle relay."),
    emptyLine(),
    insertImage("diagram_thundering_herd.png"),
    figCaption("Figure 4.2: Concurrent Outbox Polling: Mitigating the Thundering Herd with SKIP LOCKED"),
    
    h3("4.2.1 The Thundering Herd Problem in Kubernetes Clusters"),
    body("While reactive LISTEN/NOTIFY is highly efficient on a single node, enterprise deployments utilize Kubernetes to horizontally scale backend pods. If 50 identical backend pods are actively listening to the same outbox channel, a single pg_notify event will simultaneously wake up all 50 pods."),
    body("This creates a disastrous scenario known as the \"Thundering Herd.\" All 50 pods will instantly attempt to execute a SELECT ... FOR UPDATE query to claim the exact same batch of pending events. Pod 1 acquires the lock, while Pods 2 through 50 are forced to block and wait. When Pod 1 commits, Pod 2 wakes up, discovers the events are already processed, and goes back to sleep. This contention leads to massive CPU spikes, transaction timeouts, and eventual database deadlocks as threads fight over the same B-Tree index rows."),
    
    h3("4.2.2 High-Concurrency Queue Processing with SKIP LOCKED"),
    body("To solve the Thundering Herd contention, Taskinator utilizes the advanced FOR UPDATE SKIP LOCKED database directive during the event claiming phase."),
    body("When the notification fires, Pod 1 executes SELECT * FROM outbox_events WHERE status = 'PENDING' FOR UPDATE SKIP LOCKED LIMIT 100. It immediately acquires an exclusive row-level lock on rows 1 through 100. Milliseconds later, Pod 2 executes the exact same query. Because of the SKIP LOCKED directive, the PostgreSQL query planner intercepts Pod 2's request and instructs it to completely bypass the locked rows (1-100) without waiting."),
    body("Pod 2 instead reads and instantly locks rows 101 through 200. Pod 3 locks rows 201 through 300, and so on. The result is massive, lock-free concurrent throughput. Dozens of pods can drain the outbox queue simultaneously at maximum speed without polling loops, database deadlocks, or duplicate event publishing. Once the events are safely pushed to Kafka, the pods execute a bulk DELETE on the processed rows, keeping the outbox table small and the B-Tree indexes highly optimized."),
  ];
};
