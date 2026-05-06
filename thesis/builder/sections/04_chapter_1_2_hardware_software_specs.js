const { h2, h4, body, bulletRuns, run, pageBreak } = require('../utils');

module.exports = function getChapter1_2() {
  return [
    h2("1.3 Hardware Specification"),
    body("The primary development, experimentation, and high-volume load-testing environment consisted of a modern computing system equipped with sufficient memory and processing power to handle large-scale concurrent requests, continuous event streaming, and intensive database container orchestration. The hardware configuration utilized during this research is detailed below:"),
    bulletRuns([run("Processor: ", true), run("Apple Silicon (M-series ARM64 architecture). This processor provided exceptional multi-core efficiency, which proved critical for maximizing the parallel execution capabilities of the Node.js / Bun worker threads and managing the Docker container orchestration overhead.")], "b1"),
    bulletRuns([run("System Memory: ", true), run("16 GB Unified Memory. High memory bandwidth was essential for running multiple persistent Docker containers—including PostgreSQL 16, Apache Kafka, Zookeeper, and Redis—simultaneously alongside the backend application services and the Vite-powered React frontend development server.")], "b1"),
    bulletRuns([run("Storage Layer: ", true), run("512 GB NVMe Solid State Drive (SSD). The extremely low latency of the NVMe storage ensured rapid read/write speeds for the PostgreSQL persistence layer, fast commit logs for the Kafka broker, and accelerated compilation times for the TypeScript codebase.")], "b1"),
    bulletRuns([run("Network Interface: ", true), run("A standard gigabit network interface capable of handling tens of thousands of local concurrent TCP connections during RPS stress testing without encountering port exhaustion or local loopback bottlenecks.")], "b1"),
    body("In addition to the primary local computing environment, simulated load testing required isolated environments to accurately model realistic network latency and jitter. Specialized tools, including Apache JMeter and custom Node.js asynchronous stress scripts, were executed on the same hardware, specifically tuned to utilize all available CPU cores to bombard the GraphQL API gateway at maximum capacity."),

    h2("1.4 Software Specification"),
    body("The Taskinator system is constructed using a modern, carefully curated full-stack JavaScript/TypeScript ecosystem. This ecosystem was selected specifically for its inherently non-blocking I/O model, rich typed interfaces, and expansive community support for event-driven paradigms."),

    h4("Frontend Presentation Layer:"),
    bulletRuns([run("Framework: ", true), run("React 18 with strict TypeScript enforcement.")], "b2"),
    bulletRuns([run("State Management: ", true), run("Apollo GraphQL Client (v3) utilizing normalized, in-memory caching to eliminate redundant network requests.")], "b2"),
    bulletRuns([run("Data Visualization: ", true), run("D3.js combined with custom SVG rendering logic to efficiently draw the interactive, dynamic Task Graph without triggering massive DOM reflows.")], "b2"),
    bulletRuns([run("Build Tooling: ", true), run("Vite, providing rapid Hot Module Replacement (HMR) during development and highly optimized, chunked production bundling.")], "b2"),

    h4("Backend Application Layer:"),
    bulletRuns([run("Runtime Environment: ", true), run("Node.js (v20+) and Bun. These runtimes leverage the V8 and JavaScriptCore engines respectively, exploiting the single-threaded event loop to handle massive concurrent I/O operations without the overhead of thread-per-request context switching.")], "b3"),
    bulletRuns([run("API Protocol: ", true), run("GraphQL (Apollo Server). This allows the frontend to execute flexible, heavily typed data queries, effectively preventing over-fetching and under-fetching of hierarchical task data.")], "b3"),
    bulletRuns([run("Programming Language: ", true), run("TypeScript, utilized to enforce strict domain boundaries, DTO (Data Transfer Object) schemas, and compile-time safety across the entire monorepo.")], "b3"),
    bulletRuns([run("Database Query Builder: ", true), run("Kysely. A robust, type-safe SQL query builder that ensures compile-time safety for complex, multi-stage Common Table Expressions (CTEs), JSON aggregations, and complex lateral joins.")], "b3"),

    h4("Data Persistence and Infrastructure Layer:"),
    bulletRuns([run("Primary Relational Database: ", true), run("PostgreSQL 16. Chosen for its unparalleled reliability and advanced feature set. The system heavily exploits PostgreSQL-specific mechanics, including recursive CTEs, LISTEN/NOTIFY pub/sub for reactive outbox polling, and the SKIP LOCKED directive for highly concurrent queue processing.")], "b4"),
    bulletRuns([run("Event Broker: ", true), run("Apache Kafka. Acts as the durable, partitioned backbone of the Event-Driven Architecture. Kafka guarantees strict message ordering via Project ID partitioning keys, ensuring that causally related events are processed sequentially.")], "b4"),
    bulletRuns([run("In-Memory Datastore: ", true), run("Redis. Utilized purely for ephemeral operations and the zero-fan-out targeted routing of real-time Server-Sent Events (SSE) across distributed backend pods.")], "b4"),
    h4("Visualization and Media Production:"),
    bulletRuns([run("Architectural Animation: ", true), run("Remotion. Used to programmatically generate the high-fidelity architectural presentations and video walk-throughs included with this thesis. Remotion allows for React-based animation of complex distributed system state transitions.")], "b5"),
    bulletRuns([run("Diagramming: ", true), run("Mermaid.js and Playwright. The architectural diagrams are authored in Mermaid markdown and programmatically rendered into high-resolution PNG assets using a custom Playwright-based conversion pipeline.")], "b5"),

    h4("Quality Assurance and Monitoring:"),
    bulletRuns([run("End-to-End Testing: ", true), run("Playwright. Used for automated, headless browser testing of the reactive task graph and real-time SSE updates across multiple concurrent user sessions.")], "b6"),
    bulletRuns([run("Unit and Integration Testing: ", true), run("Vitest. A high-performance testing framework that leverages Vite's transformation engine for extremely fast test execution during development.")], "b6"),
    bulletRuns([run("Structured Logging: ", true), run("Pino. A low-overhead Node.js logger used to capture high-velocity event traces and performance metrics without introducing significant I/O blocking.")], "b6"),
    body("This carefully selected, highly tuned technology stack allows the Taskinator application to remain strictly asynchronous—from the initial HTTP request traversing the GraphQL gateway, all the way down to the database row-lock level—fully satisfying the core research objective of non-blocking, high-throughput execution."),

    pageBreak(),
  ];
};
