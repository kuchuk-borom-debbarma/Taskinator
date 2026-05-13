const { Paragraph, TextRun } = require('docx');
const { h2, h3, body, codeBlock, emptyLine, insertImage, figCaption, F } = require('../utils');

module.exports = function getChapter6_5() {
  return [
    h2("6.5 Targeted Real-Time Routing Architecture"),
    body("Achieving real-time responsiveness at 10k RPS requires a highly efficient message delivery system. Traditional 'fan-out' approaches, where every event is broadcast to every server instance, do not scale as they saturate the network with redundant traffic. Taskinator implements a 'Targeted Routing' pattern using Redis."),

    h3("6.5.1 Distributed Connection Management"),
    body("When a client connects to a GraphQL subscription (via Server-Sent Events), the backend instance serving that connection generates a unique 'INSTANCE_ID'. The user's presence is then registered in a global Redis routing table, mapping their active Project ID to that specific instance."),
    
    codeBlock(`// Registration on Connection
const instanceKey = \`route:project:\${projectId}\`;
await redis.sadd(instanceKey, process.env.INSTANCE_ID);`),

    h3("6.5.2 The Air Traffic Controller Pattern"),
    body("A dedicated Kafka consumer, known as the 'Real-Time Router', acts as the air traffic controller for events. When a 'TaskUpdated' event arrives from Kafka, the router queries the Redis routing table:"),
    
    codeBlock(`// Targeted Routing Logic
const targetInstances = await redis.smembers(\`route:project:\${event.projectId}\`);

for (const instanceId of targetInstances) {
    await redis.publish(\`instance:\${instanceId}\`, JSON.stringify(event));
}`),

    h3("6.5.3 Zero-Fan-Out Scaling"),
    body("This architecture ensures that network traffic is only generated for server instances that are actively serving interested users. If a project has no online users, the event is dropped at the router level, consuming zero bandwidth on the connection nodes. This allows Taskinator to support thousands of concurrent server instances without hitting a network bottleneck."),

    emptyLine(),
    insertImage("diagram_targeted_routing.png"),
    figCaption("Figure 6.5: Targeted Redis-Based Routing for Distributed Real-Time Events"),

    h3("6.5.4 Local Bridge Delivery"),
    body("Each server instance listens to its own private Redis channel (\`instance:INSTANCE_ID\`). When a message arrives, it is injected into the local memory pubsub and delivered over the existing persistent HTTP connection to the client's browser, resulting in a sub-100ms end-to-end latency from database commit to UI re-render."),
  ];
};
