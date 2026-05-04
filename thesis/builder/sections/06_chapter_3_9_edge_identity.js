const { h2, h3, body, emptyLine, insertImage, figCaption, codeLine, pageBreak } = require('../utils');

module.exports = function getChapter3_9() {
  return [
    h2("3.9 Edge Identity Architecture: Cloudflare Workers and Hono"),
    body("In a globally distributed, high-throughput system, performing authentication and authorization checks at the origin Kubernetes cluster introduces unacceptable latency, particularly for users located geographically distant from the primary data centers. To mitigate this, Taskinator pushes the Identity Service entirely to the CDN edge using Cloudflare Workers and the Hono framework."),
    
    emptyLine(),
    insertImage("diagram_edge_identity.png"),
    figCaption("Figure 3.9: Edge Identity and JWT Verification Architecture"),
    
    h3("3.9.1 Stateless Verification via V8 Isolates"),
    body("When a client browser executes a GraphQL HTTP POST request, the payload must traverse the Cloudflare CDN before reaching the origin Apollo Router. The Cloudflare Worker intercepts every request at the edge node physically closest to the user. Operating on lightweight V8 Isolates (which boast cold-start times of less than 5 milliseconds), the Hono application extracts the Authorization header."),
    body("Crucially, the verification of the JSON Web Token (JWT) or JSON Web Encryption (JWE) token is entirely stateless. The Edge Node uses the shared cryptographic public key to mathematically verify the signature without requiring a database lookup or a network request back to the central authentication database. This saves an average of 50-100ms per API call."),
    
    h3("3.9.2 Apollo Federation 2.0 Integration"),
    body("Once the JWT is verified, the Cloudflare Worker does not execute the business logic; it acts as a trusted reverse proxy. The worker extracts the decrypted user identity (e.g., the User UUID) from the JWT payload and injects it into a secure, internal HTTP header (e.g., x-user-id)."),
    body("The mutated request is then forwarded to the origin Apollo Gateway. Because the Gateway operates within a trusted VPC subnet, it implicitly trusts the x-user-id header, knowing it was securely injected by the edge firewall. The Apollo Gateway then utilizes Federation 2.0 to stitch the request and route it to the appropriate downstream subgraph (such as the Workspace Service), completely removing the cryptographic overhead from the core Node.js application servers."),
    
    pageBreak(),
  ];
};
