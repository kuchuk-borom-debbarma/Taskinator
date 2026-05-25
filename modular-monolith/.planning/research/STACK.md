# Technology Stack: Project-Level Throttling

**Project:** Project-Level Throttling
**Researched:** 2024-05-24

## Recommended Stack

### Core Framework (Node.js)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `rate-limiter-flexible` | ^2.4.0 | API Rate Limiting | Best-in-class performance, atomic Redis increments, and failover support. |
| `Bottleneck` | ^2.19.0 | Task Throttling | Native `.Group()` feature for multi-tenancy; perfect for Reachability Engine updates. |
| `ioredis` | ^5.0.0 | Redis Client | Required for distributed state management across Node.js instances. |

### Database (Postgres)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `pg` (node-postgres) | ^8.0.0 | DB Driver | Supports `SET LOCAL` within transactions for project-scoped timeouts. |
| `pg_stat_statements` | Extension | Monitoring | Essential for identifying which projects are consuming the most DB time. |

### Infrastructure (Kafka)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Kafka Client Quotas | Native | I/O Throttling | Native broker-side enforcement of `producer_byte_rate` and `consumer_byte_rate`. |

### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `prom-client` | ^14.0.0 | Observability | To track "429 Too Many Requests" and "Query Cancelled" events per project. |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Task Queue | `Bottleneck` | `BullMQ Pro` | BullMQ Pro supports groups but is a paid product; Bottleneck is free and highly flexible for throttling. |
| DB Throttling| `SET LOCAL` | `ALTER ROLE` | Monoliths usually share a single DB user; `ALTER ROLE` would require one user per project (high overhead). |
| Rate Limiting | `rate-limiter-flexible`| `express-rate-limit`| `express-rate-limit` is too simple and lacks robust distributed clustering features. |

## Installation

```bash
# Core
npm install rate-limiter-flexible bottleneck ioredis

# Types
npm install -D @types/bottleneck
```

## Sources

- [rate-limiter-flexible Documentation](https://github.com/animir/node-rate-limiter-flexible)
- [Bottleneck Documentation](https://github.com/SGrondin/bottleneck)
- [PostgreSQL: SET LOCAL statement_timeout](https://www.postgresql.org/docs/current/runtime-config-client.html)
- [Kafka Quotas Guide](https://kafka.apache.org/documentation/#quotas)
