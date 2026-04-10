# Future Backend Features

This document outlines upcoming features designed to increase the resiliency, consistency, and overall "backend skill" level of the Taskinator modular monolith.

## 1. Transactional Outbox Pattern

**Goal:** Guarantee 100% data consistency between PostgreSQL database state and Kafka event publication (solving the dual-write problem).

### Implementation Plan:
1. **Database Update:** Create an `outbox_events` table (Columns: `id`, `topic`, `payload`, `created_at`, `status`).
2. **Transaction Scope:** Whenever a service modifies a domain entity (e.g., updating a Task), it must insert the corresponding `DomainEvent` into the `outbox_events` table within the *same database transaction*.
3. **Background Worker:** Implement an asynchronous worker (or use a CDC tool like Debezium) that continuously polls the `outbox_events` table for unprocessed events.
4. **Publish & Commit:** The worker publishes the event to Kafka and, upon successful acknowledgment from the broker, marks the outbox record as 'processed' (or deletes it).

*Resume highlight:* "Implemented the Transactional Outbox pattern to guarantee exactly-once message delivery semantics and avoid dual-write inconsistencies in a high-scale environment."

---

## 2. Webhooks System

**Goal:** Allow users to register a URL to receive real-time, asynchronous HTTP callbacks when specific domain events happen (e.g., Task Completion).

### Implementation Plan:
1. **Core Domain:** Create a `WebhookSubscription` table (Columns: `user_id`, `project_id`, `url`, `events[]`, `secret_key`).
2. **Delivery Workers:** Set up a dedicated background worker group specifically for sending outbound HTTP requests to prevent blocking the main Kafka consumers.
3. **Security:** Sign the outbound payload using HMAC-SHA256 with the user's `secret_key` so they can verify the webhook originated from this system.

*Resume highlight:* "Engineered a secure, highly-available external Webhook dispatch system featuring payload signature verification (HMAC)."

---

## 3. Advanced Retry Engine & Dead Letter Queue (DLQ)

**Goal:** Ensure external callbacks (like webhooks) and transient internal failures are handled gracefully without losing data or stalling the system.

### Implementation Plan:
1. **Exponential Backoff:** If a webhook HTTP POST fails (e.g., user server is down), the worker should re-queue the task with exponential backoff (retry after 5s, 30s, 5m, 1h).
2. **Circuit Breaking:** If a specific webhook URL fails consistently consecutive times, "trip the circuit" and pause the webhook to protect the system's outbound queue.
3. **Dead Letter Queue (DLQ):** After the maximum number of retries is reached without success, the event should be moved to a DLQ table or Kafka DLQ topic for manual inspection or permanent archival.


### TODO RAW
- Direct children task complete Example :- 1/4