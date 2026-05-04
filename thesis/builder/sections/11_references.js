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
  ];
};
