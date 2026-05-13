const { Paragraph, TextRun } = require('docx');
const { h2, h3, body, emptyLine, insertImage, figCaption, F } = require('../utils');

module.exports = function getChapter2_5() {
  return [
    h2("2.5 Theoretical Foundations of Distributed Systems"),
    body("To understand the architectural decisions made in Taskinator, it is necessary to explore the underlying theoretical principles that govern high-throughput distributed systems. This section provides a deep dive into the CAP Theorem, PACELC, and the mathematical properties of Eventual Consistency."),

    h3("2.5.1 The CAP Theorem and the Trade-off for Availability"),
    body("Formulated by Eric Brewer in 2000, the CAP theorem states that any distributed data store can only provide two of the following three guarantees: Consistency (every read receives the most recent write or an error), Availability (every request receives a response), and Partition Tolerance (the system continues to operate despite an arbitrary number of messages being dropped or delayed by the network)."),
    body("Taskinator is explicitly designed as an AP (Available and Partition Tolerant) system. In the context of global project management, a momentary loss of strict consistency—such as a user seeing a task count that is 200ms out of date—is a far more acceptable trade-off than the entire platform becoming unresponsive during a network jitter or a high-contention write period."),

    h3("2.5.2 PACELC: Beyond the CAP Theorem"),
    body("The PACELC theorem extends CAP by addressing the trade-off between latency and consistency even when the system is operating normally (in the absence of partitions). PACELC stands for: if there is a Partition (P), the system chooses between Availability (A) and Consistency (C); Else (E), the system chooses between Latency (L) and Consistency (C)."),
    body("Taskinator prioritizes Latency (L) over Consistency (C) in its normal state. By utilizing asynchronous Kafka workers to update aggregate counts and closure tables, the system ensures sub-50ms response times for mutations. The 'Consistency Penalty' is paid in the background, ensuring that the human user never experiences the 'Latency tax' associated with distributed coordination."),

    h3("2.5.3 Mathematical Properties of Eventual Consistency"),
    body("Eventual consistency is a consistency model used in distributed computing that informally guarantees that, if no new updates are made to a given data item, eventually all accesses to that item will return the last updated value. Taskinator implements a specific sub-type known as 'Monotonic Read Consistency' and 'Read-Your-Writes Consistency'."),
    body("Through the use of Apollo's local cache modification, the system provides an illusion of strong consistency to the acting user. When User A updates a task, their local cache is updated immediately (Read-Your-Writes), while the rest of the world converges to that state via the 250ms event pipeline. This hybrid approach provides the best of both worlds: the performance of a distributed system with the user experience of a local application."),
  ];
};
