const { h2, h3, body, emptyLine, insertImage, figCaption, codeLine, pageBreak } = require('../utils');

module.exports = function getChapter3_9() {
  return [
    h2("3.9 Edge Identity Architecture: Global Authentication via Cloudflare Workers"),
    body("In a globally distributed, high-throughput ecosystem, the latency incurred by performing authentication and authorization checks at the central origin cluster can be a significant deterrent to a fluid user experience. Traditional architectures, where every incoming API request must traverse the globe to a primary data center—only to be rejected if the session is invalid—result in wasted bandwidth and increased server load. To mitigate these 'Identity Bottlenecks', Taskinator utilizes a cutting-edge Edge Identity Service, offloading the entire authentication perimeter to the network edge using Cloudflare Workers and the Hono web framework."),
    
    emptyLine(),
    insertImage("diagram_edge_identity.png"),
    figCaption("Figure 3.9: Edge Identity and Stateless JWT/JWE Verification Architecture"),
    
    h3("3.9.1 Stateless Verification via High-Performance V8 Isolates"),
    body("The Cloudflare Worker environment is built upon the concept of 'V8 Isolates'—lightweight, isolated execution contexts that eliminate the cold-start overhead typically associated with standard containerized serverless functions. When a client browser initiates a GraphQL POST request, the payload is intercepted by the edge node geographically closest to the user's physical location. Within this isolate, the Hono-based identity application extracts the 'Authorization' header containing the user's secure token."),
    body("The architectural brilliance of this layer lies in its entirely stateless nature. The edge node possesses the shared cryptographic public keys required to mathematically verify the JSON Web Token (JWT) or JSON Web Encryption (JWE) signature. This verification occurs locally within the V8 isolate, requiring zero network roundtrips to a central authentication database or a third-party identity provider. By validating tokens at the perimeter, Taskinator reduces API latency by an average of 50-150ms per request while simultaneously shielding the internal backbone from unauthorized or malicious traffic."),
    
    h3("3.9.2 Trusted Header Injection and Apollo Federation Integration"),
    body("Upon successful verification of the token's cryptographic integrity, the Cloudflare Worker transitions from a security gatekeeper to a trusted reverse proxy. The worker extracts the decrypted user identity—typically a unique UUID and a set of permission scopes—from the token's payload. These attributes are then injected into a set of 'Trusted Internal Headers' (e.g., 'x-taskinator-user-id')."),
    body("The request is then forwarded over an optimized backbone link to the origin Apollo Gateway. Because the gateway operates within a physically isolated Virtual Private Cloud (VPC), it is configured to implicitly trust these internal headers, knowing that they could only have been injected by the edge firewall. This allows the internal Apollo Federation 2.0 subgraphs (such as the Workspace and Analytics services) to process mutations and queries without ever having to re-verify the user's signature, effectively offloading the entire cryptographic compute burden to the globally distributed CDN infrastructure."),
    body("This architecture not only enhances performance but also simplifies the development of internal microservices, as they can focus entirely on domain logic while remaining secure by design. Furthermore, the use of JWE for sensitive payloads ensures that the user's session data remains encrypted at rest and in transit throughout the entire edge-to-origin journey."),
    
    pageBreak(),
  ];
};
