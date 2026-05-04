const { h1, h2, body, pageBreak } = require('../utils');

module.exports = function getChapter8() {
  return [
    // ══════════════════════════════════════════════════════════════
    // CHAPTER 8: CONCLUSION
    // ══════════════════════════════════════════════════════════════
    h1("8. CONCLUSION AND FUTURE WORK"),

    h2("8.1 Conclusion"),
    body("The design and implementation of Taskinator definitively prove that scaling complex, highly relational orchestration tools to handle extreme enterprise workloads (10,000+ RPS) is achievable by aggressively pursuing a non-blocking, Event-Driven Architecture."),
    body("By fundamentally challenging traditional synchronous CRUD philosophies, this thesis demonstrates the necessity of structural trade-offs. While sacrificing immediate Strong Consistency initially appears detrimental to user experience, the implementation of localized Optimistic UI caching and Zero-Fan-Out Real-Time SSE synchronization completely masks this eventual consistency from the end-user. The perceived performance of the system remains instantaneous."),
    body("Furthermore, the introduction of advanced database patterns—specifically Custom Closure Tables updated asynchronously, wCTE Transactional Outboxes, and Chunked Self-Signaling recursive deletions—provides a robust, academically sound blueprint for modern enterprise applications seeking to escape the limitations of monolithic database locking and B-Tree contention."),

    h2("8.2 Future Work"),
    body("While the current architecture successfully mitigates database write amplification and network saturation, future research and development on the Taskinator platform should focus on the deployment topology. Investigating the transition from a Modular Monolith into a fully distributed microservice mesh utilizing Kubernetes Event-Driven Autoscaling (KEDA) based on exact Kafka partition lag metrics would provide even greater elastic resilience."),
    body("Additionally, researching the integration of a specialized graph database engine (such as Neo4j or Amazon Neptune) to offload the Reachability Engine entirely from PostgreSQL could yield further performance enhancements for organizations managing projects that exceed millions of nested hierarchical tasks."),

    pageBreak(),
  ];
};
