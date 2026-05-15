# Taskinator-v2

**The High-Performance Workflow Orchestration Engine.**

Taskinator-v2 is a state-of-the-art workflow engine designed for massive task hierarchies and extreme throughput. It combines the flexibility of a modular monolith with the scalability of an event-driven architecture to handle 10k+ requests per second.

## 🚀 Key Capabilities

- **Infinite Task Nesting**: Break down complex projects into deeply nested sub-tasks using performance-optimized Materialized Paths.
- **Real-Time Synchronization**: Instant UI updates across the cluster powered by targeted Redis/Kafka routing and GraphQL Subscriptions (SSE).
- **Enterprise Reliability**: Atomic operations via Transactional Outbox patterns and wCTEs to ensure zero event loss.

## 🏗 Project Structure

- `modular-monolith/`: The core backend engine built with Bun/Node.js, PostgreSQL, Kafka, and Redis.
- `ui-v1/`: Next.js-based professional dashboard for workflow management.
- `remotion/`: High-fidelity programmatic video suite orchestrating 18 premium architectural simulations and dynamic UI deep-dives.

## 📖 Documentation

For detailed technical guides, please refer to the `modular-monolith/docs` directory:

- [Architecture Overview](./modular-monolith/docs/Architecture-Overview.md)
- [Modular Monolith Design](./modular-monolith/docs/Modular-Monolith-Design.md)
- [Event-Driven Flows](./modular-monolith/docs/Event-Driven-Flows.md)
- [Getting Started](./modular-monolith/docs/Getting-Started.md)

---
Built for scale. Engineered for performance.
