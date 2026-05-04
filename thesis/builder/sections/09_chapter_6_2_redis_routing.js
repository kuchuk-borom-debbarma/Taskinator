const { h2, body, emptyLine, insertImage, figCaption } = require('../utils');

module.exports = function getChapter6_2() {
  return [
    h2("6.2 Zero-Fan-Out Targeted Routing via Redis"),
    body("In standard real-time web architectures, the prevailing pattern for distributing events across a horizontally scaled cluster of backend nodes is \"Pub/Sub Fan-Out\" (typically implemented via a naive Redis PUBLISH). If a user marks a task as complete, the server handling that request publishes the event to Redis, which blindly broadcasts it to every single Node.js instance in the cluster. Every instance then checks its local memory to see if it holds a WebSocket connection for a user who cares about that project."),
    body("At 10,000 RPS, this creates an enormous volume of useless internal network traffic, essentially turning the internal Pub/Sub network into a localized Distributed Denial of Service (DDoS) attack. A single event is multiplied across 50 pods, forcing 49 of them to process and instantly discard the payload."),
    emptyLine(),
    insertImage("redis_targeted_routing.png"),
    figCaption("Figure 6.2: Targeted Redis Routing for Real-time Server-Sent Events (SSE)"),
    body("Taskinator implements a highly tuned Zero-Fan-Out Targeted Routing layer utilizing Redis data structures."),
    body("When a user opens the React frontend dashboard for Project X, their browser establishes an SSE connection with a specific backend pod (e.g., Node Instance 2). Instance 2 immediately registers this connection in Redis by executing a Set Add operation: SADD route:project:X \"Instance2\"."),
    body("Later, when an asynchronous Kafka event occurs (e.g., a background worker completes a bulk task assignment for Project X), the Real-Time Router (a dedicated Kafka consumer module) executes a query to determine exactly where the interested clients are located: SMEMBERS route:project:X. Redis rapidly returns the specific array: [\"Instance2\"]. The Router then issues a highly targeted publish command explicitly to that instance's private channel: PUBLISH instance:Instance2 payload."),
    body("If SMEMBERS returns an empty array, it definitively means no users are currently viewing the project, and the Router drops the event instantly into the void without touching the Pub/Sub network. This architecture completely eliminates Fan-Out, reducing network traffic linearly relative to the number of active, observing connections rather than the total number of system instances."),
  ];
};
