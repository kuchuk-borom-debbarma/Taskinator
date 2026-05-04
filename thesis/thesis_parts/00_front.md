# A THESIS REPORT
## On
## Design and Implementation of a High-Throughput Event-Driven Project and Task Management Application

**Submitted by**
Kuchuk Borom Debbarma
In partial fulfillment for the award of the degree of
**M.Tech (CSE)**

**Under the Guidance of**
Dr. Abhijit Biswas
Coordinator CSE & CA

**DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING**
**ICFAI Technical School Faculty of Science and Technology**
Course Code: CSE620P
Course Title: Thesis Report II
2025-2026

---

## Declaration of Student

I hereby declare that the project entitled "Design and Implementation of a High-Throughput Event-Driven Project and Task Management Application" submitted for the Thesis Report II CSE620P, is my original work and the project has not formed the basis for the award of any other degree, diploma, fellowship or any other similar titles.

**Date:** 20/05/2026
**Signature:** _________________
**Name:** Kuchuk Borom Debbarma
**Department of CSE**

---

## CERTIFICATE

This is to certify that the project titled "Design and Implementation of a High-Throughput Event-Driven Project and Task Management Application" is the bonafide work carried out by Kuchuk Borom Debbarma student of M.Tech of Department of Computer Science and Engineering, during the Thesis report 2026, in partial fulfillment of the requirements for the award of the degree and that the project has not formed the basis for the award previously of any other degree, diploma, fellowship or any other similar title.

**Dr. Abhijit Biswas**
Coordinator CSE & CA
**Dr. Saptarshi Chakraborty**
HOD, CSE
**Dr. Prasanta Kumar Sinha**
Principal, ITS

---

## ABSTRACT

The demand for highly performant project management tools has grown exponentially as modern enterprises manage complex, deeply nested workflows. Traditional task management applications rely on strictly normalized database schemas and synchronous APIs that struggle to scale when subjected to massive task hierarchies, real-time synchronization demands, and high-frequency event triggers. 

This thesis presents the design, implementation, and performance evaluation of "Taskinator," a full-stack project and task management application engineered for extreme scalability and real-time responsiveness. The system integrates a modern, interactive React-based frontend featuring a dynamic Task Graph visualization with a high-performance, event-driven Node.js backend. 

The core contribution of this thesis is a comprehensive architectural framework capable of sustaining 10,000 Requests Per Second (RPS) without sacrificing data integrity. This is achieved through deep technical optimizations across three primary layers. First, at the Database Layer, the system implements a Custom Closure Table pattern (Task Reachability Engine) for ultra-fast querying of infinite task hierarchies, combined with Optimistic Locking to prevent distributed race conditions. Second, at the Event-Driven Architecture (EDA) Layer, a Transactional Outbox pattern is powered by atomic Data-Modifying Common Table Expressions (wCTE). Pervasive batching begins at the producer level, and reactive PostgreSQL `LISTEN/NOTIFY` mechanics combined with `SKIP LOCKED` concurrency controls ensure zero-loss event publishing across horizontally scaled pods. Third, at the Consumer Layer, a Smart Batch Aggregator performs strict chronological sorting and semantic event folding to trim down batches into net deltas, drastically reducing database write amplification and preventing infinite recursive loops.

Crucially, this thesis explores the necessary architectural trade-offs required to achieve this scale, specifically analyzing the drawbacks of Eventual Consistency. To maintain high read-throughput, the system employs aggressive Denormalization strategies for aggregate counts and user metadata. Instead of re-calculating counts from the source, the system processes calculated deltas asynchronously. Furthermore, real-time client updates are achieved via a zero-fan-out targeted routing mechanism using Redis and Server-Sent Events (SSE), directly intercepted by the Apollo GraphQL cache for instant UI reconciliation.

Experimental evaluations demonstrate that the application's asynchronous, batch-first processing model—including chunked self-signaling recursive deletions—successfully eliminates long-transaction database locks. The proposed architecture proves that by combining strict data access patterns, reactive frontend visualization, and a highly tuned event-driven backend, complex orchestration tools can achieve extreme scalability.

---

## ACKNOWLEDGEMENT

I would like to express my special thanks of gratitude to my guide Dr. Abhijit Biswas for his able guidance and support in completing the project. A special thanks to the university administration, including the Principal, HOD, and Dean, for providing us with the necessary resources and opportunities to gain knowledge. 

I would also like to thank God for giving me the strength and capability to complete this project. Finally, I extend my sincere thanks to my family, friends, and the entire ICFAI family for their continuous support.

**Name:** Kuchuk Borom Debbarma
**Course:** M.Tech CSE

---

## List of Figures

1. Figure 3.1: Full-Stack System Architecture — Taskinator
2. Figure 3.2: Core Domain Entity-Relationship Model
3. Figure 3.3: Task Reachability Engine — Closure Table Cross-Join Expansion
4. Figure 4.1: Transactional Outbox Workflow using wCTE
5. Figure 4.2: Concurrent Outbox Polling: Mitigating the Thundering Herd with SKIP LOCKED
6. Figure 4.3: Smart Batch Aggregator Data Flow and Semantic Folding
7. Figure 4.4: Chunked Self-Signaling Deletion ("The Bubbling Effect")
8. Figure 5.1: Targeted Redis Routing for Real-time Server-Sent Events (SSE)
9. Figure 5.2: Apollo Client SSE State Reconciliation Sequence
10. Figure 6.1: Automation Trigger Engine and System Actor Flow
11. Figure 6.2: Containerized Testing Architecture and Mutation Testing

## List of Tables

1. Table 6.1: Performance Metrics at 10,000 RPS
2. Table 6.2: Chunked vs Unbounded Deletion Benchmarks

---

## Table of Contents

1. INTRODUCTION
2. LITERATURE SURVEY
3. SYSTEM ANALYSIS AND DESIGN
4. EVENT-DRIVEN PIPELINE (EDA) IMPLEMENTATION
5. FRONTEND ARCHITECTURE AND REAL-TIME SYNCHRONIZATION
6. IMPLEMENTATION, AUTOMATION, AND TESTING
7. CONCLUSION AND FUTURE WORK
8. REFERENCES

---

