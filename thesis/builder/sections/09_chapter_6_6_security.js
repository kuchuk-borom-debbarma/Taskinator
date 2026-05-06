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

    h3("6.6.4 Leaky-Bucket Rate Limiting at the Edge"),
    body("To protect against Distributed Denial of Service (DDoS) attacks and malicious API scraping, Taskinator implements a Leaky-Bucket rate limiting algorithm at the Cloudflare edge. Every User ID and IP address is assigned a request quota. Once the threshold is exceeded, subsequent requests are dropped with an HTTP 429 status code before they can penetrate the origin server cluster."),
    
    h3("6.6.5 Data Encryption at Rest: AES-256"),
    body("While mTLS secures data in transit, Taskinator ensures that all sensitive data persisted in PostgreSQL is encrypted at rest using industry-standard AES-256 encryption. This protects against scenarios where physical storage media is compromised or improperly decommissioned. The encryption keys are managed by a dedicated Hardware Security Module (HSM) or a cloud-native key management service (AWS KMS / Google Cloud KMS)."),

    emptyLine(),
    tblCaption("Table 6.6.1: Security Layer Responsibilities and Mitigation Strategies"),
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
