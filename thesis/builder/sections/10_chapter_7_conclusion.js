const { h1, h2, body, pageBreak } = require('../utils');

module.exports = function getChapter7() {
  return [
    // ══════════════════════════════════════════════════════════════
    // CHAPTER 7: CONCLUSION
    // ══════════════════════════════════════════════════════════════
    h1("7. CONCLUSION AND FUTURE WORK"),

    h2("7.1 Conclusion"),
    body("The design and implementation of Taskinator definitively prove that scaling complex, highly relational orchestration tools to handle extreme enterprise workloads (10,000+ RPS) is achievable by aggressively pursuing a non-blocking, Event-Driven Architecture."),
    body("By fundamentally challenging traditional synchronous CRUD philosophies, this thesis demonstrates the necessity of structural trade-offs. While sacrificing immediate Strong Consistency initially appears detrimental to user experience, the implementation of Optimistic UI caching and Zero-Fan-Out Real-Time SSE synchronization completely masks this eventual consistency from the end-user."),
    body("Furthermore, the introduction of advanced database patterns—specifically Custom Closure Tables updated asynchronously, wCTE Transactional Outboxes, and Chunked Self-Signaling deletions—provides a robust, academically sound blueprint for modern enterprise applications seeking to escape the limitations of monolithic database locking."),

    h2("7.2 Future Work"),
    body("While the current architecture successfully mitigates database write amplification, future research and development on the Taskinator platform should focus on the deployment topology. Investigating the transition from a Modular Monolith into a fully distributed microservice mesh utilizing Kubernetes auto-scaling (KEDA) based on Kafka lag metrics would provide even greater elastic resilience. Additionally, researching the integration of a specialized graph database (such as Neo4j) to offload the Reachability Engine entirely from PostgreSQL could yield further performance enhancements for projects exceeding one million nested tasks."),

    pageBreak(),
  ];
};
