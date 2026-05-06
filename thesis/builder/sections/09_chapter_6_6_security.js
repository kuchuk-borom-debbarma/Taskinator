const { Paragraph, TextRun, Table, WidthType } = require('docx');
const { h2, h3, h4, body, emptyLine, insertImage, figCaption, F, tblHeader, tblRow, tblCaption, CONTENT_W } = require('../utils');

module.exports = function getChapter6_6() {
  return [
    h2("6.6 Advanced Security Architecture and Threat Mitigation"),
    body("In a high-throughput project orchestration platform, security is not merely an auxiliary concern but a foundational pillar. Taskinator implements a multi-layered security strategy encompassing stateless edge authentication, granular Attribute-Based Access Control (ABAC), and cryptographically secured inter-service communication."),

    h3("6.6.1 Stateless Edge Authentication and JWT/JWE"),
    body("To avoid the 'Authentication Bottleneck' where every API request requires a database lookup to verify a session, Taskinator utilizes a stateless JWT (JSON Web Token) architecture. These tokens are verified at the Cloudflare Edge nodes using V8-Isolate based workers. This architecture ensures that invalid requests are rejected at the network perimeter, preventing resource exhaustion on the internal service backbone."),
    body("For sensitive operational data, the platform employs JWE (JSON Web Encryption), ensuring that even if a token is intercepted, its internal claims remain unreadable without the corresponding private key stored in the secure Vault environment."),

    h3("6.6.2 Granular Attribute-Based Access Control (ABAC)"),
    body("Traditional Role-Based Access Control (RBAC) is often too coarse for complex hierarchies. Taskinator transitions to an ABAC model where permissions are evaluated dynamically based on the subject (User), the object (Task/Project), and the environment (Time, IP, Team Context)."),
    body("This evaluation happens atomically within the PostgreSQL transaction using Row Level Security (RLS) policies, ensuring that even if an application-layer vulnerability is exploited, the database remains the final authoritative barrier against unauthorized data access."),

    h3("6.6.3 Inter-Service Security: mTLS and Kafka ACLs"),
    body("Internal communication between the Workspace service, the Smart Aggregator, and the Outbox Relay is secured via Mutual TLS (mTLS). Each service is issued a unique identity certificate, and connections are only established if both parties can prove their identity."),
    body("Furthermore, Kafka topics are protected by strict Access Control Lists (ACLs). The Outbox Relay is granted 'Write-Only' access to the raw event topics, while the Smart Aggregator is granted 'Read-Only' access, effectively preventing unauthorized event injection or internal data leaks."),

    emptyLine(),
    tblCaption("Table 6.6.1: Security Layer Responsibilities"),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [3000, 6026],
      rows: [
        tblHeader(["Layer", "Primary Security Mechanism"], [3000, 6026]),
        tblRow(["Edge", "Stateless JWT Verification & Rate Limiting"], [3000, 6026]),
        tblRow(["Network", "VPC Isolation & Mutual TLS (mTLS)"], [3000, 6026], true),
        tblRow(["Service", "Role-Based / Attribute-Based Access Control"], [3000, 6026]),
        tblRow(["Data", "PostgreSQL Row Level Security (RLS)"], [3000, 6026], true),
        tblRow(["Audit", "Immutable Outbox Logs & Kafka Retention"], [3000, 6026]),
      ]
    }),
  ];
};
