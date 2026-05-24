// Video structure: 10 minutes at 30fps = 18000 frames
// Chapters:
// 00:00 - 00:40 (1200f)  → Cold Open / Title
// 00:40 - 01:30 (1500f)  → Architecture Overview (Modular Monolith)
// 01:30 - 02:20 (1500f)  → Tech Stack deep dive
// 02:20 - 03:10 (1500f)  → Database Schema (materialized paths, versioning)
// 03:10 - 04:00 (1500f)  → Kafka Event Bus Architecture
// 04:00 - 04:50 (1500f)  → Choreography Pattern (cleanup cascade)
// 04:50 - 05:40 (1500f)  → Idempotency & Exactly-Once semantics
// 05:40 - 06:30 (1500f)  → Optimistic Locking (compare-and-swap)
// 06:30 - 07:20 (1500f)  → High-Performance SQL Patterns
// 07:20 - 08:10 (1500f)  → GraphQL + REST API Layer
// 08:10 - 09:10 (1800f)  → TCA Automation Engine
// 09:10 - 10:00 (1500f)  → Outro / What's next

export const CHAPTERS = [
  { start: 0,    duration: 1200, id: 'cold-open' },
  { start: 1200, duration: 1500, id: 'architecture' },
  { start: 2700, duration: 1500, id: 'tech-stack' },
  { start: 4200, duration: 1500, id: 'database' },
  { start: 5700, duration: 1500, id: 'kafka' },
  { start: 7200, duration: 1500, id: 'choreography' },
  { start: 8700, duration: 1500, id: 'idempotency' },
  { start: 10200,duration: 1500, id: 'optimistic-locking' },
  { start: 11700,duration: 1500, id: 'sql-patterns' },
  { start: 13200,duration: 1500, id: 'api-layer' },
  { start: 14700,duration: 1800, id: 'automation' },
  { start: 16500,duration: 1500, id: 'outro' },
];

export const TOTAL_FRAMES = 18000;
export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
