const { Table, WidthType } = require('docx');
const { h2, h3, body, emptyLine, insertImage, figCaption, tblHeader, tblRow, tblCaption, CONTENT_W } = require('../utils');

module.exports = function getChapter3_11() {
  return [
    h2("3.11 Evaluation of Real-Time Communication Protocols"),
    body("The choice of protocol for real-time data synchronization is a critical factor in the system's ability to scale. This section evaluates the three primary candidates: WebSockets, Long Polling, and Server-Sent Events (SSE), justifying the selection of SSE for Taskinator."),

    h3("3.11.1 Comparison of Transport Mechanisms"),
    body("WebSockets provide a full-duplex, bidirectional communication channel over a single TCP connection. While powerful, they introduce significant overhead in terms of state management and connection persistence at the server tier. Furthermore, WebSockets often require complex load balancing configurations to handle proxy-level timeouts and heartbeat signals."),
    body("Long Polling, while simple to implement, is extremely inefficient for high-frequency updates, as each update requires a new HTTP request-response cycle, leading to massive header overhead and socket churn."),
    body("Server-Sent Events (SSE) provide a unidirectional, persistent stream from the server to the client. SSE is built directly on top of standard HTTP/1.1 and HTTP/2, making it highly compatible with existing load balancers, firewalls, and edge networks like Cloudflare."),

    emptyLine(),
    tblCaption("Table 3.11.1: Real-Time Protocol Comparison"),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [3000, 2000, 2000, 2026],
      rows: [
        tblHeader(["Feature", "WebSockets", "SSE", "Long Polling"], [3000, 2000, 2000, 2026]),
        tblRow(["Directionality", "Bidirectional", "Unidirectional", "Unidirectional"], [3000, 2000, 2000, 2026]),
        tblRow(["Protocol Compatibility", "Custom (Upgrade)", "Standard HTTP", "Standard HTTP"], [3000, 2000, 2000, 2026], true),
        tblRow(["Auto-Reconnection", "Manual", "Native", "N/A"], [3000, 2000, 2000, 2026]),
        tblRow(["Proxy/Firewall Friendly", "Low", "High", "High"], [3000, 2000, 2000, 2026], true),
      ]
    }),

    h3("3.11.2 Architectural Fit for Taskinator"),
    body("Taskinator utilizes GraphQL mutations (HTTP POST) for all client-to-server communication. This means the 'Upstream' path is already well-defined and performant. Therefore, the system only requires a reliable 'Downstream' path for reactive updates. SSE fits this requirement perfectly, providing a lightweight, native, and highly scalable channel for pushing JSON deltas to the client without the operational complexity of managing bidirectional WebSocket states."),
  ];
};
