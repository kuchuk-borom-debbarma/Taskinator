const { h1, h2, h3, body, emptyLine, insertImage, figCaption } = require('../utils');

module.exports = function getChapter7_1() {
  return [
    h1("7. IMPLEMENTATION, AUTOMATION, AND TESTING"),
    body("An architecture optimized for 10,000 RPS is fundamentally useless if the business logic is flawed or the database constraints fail under concurrency. Taskinator's reliability and resilience under extreme event-driven load is guaranteed through a rigorous, multi-tiered testing methodology that completely eschews unreliable mocking in favor of true containerized testing."),

    h2("7.1 Containerized Integration Testing via TestContainers"),
    body("Unit testing complex SQL queries against mock objects (such as in-memory SQLite instances or mocked driver responses) is fundamentally flawed. These mocks fail to validate specific PostgreSQL dialect mechanics, trigger cascades, jsonb aggregations, and concurrent locking behaviors (such as the SKIP LOCKED functionality)."),
    emptyLine(),
    insertImage("diagram_test_architecture.png"),
    figCaption("Figure 7.1: Containerized Testing Architecture and Mutation Testing"),
    
    h3("7.1.1 Ephemeral Test Environments"),
    body("Taskinator utilizes the Jest testing framework integrated directly with TestContainers (a Docker orchestration library for testing). Before the test suite executes, the testing framework programmatically spins up a pristine, ephemeral PostgreSQL 16 container, alongside temporary Redis and Kafka broker containers."),
    body("The entire database schema migration suite is executed against this live, containerized database. Following this, real SQL wCTE mutations are fired against the container. This guarantees that complex logic—such as the targeted outbox polling and the semantic aggregator folding—performs exactly as intended in a production-equivalent environment. Once the test suite concludes, the Docker daemon automatically destroys the containers, ensuring absolute isolation between test runs and preventing data bleed."),
  ];
};
