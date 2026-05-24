import React from "react";
import { useCurrentFrame, AbsoluteFill } from "remotion";
import { ChapterFrameProvider } from "./ChapterFrameContext";
import { CHAPTERS, TOTAL_FRAMES } from "./chapters";
import { ColdOpenScene } from "./scenes/ColdOpenScene";
import { ArchitectureScene } from "./scenes/ArchitectureScene";
import { TechStackScene } from "./scenes/TechStackScene";
import { DatabaseScene } from "./scenes/DatabaseScene";
import { KafkaScene } from "./scenes/KafkaScene";
import { ChoreographyScene } from "./scenes/ChoreographyScene";
import { IdempotencyScene } from "./scenes/IdempotencyScene";
import { OptimisticLockingScene } from "./scenes/OptimisticLockingScene";
import { SQLPatternsScene } from "./scenes/SQLPatternsScene";
import { APILayerScene } from "./scenes/APILayerScene";
import { AutomationScene } from "./scenes/AutomationScene";
import { OutroScene } from "./scenes/OutroScene";
import { ChapterProgress, ChapterLabel, Subtitle } from "./components/Overlays";

// ---- Subtitle transcript ----
// Add your subtitle text here. All timing is in frames (30fps).
// Format: { startFrame, endFrame, text }
const SUBTITLES = [
  // Cold Open (0-1200)
  { startFrame: 60, endFrame: 180, text: "Let's talk about how I designed the backend of Task-In — from scratch." },
  { startFrame: 200, endFrame: 360, text: "This is a 10-minute deep dive into architecture, database design, event streaming, and automation." },
  { startFrame: 380, endFrame: 520, text: "Every decision has a reason. Every tradeoff is documented. Let's build it from the ground up." },
  { startFrame: 550, endFrame: 700, text: "We're targeting 10,000 requests per second with exactly-once event semantics." },
  { startFrame: 750, endFrame: 900, text: "The stack: Bun, PostgreSQL, Kafka, Redis, GraphQL Yoga — and everything will make sense by the end." },

  // Architecture (1200-2700)
  { startFrame: 1230, endFrame: 1380, text: "First question: microservices or monolith? I chose a modular monolith — and here's why." },
  { startFrame: 1400, endFrame: 1560, text: "Projects, Tasks, Teams, Auth — these are well-defined domains. Clear boundaries in code, single deployable." },
  { startFrame: 1580, endFrame: 1740, text: "Adopting microservices before the domain model stabilizes is premature optimization. Real traffic reveals where pressure is." },
  { startFrame: 1760, endFrame: 1920, text: "The pattern: every module has a Service Interface, a Service Implementation, and Query Objects for database access." },
  { startFrame: 1940, endFrame: 2100, text: "The Service layer doesn't know about HTTP. The Query layer doesn't know about Kafka. Clean separations." },
  { startFrame: 2120, endFrame: 2280, text: "When we have real traffic data showing bottlenecks, we extract services. Not before." },
  { startFrame: 2300, endFrame: 2450, text: "This keeps operations simple, debugging easy, and the team moving fast." },
  { startFrame: 2470, endFrame: 2680, text: "The key insight: complexity should be earned, not assumed." },

  // Tech Stack (2700-4200)
  { startFrame: 2730, endFrame: 2880, text: "Let me walk through every tool and exactly why it's there — no cargo-culting." },
  { startFrame: 2900, endFrame: 3050, text: "Bun as the runtime: high performance, built-in test runner, bundler, and package manager. One binary." },
  { startFrame: 3070, endFrame: 3220, text: "PostgreSQL for the database. The data model is relational. Tasks have parents. Teams have members. FK constraints matter." },
  { startFrame: 3240, endFrame: 3390, text: "Kysely as a query builder — end-to-end TypeScript type safety from the HTTP handler to the SQL query." },
  { startFrame: 3410, endFrame: 3560, text: "But for complex auth checks, we drop to raw SQL with WHERE EXISTS clauses. Atomicity over abstraction." },
  { startFrame: 3580, endFrame: 3730, text: "Kafka for event streaming. When a project is deleted, we need async cleanup across domains. Durable, ordered." },
  { startFrame: 3750, endFrame: 3900, text: "Redis for caching project members and rate limiting. Fast ephemeral storage for hot read paths." },
  { startFrame: 3920, endFrame: 4070, text: "JWT for auth. Stateless tokens — no session store, scales horizontally with zero coordination." },
  { startFrame: 4090, endFrame: 4180, text: "GraphQL Yoga with Relay-spec pagination, DataLoader for N+1 prevention, and full schema-first design." },

  // Database (4200-5700)
  { startFrame: 4230, endFrame: 4380, text: "Now the interesting part: how do we model hierarchical tasks? Epics contain stories, stories contain subtasks." },
  { startFrame: 4400, endFrame: 4550, text: "The naive approach — recursive parent-child joins — is O(n²). We need O(1) subtree reads." },
  { startFrame: 4570, endFrame: 4720, text: "The solution: Materialized Paths. Every task stores the path of ancestor IDs separated by slashes." },
  { startFrame: 4740, endFrame: 4890, text: "Getting an entire subtree? One LIKE query with a B-tree index. Single scan, no joins, no recursion." },
  { startFrame: 4910, endFrame: 5060, text: "The tradeoff: moving a task subtree requires recalculating paths for the entire subtree atomically." },
  { startFrame: 5080, endFrame: 5230, text: "We use a SQL WITH block — fetches parent data and recalculates all descendant paths in one transaction." },
  { startFrame: 5250, endFrame: 5400, text: "But reads vastly outnumber moves in a task management app. The tradeoff is correct." },
  { startFrame: 5420, endFrame: 5580, text: "Every entity also has a version column for optimistic locking and a last_event_id for Kafka correlation. More on that soon." },
  { startFrame: 5600, endFrame: 5680, text: "Hard deletes, no denormalization yet — let real query patterns justify any future optimization." },

  // Kafka (5700-7200)
  { startFrame: 5730, endFrame: 5880, text: "Kafka. This is where the system gets interesting. Let's talk about how events flow between domains." },
  { startFrame: 5900, endFrame: 6050, text: "One topic per domain entity: project-events, team-events, task-events, member-events. Consumers stay focused." },
  { startFrame: 6070, endFrame: 6220, text: "The partition key is projectId. Everything — tasks, teams, members — scopes under a project." },
  { startFrame: 6240, endFrame: 6390, text: "This gives us ordering guarantees per project. Events for the same project always land on the same partition." },
  { startFrame: 6410, endFrame: 6560, text: "Batch publishing: instead of awaiting N individual sends, we collect events into arrays and publish in one call." },
  { startFrame: 6580, endFrame: 6730, text: "N network round-trips reduced to 1. This is critical when you're doing bulk task creation at scale." },
  { startFrame: 6750, endFrame: 6900, text: "Every event carries a UUID eventId. Consumers verify before processing — protection against at-least-once delivery." },
  { startFrame: 6920, endFrame: 7070, text: "The EventBus is polymorphic. KafkaBus in production, MemoryBus in tests. Swap with one environment variable." },
  { startFrame: 7090, endFrame: 7180, text: "Integration tests verify the full producer→consumer cycle in milliseconds. Zero infrastructure required." },

  // Choreography (7200-8700)
  { startFrame: 7230, endFrame: 7380, text: "When a project is deleted, we need to clean up members, teams, and tasks. How do we coordinate this?" },
  { startFrame: 7400, endFrame: 7550, text: "The naive approach: Project service calls Team service which calls Task service. Tight coupling, sequential." },
  { startFrame: 7570, endFrame: 7720, text: "Our approach: Choreography. Project service broadcasts PROJECT_DELETED. Everyone reacts independently." },
  { startFrame: 7740, endFrame: 7890, text: "Three independent consumer groups: member-cleanup-group, team-cleanup-group, task-cleanup-group." },
  { startFrame: 7910, endFrame: 8060, text: "They all run in parallel. Task DB is down? Member and Team cleanup still complete. No dependency chain." },
  { startFrame: 8080, endFrame: 8230, text: "And crucially: no event storm. One PROJECT_DELETED signal vs thousands of cascading TASK_DELETED events." },
  { startFrame: 8250, endFrame: 8400, text: "Adding a new Notification service? Just add a consumer group. Zero changes to existing code." },
  { startFrame: 8420, endFrame: 8570, text: "We also handle surgical cleanup: team deleted → tasks for that team get unassigned. Targeted, not broadcast." },
  { startFrame: 8590, endFrame: 8680, text: "Hybrid strategy: global broadcast for root deletions, surgical events for sub-entity changes." },

  // Idempotency (8700-10200)
  { startFrame: 8730, endFrame: 8880, text: "Kafka guarantees at-least-once delivery. That means consumers will receive duplicate events. We need exactly-once processing." },
  { startFrame: 8900, endFrame: 9050, text: "Layer one: the processed_event table. Tracks event_id plus consumer_group pairs." },
  { startFrame: 9070, endFrame: 9220, text: "The query: INSERT ON CONFLICT DO NOTHING RETURNING event_id. One B-tree operation. Atomic check and mark." },
  { startFrame: 9240, endFrame: 9390, text: "If RETURNING is empty, we've seen this event before. Skip. If it returns a row, it's new. Execute business logic." },
  { startFrame: 9410, endFrame: 9560, text: "Layer two: last_event_id on every entity. Acts as a Fencing Token — rejects older events from overwriting newer state." },
  { startFrame: 9580, endFrame: 9730, text: "Layer three: the version column. Combined with optimistic locking, stale events fail the WHERE clause atomically." },
  { startFrame: 9750, endFrame: 9900, text: "For 10k RPS, we need batch idempotency. Check an entire batch of events in one query using unnest." },
  { startFrame: 9920, endFrame: 10070, text: "N database round-trips reduced to 1. Atomic batch processing — either the entire batch commits or none of it does." },
  { startFrame: 10090, endFrame: 10180, text: "The processed_event table is partitioned by day. Drop old partitions instantly — no vacuum, no bloat." },

  // Optimistic Locking (10200-11700)
  { startFrame: 10230, endFrame: 10380, text: "At 10k RPS, two users will update the same task simultaneously. How do we prevent Lost Updates?" },
  { startFrame: 10400, endFrame: 10550, text: "Pessimistic locking — SELECT FOR UPDATE — holds a database lock until the transaction commits. Terrible for scale." },
  { startFrame: 10570, endFrame: 10720, text: "Optimistic locking: we assume conflicts are rare. No locks held. We just check at write time." },
  { startFrame: 10740, endFrame: 10890, text: "Every entity has a version integer. The client reads version=5. Before writing, it sends version=5 with the update." },
  { startFrame: 10910, endFrame: 11060, text: "The SQL: UPDATE ... WHERE id = $1 AND version = 5. Returns 0 rows? Someone else committed first. Client retries." },
  { startFrame: 11080, endFrame: 11230, text: "No deadlocks possible. No lock contention. The database handles the race condition at the engine level." },
  { startFrame: 11250, endFrame: 11400, text: "The version also travels through Kafka events. Async consumers use the same WHERE version check." },
  { startFrame: 11420, endFrame: 11570, text: "Out-of-order Kafka events with stale versions are rejected at the database level. No application logic needed." },
  { startFrame: 11590, endFrame: 11680, text: "Three tools, three jobs: processed_event tracks consumer memory, version tracks producer concurrency, last_event_id tracks entity identity." },

  // SQL Patterns (11700-13200)
  { startFrame: 11730, endFrame: 11880, text: "Let's talk about the SQL patterns we standardized. These aren't just queries — they're performance contracts." },
  { startFrame: 11900, endFrame: 12050, text: "Pattern one: Single-Trip Authorization with CTEs. Old way: SELECT to check permissions, then INSERT if allowed. Two round-trips." },
  { startFrame: 12070, endFrame: 12220, text: "Our way: WITH auth_check AS (...) embed the permission check inside the mutation. One round-trip. TOCTOU-safe." },
  { startFrame: 12240, endFrame: 12390, text: "Pattern two: bulk insert with unnest. Old way: loop over 100 IDs, send 100 INSERT statements." },
  { startFrame: 12410, endFrame: 12560, text: "Our way: INSERT INTO ... SELECT unnest($ids::uuid[]). PostgreSQL processes the entire array in one execution plan." },
  { startFrame: 12580, endFrame: 12730, text: "This transforms N network cost to 1. The only way to handle bulk member additions at 10k RPS." },
  { startFrame: 12750, endFrame: 12900, text: "Pattern three: RETURNING. Every mutation uses RETURNING to get the new version and last_event_id." },
  { startFrame: 12920, endFrame: 13070, text: "No follow-up SELECT needed. Absolute source of truth immediately. No phantom reads." },
  { startFrame: 13090, endFrame: 13180, text: "Average DB round-trips per request went from approximately 4 down to 1. That's the foundation of our architecture." },

  // API Layer (13200-14700)
  { startFrame: 13230, endFrame: 13380, text: "The API layer follows the Ports and Adapters pattern — also called Hexagonal Architecture." },
  { startFrame: 13400, endFrame: 13550, text: "Transport is a thin adapter. GraphQL, REST — they just translate HTTP into domain commands and call the Service layer." },
  { startFrame: 13570, endFrame: 13720, text: "GraphQL Yoga gives us Relay-spec cursor-based pagination on every connection. Consistent API across all entities." },
  { startFrame: 13740, endFrame: 13890, text: "DataLoader batches and caches DB calls per request. N+1 queries for nested resolvers? One SQL call." },
  { startFrame: 13910, endFrame: 14060, text: "The schema is schema-first. schema.graphql is the contract. Resolvers implement it. No accidental drift." },
  { startFrame: 14080, endFrame: 14230, text: "REST routes mirror the domain structure: project.routes.ts, task.routes.ts, team.routes.ts." },
  { startFrame: 14250, endFrame: 14400, text: "Controllers have one job: parse the request, validate HTTP input, delegate to services, set status codes. Nothing more." },
  { startFrame: 14420, endFrame: 14570, text: "Adding a CLI adapter in the future? The Service layer is untouched. Just add a new port." },
  { startFrame: 14590, endFrame: 14680, text: "The health endpoint gives container orchestration visibility. K8s readiness probes, monitoring dashboards." },

  // Automation (14700-16500)
  { startFrame: 14730, endFrame: 14880, text: "Now the most complex feature: the TCA Automation Engine. Trigger, Condition, Action." },
  { startFrame: 14900, endFrame: 15050, text: "Project owners define flat rules: WHEN this happens, IF this is true, THEN do this." },
  { startFrame: 15070, endFrame: 15220, text: "Example: when task status changes to DONE, if it has incomplete subtasks, reject the transition." },
  { startFrame: 15240, endFrame: 15390, text: "Another example: when any descendant changes status, if all descendants are DONE, promote the parent." },
  { startFrame: 15410, endFrame: 15560, text: "There are two execution modes: sync guards that block before the database write, and async cascades that run after." },
  { startFrame: 15580, endFrame: 15730, text: "Sync mode: rules run BEFORE the SQL UPDATE. If an action throws a ValidationError, the mutation is rejected." },
  { startFrame: 15750, endFrame: 15900, text: "Async mode: after the task is committed, a Kafka event fires. The automation listener reacts and applies actions." },
  { startFrame: 15920, endFrame: 16070, text: "The clever part: async actions call taskService.updateTask. This emits new events. Cascades self-propagate." },
  { startFrame: 16090, endFrame: 16240, text: "No custom graph traversal. The event bus IS the traversal engine. A→B→C just works by emitting at each step." },
  { startFrame: 16260, endFrame: 16410, text: "The rule schema is deliberately flat. No AST, no expression trees, no eval. String keys select server-owned TypeScript callbacks." },
  { startFrame: 16430, endFrame: 16480, text: "The registry IS the safety boundary. Finite, reviewable, server-controlled." },

  // Outro (16500-18000)
  { startFrame: 16530, endFrame: 16680, text: "So that's the full picture. Let me recap what we built." },
  { startFrame: 16700, endFrame: 16850, text: "Modular monolith with clear domain boundaries. Materialized paths for O(1) hierarchical queries." },
  { startFrame: 16870, endFrame: 17020, text: "Kafka choreography — broadcast and react. Three cleanup groups running in parallel." },
  { startFrame: 17040, endFrame: 17190, text: "Three-layer idempotency: processed_event table, version column, last_event_id fencing token." },
  { startFrame: 17210, endFrame: 17360, text: "Optimistic locking with compare-and-swap. No deadlocks. Versions travel through Kafka events." },
  { startFrame: 17380, endFrame: 17530, text: "SQL engineering: CTEs, unnest, RETURNING. Average round-trips from 4 to 1." },
  { startFrame: 17550, endFrame: 17700, text: "Ports and Adapters for the API. GraphQL and REST as thin adapters over a pure service layer." },
  { startFrame: 17720, endFrame: 17870, text: "TCA Automation Engine with self-propagating cascades and no user code execution." },
  { startFrame: 17890, endFrame: 17970, text: "If you enjoyed this, subscribe for the UI walkthrough and live load testing coming next." },
];

const SCENE_MAP: Record<string, React.FC> = {
  'cold-open': ColdOpenScene,
  'architecture': ArchitectureScene,
  'tech-stack': TechStackScene,
  'database': DatabaseScene,
  'kafka': KafkaScene,
  'choreography': ChoreographyScene,
  'idempotency': IdempotencyScene,
  'optimistic-locking': OptimisticLockingScene,
  'sql-patterns': SQLPatternsScene,
  'api-layer': APILayerScene,
  'automation': AutomationScene,
  'outro': OutroScene,
};

export const TaskInBackend: React.FC = () => {
  const frame = useCurrentFrame();

  // Find current chapter
  const currentChapter = CHAPTERS.findLast((ch) => frame >= ch.start);
  if (!currentChapter) return null;

  const SceneComponent = SCENE_MAP[currentChapter.id];
  if (!SceneComponent) return null;

  // Create a local frame within the chapter for the scene
  const localFrame = frame - currentChapter.start;

  return (
    <AbsoluteFill style={{ background: '#080b14', fontFamily: '"Inter", system-ui, sans-serif' }}>
      {/* Provide local chapter frame to the scene */}
      <AbsoluteFill>
        <ChapterFrameProvider chapterStart={currentChapter.start}>
          <SceneComponent />
        </ChapterFrameProvider>
      </AbsoluteFill>

      {/* Overlays */}
      <ChapterProgress />
      <ChapterLabel />
      <Subtitle entries={SUBTITLES} />
    </AbsoluteFill>
  );
};
