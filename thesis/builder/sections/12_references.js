const { h1, emptyLine, numbered } = require('../utils');

module.exports = function getReferences() {
  return [
    // ══════════════════════════════════════════════════════════════
    // REFERENCES
    // ══════════════════════════════════════════════════════════════
    h1("REFERENCES"),
    emptyLine(),
    numbered("Kleppmann, M. (2017). Designing Data-Intensive Applications: The Big Ideas Behind Reliable, Scalable, and Maintainable Systems. O'Reilly Media.", "n5"),
    numbered("Celko, J. (2012). Joe Celko's Trees and Hierarchies in SQL for Smarties. Morgan Kaufmann.", "n5"),
    numbered("Richardson, C. (2018). Microservices Patterns: With examples in Java. Manning Publications.", "n5"),
    numbered("Stopford, B. (2018). Designing Event-Driven Systems: Concepts and Patterns for Streaming Services with Apache Kafka. O'Reilly Media.", "n5"),
    numbered("Brewer, E. A. (2000). Towards robust distributed systems. Proceedings of the Nineteenth Annual ACM Symposium on Principles of Distributed Computing - PODC '00.", "n5"),
    numbered("Fowler, M. (2006). Patterns of Enterprise Application Architecture. Addison-Wesley Professional.", "n5"),
    numbered("Banks, A. & Gupta, R. (2014). MQTT Version 3.1.1. OASIS Standard.", "n5"),
    numbered("Abadi, D. J. (2012). Consistency Tradeoffs in Modern Distributed Database System Design: CAP is Only Part of the Story. IEEE Computer Society.", "n5"),
    numbered("Gilbert, S., & Lynch, N. (2002). Brewer's conjecture and the feasibility of consistent, available, partition-tolerant web services. ACM SIGACT News.", "n5"),
    numbered("Tanenbaum, A. S., & van Steen, M. (2007). Distributed Systems: Principles and Paradigms. Pearson Prentice Hall.", "n5"),
    numbered("Newman, S. (2015). Building Microservices: Designing Fine-Grained Systems. O'Reilly Media.", "n5"),
    numbered("Vogels, W. (2009). Eventually consistent. Communications of the ACM.", "n5"),
    numbered("Shapiro, M., et al. (2011). Conflict-free replicated data types. International Symposium on Stabilization, Safety, and Security of Distributed Systems.", "n5"),
    numbered("Kreps, J., Narkhede, N., & Rao, J. (2011). Kafka: A distributed messaging system for log processing. Proceedings of the NetDB.", "n5"),
    numbered("Borthakur, D. (2007). The Hadoop distributed file system: Architecture and design. Apache Software Foundation.", "n5"),
    numbered("Decandia, G., et al. (2007). Dynamo: Amazon's highly available key-value store. SOSP.", "n5"),
    numbered("Ongaro, D., & Ousterhout, J. (2014). In search of an understandable consensus algorithm. USENIX Annual Technical Conference.", "n5"),
  ];
};
