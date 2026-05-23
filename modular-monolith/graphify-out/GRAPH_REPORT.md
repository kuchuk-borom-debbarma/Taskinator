# Graph Report - modular-monolith  (2026-05-23)

## Corpus Check
- 211 files · ~702,698 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 762 nodes · 1266 edges · 39 communities detected
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 84 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]

## God Nodes (most connected - your core abstractions)
1. `TaskServiceImpl` - 30 edges
2. `AutoActionServiceImpl` - 26 edges
3. `TeamServiceImpl` - 21 edges
4. `ProjectServiceImpl` - 20 edges
5. `encodeCursor()` - 12 edges
6. `decodeCursor()` - 12 edges
7. `seed()` - 11 edges
8. `KafkaBus` - 9 edges
9. `AuthServiceImpl` - 9 edges
10. `InternalNotificationServiceImpl` - 9 edges

## Surprising Connections (you probably didn't know these)
- `bootstrap()` --calls--> `startConsumers()`  [INFERRED]
  src/app.ts → src/kafka/registry.ts
- `bootstrap()` --calls--> `start()`  [INFERRED]
  src/app.ts → src/index.ts
- `bootstrap()` --calls--> `bootstrapE2E()`  [INFERRED]
  src/app.ts → src/tests/e2e/helpers/server.ts
- `getTimeString()` --calls--> `createEvent()`  [INFERRED]
  src/utils/utils.ts → src/utils/event-bus/idempotency.ts
- `getTimeString()` --calls--> `insertNotificationsBatch()`  [INFERRED]
  src/utils/utils.ts → src/modules/internal-notification/internal/InternalNotificationQueries.ts

## Hyperedges (group relationships)
- **Atomic Outbox Pattern Implementations** — docs_6_outbox_wcte_architecture, docs_19_atomic_event_orchestration, docs_18_data_lifecycle_event_flows [EXTRACTED 0.95]
- **Automation Engine Architecture** — docs_automation_engine_1_intro, docs_automation_engine_architecture_3_condition_evaluation, docs_automation_engine_architecture_4_action_handler, docs_automation_engine_architecture_5_execution_flow [EXTRACTED 1.00]
- **High Performance Batch Event Processing** — docs_5_smart_event_processing, docs_18_data_lifecycle_event_flows, docs_20_chunked_self_signaling_deletion_architecture [INFERRED 0.85]
- **Smart Batch Aggregator Pattern** — projectevents_batchaggregator_projectevents_batchaggregator, teamevents_batchaggregator_teamevents_batchaggregator, taskevents_batchaggregator_taskevents_batchaggregator [EXTRACTED 0.95]
- **GraphQL Core Infrastructure** — schema_schema, index_yoga, context_createcontext, pubsub_pubsub [EXTRACTED 0.90]
- **Event Bus Core** — memorybus_memorybus, idempotency_claimeventsatomic, constants_kafka_topics, constants_kafka_events [EXTRACTED 0.90]
- **Team Module** — team_teamservice, team_teamserviceimpl, team_teamqueries, team_purgeteammembershipslistener [INFERRED 0.95]
- **Team Domain Entities** — team_team, team_teammember [EXTRACTED 1.00]
- **Modular Monolith Structure** — authserviceimpl_authserviceimpl, projectserviceimpl_projectserviceimpl, authservice_authservice [EXTRACTED 0.90]
- **GraphQL Resolver Layer** — project_resolvers_projectresolvers, task_resolvers_taskresolvers, team_resolvers_teamresolvers [EXTRACTED 0.95]
- **Task Graph Engine** — task_taskaggregated_reachabilitysync_listener, task_expandtaskreachability_query, task_contracttaskreachability_query, task_synctaskgraphcounters_query [INFERRED 0.85]
- **Event-Driven Counter Updates** — mutation_create_project, mutation_delete_projects, mutation_add_project_members, mutation_create_team [INFERRED 0.90]
- **Real-time System Stack** — sys_kafka, sys_redis, arch_targeted_routing, ui_unified_event_stream [EXTRACTED 1.00]
- **Task Graph Infrastructure** — eng_reachability, pat_closure_table, ui_radial_task_graph [EXTRACTED 1.00]
- **E2E Task Testing Suite** — test_task_link_create_e2e, test_task_neighbour_links_e2e, test_task_delete_e2e, test_task_update_e2e [INFERRED 0.90]
- **Chunked Deletion Pattern** — project_delete_reachability_listener, task_delete_reachability_listener, project_delete_task_listener, project_delete_task_link_listener [EXTRACTED 1.00]
- **Transactional Outbox Pattern Implementation** — outbox_append_events, outbox_relay_process_batch, outbox_relay_dispatch, kafka_bus [EXTRACTED 1.00]
- **Realtime Event Routing Flow** — app_bootstrap, realtimeredisbridge_bridge, taskreachability_table [INFERRED 0.85]
- **Project Aggregated Listeners** — project_listener_remove_member, project_listener_delete_member, project_listener_change_member_count [EXTRACTED 1.00]
- **Project Count Synchronization Listeners** — project_listener_sync_team_count, project_listener_sync_task_count, project_listener_change_member_count [INFERRED 0.80]

## Communities

### Community 0 - "Community 0"
Cohesion: 0.02
Nodes (27): AggregatorService, MemoryBus, AutoActionTaskEventConsumer, ProjectAggregated_ChangeProjectMemberCount, ProjectAggregated_ChangeUserProjectCount, ProjectAggregated_DeleteProjectMember, ProjectAggregated_DeleteProjectReachability, ProjectAggregated_DeleteProjectTask (+19 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (3): gqlRequest(), createLink(), createTask()

### Community 2 - "Community 2"
Cohesion: 0.03
Nodes (19): getNotifications(), getProjectMembers(), getProjects(), getNeighbourhood(), getProjectTaskLinksPage(), getTaskLinksPage(), getTaskNeighbourLinksPage(), getTasksPage() (+11 more)

### Community 3 - "Community 3"
Cohesion: 0.04
Nodes (13): createLoaders(), createEvent(), createContext(), ConflictError, ForbiddenError, MutationFailedError, NotFoundError, UnauthorizedError (+5 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (13): registerSetFields(), init(), ActionRegistry, executeAction(), ConditionRegistry, evaluateCondition(), evaluateConditionFromIndex(), ContextResolverRegistry (+5 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (16): appendEventsToOutbox(), executeAutoActionPipeline(), deleteAutoActionById(), insertAutoAction(), isEventProcessed(), markEventProcessed(), selectActiveAutoActionByName(), selectActiveAutoActionsForProject() (+8 more)

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (7): deleteTeamMembers(), getTeamsByIds(), incrementTeamMemberCountsBulk(), insertTeam(), insertTeamMembers(), removeProjectTeamMembersBatch(), TeamServiceImpl

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (18): poll(), processOutboxBatch(), reconnectListener(), setupListener(), startOutboxRelay(), stopOutboxRelay(), bootstrapE2E(), teardownE2E() (+10 more)

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (3): createUser(), ProjectServiceImpl, run()

### Community 9 - "Community 9"
Cohesion: 0.23
Nodes (12): elapsed(), esc(), generateEmail(), generateProjectName(), generateTaskTitle(), generateTeamName(), generateUsername(), pick() (+4 more)

### Community 10 - "Community 10"
Cohesion: 0.24
Nodes (10): addSortIndicators(), enableUI(), getNthColumn(), getTable(), getTableBody(), getTableHeader(), loadColumns(), loadData() (+2 more)

### Community 11 - "Community 11"
Cohesion: 0.35
Nodes (12): buildForestLinks(), bulkInsert(), elapsed(), esc(), generateEmail(), generateTaskTitle(), generateTeamName(), generateUsername() (+4 more)

### Community 12 - "Community 12"
Cohesion: 0.29
Nodes (7): a(), B(), D(), g(), i(), Q(), y()

### Community 13 - "Community 13"
Cohesion: 0.2
Nodes (10): Task Deletion Architecture, Event-Driven Architecture, Redis Targeted Routing, Idempotency Engine, Materialized Paths, Transactional Outbox Pattern, Kafka Backbone, Redis Routing Mesh (+2 more)

### Community 14 - "Community 14"
Cohesion: 0.28
Nodes (1): KafkaBus

### Community 15 - "Community 15"
Cohesion: 0.22
Nodes (1): AuthServiceImpl

### Community 16 - "Community 16"
Cohesion: 0.22
Nodes (1): InternalNotificationServiceImpl

### Community 17 - "Community 17"
Cohesion: 0.43
Nodes (4): checkActiveSubtasks(), checkIncompleteBlockers(), checkTeamAssignment(), GuardService

### Community 18 - "Community 18"
Cohesion: 0.33
Nodes (7): Atomic Event Orchestration, Chunked Self-Signaling Deletion Architecture, Outbox wCTE Architecture, Task Triggers Architecture, Automation Engine Intro, Task Automations: Conditions & Actions, Automation Architecture: Database

### Community 19 - "Community 19"
Cohesion: 0.33
Nodes (2): byActorIdAndId(), byActorIdAndId()

### Community 20 - "Community 20"
Cohesion: 0.7
Nodes (4): goToNext(), goToPrevious(), makeCurrent(), toggleClass()

### Community 24 - "Community 24"
Cohesion: 0.5
Nodes (4): Automation Architecture: Module, Automation Architecture: Condition Evaluation, Automation Architecture: Action Handler, Automation Architecture: Execution Flow

### Community 25 - "Community 25"
Cohesion: 0.5
Nodes (4): Task Reachability Engine, Closure Table Pattern, Taskinator Frontend (ui-v1), Radial Task Graph (Neural Lattice)

### Community 26 - "Community 26"
Cohesion: 0.5
Nodes (3): Closure Table Engine, E2E Testing Framework, Reactive Outbox Relay

### Community 27 - "Community 27"
Cohesion: 1.0
Nodes (2): addUsers(), getLetterSequence()

### Community 31 - "Community 31"
Cohesion: 0.67
Nodes (3): Explicit Kafka Architecture, Data Lifecycle & Event flows, Smart Event Processing

### Community 39 - "Community 39"
Cohesion: 1.0
Nodes (2): Task Read API, Frontend Design Philosophy

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (2): Origin Tracking (System Actor), Recursive Event Loops

### Community 45 - "Community 45"
Cohesion: 1.0
Nodes (1): Future Backend Features

### Community 46 - "Community 46"
Cohesion: 1.0
Nodes (1): Internal Notification Service Design

### Community 47 - "Community 47"
Cohesion: 1.0
Nodes (1): Project Automations: Conditions & Actions

### Community 48 - "Community 48"
Cohesion: 1.0
Nodes (1): Team Automations: Conditions & Actions

### Community 49 - "Community 49"
Cohesion: 1.0
Nodes (1): E2E Testing Guide

### Community 50 - "Community 50"
Cohesion: 1.0
Nodes (1): Project Module README

### Community 51 - "Community 51"
Cohesion: 1.0
Nodes (1): Team Module README

### Community 52 - "Community 52"
Cohesion: 1.0
Nodes (1): Optimistic Locking

### Community 53 - "Community 53"
Cohesion: 1.0
Nodes (1): CTE-Based Authorization

### Community 54 - "Community 54"
Cohesion: 1.0
Nodes (1): GraphQL DataLoaders

### Community 55 - "Community 55"
Cohesion: 1.0
Nodes (1): Trigger Service

## Knowledge Gaps
- **32 isolated node(s):** `Frontend Design Philosophy`, `Task Read API`, `Future Backend Features`, `Internal Notification Service Design`, `Explicit Kafka Architecture` (+27 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 14`** (9 nodes): `KafkaBus`, `.constructor()`, `.createConsumer()`, `.destroy()`, `.emit()`, `.executeHandlers()`, `.init()`, `.publish()`, `.subscribe()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (9 nodes): `AuthServiceImpl`, `.destroy()`, `.finishSignUp()`, `.getUsersByIds()`, `.handleUserProjectCountSync()`, `.init()`, `.searchUsers()`, `.signIn()`, `.startSignUp()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (9 nodes): `InternalNotificationServiceImpl`, `.createNotification()`, `.createNotificationsBatch()`, `.destroy()`, `.getNotifications()`, `.getUnreadCount()`, `.init()`, `.markAllAsRead()`, `.markAsRead()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (6 nodes): `byActorIdAndId()`, `byId()`, `byActorIdAndId()`, `byId()`, `task.ts`, `team.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (3 nodes): `addUsers()`, `getLetterSequence()`, `add-users.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (2 nodes): `Task Read API`, `Frontend Design Philosophy`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (2 nodes): `Origin Tracking (System Actor)`, `Recursive Event Loops`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (1 nodes): `Future Backend Features`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (1 nodes): `Internal Notification Service Design`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (1 nodes): `Project Automations: Conditions & Actions`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (1 nodes): `Team Automations: Conditions & Actions`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (1 nodes): `E2E Testing Guide`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (1 nodes): `Project Module README`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (1 nodes): `Team Module README`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (1 nodes): `Optimistic Locking`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (1 nodes): `CTE-Based Authorization`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (1 nodes): `GraphQL DataLoaders`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 55`** (1 nodes): `Trigger Service`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `TaskServiceImpl` connect `Community 2` to `Community 4`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `AutoActionServiceImpl` connect `Community 5` to `Community 4`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `TeamServiceImpl` connect `Community 6` to `Community 0`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Are the 11 inferred relationships involving `encodeCursor()` (e.g. with `getProjects()` and `getProjectMembers()`) actually correct?**
  _`encodeCursor()` has 11 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Frontend Design Philosophy`, `Task Read API`, `Future Backend Features` to the rest of the system?**
  _32 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.02 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._