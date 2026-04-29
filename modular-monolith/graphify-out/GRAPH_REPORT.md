# Graph Report - .  (2026-04-29)

## Corpus Check
- Large corpus: 213 files · ~688,692 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 734 nodes · 1034 edges · 112 communities detected
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 66 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Event Handlers & Count Sync|Event Handlers & Count Sync]]
- [[_COMMUNITY_E2E Test Infrastructure|E2E Test Infrastructure]]
- [[_COMMUNITY_Task & Reachability Queries|Task & Reachability Queries]]
- [[_COMMUNITY_GraphQL Infrastructure & Errors|GraphQL Infrastructure & Errors]]
- [[_COMMUNITY_Authentication & Member Services|Authentication & Member Services]]
- [[_COMMUNITY_Outbox Relay & E2E Bootstrap|Outbox Relay & E2E Bootstrap]]
- [[_COMMUNITY_Kafka Topics & Aggregated Events|Kafka Topics & Aggregated Events]]
- [[_COMMUNITY_Test Data Generators|Test Data Generators]]
- [[_COMMUNITY_Coverage Report UI (Sorter)|Coverage Report UI (Sorter)]]
- [[_COMMUNITY_Project Domain Service|Project Domain Service]]
- [[_COMMUNITY_Database Schema & Task Mutations|Database Schema & Task Mutations]]
- [[_COMMUNITY_Forest Seeding & Generators|Forest Seeding & Generators]]
- [[_COMMUNITY_Coverage Report UI (Prettify)|Coverage Report UI (Prettify)]]
- [[_COMMUNITY_Project Queries & Integration Tests|Project Queries & Integration Tests]]
- [[_COMMUNITY_Core Architectural Patterns|Core Architectural Patterns]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 93|Community 93]]
- [[_COMMUNITY_Community 94|Community 94]]
- [[_COMMUNITY_Community 95|Community 95]]
- [[_COMMUNITY_Community 96|Community 96]]
- [[_COMMUNITY_Community 97|Community 97]]
- [[_COMMUNITY_Community 98|Community 98]]
- [[_COMMUNITY_Community 99|Community 99]]
- [[_COMMUNITY_Community 100|Community 100]]
- [[_COMMUNITY_Community 101|Community 101]]
- [[_COMMUNITY_Community 102|Community 102]]
- [[_COMMUNITY_Community 103|Community 103]]
- [[_COMMUNITY_Community 104|Community 104]]
- [[_COMMUNITY_Community 105|Community 105]]
- [[_COMMUNITY_Community 106|Community 106]]
- [[_COMMUNITY_Community 107|Community 107]]
- [[_COMMUNITY_Community 108|Community 108]]
- [[_COMMUNITY_Community 110|Community 110]]
- [[_COMMUNITY_Community 111|Community 111]]
- [[_COMMUNITY_Community 112|Community 112]]
- [[_COMMUNITY_Community 113|Community 113]]
- [[_COMMUNITY_Community 114|Community 114]]
- [[_COMMUNITY_Community 115|Community 115]]
- [[_COMMUNITY_Community 116|Community 116]]
- [[_COMMUNITY_Community 117|Community 117]]
- [[_COMMUNITY_Community 118|Community 118]]
- [[_COMMUNITY_Community 119|Community 119]]
- [[_COMMUNITY_Community 120|Community 120]]
- [[_COMMUNITY_Community 121|Community 121]]
- [[_COMMUNITY_Community 122|Community 122]]

## God Nodes (most connected - your core abstractions)
1. `TaskServiceImpl` - 15 edges
2. `ProjectServiceImpl` - 14 edges
3. `TeamServiceImpl` - 13 edges
4. `seed()` - 11 edges
5. `encodeCursor()` - 11 edges
6. `decodeCursor()` - 11 edges
7. `KafkaBus` - 9 edges
8. `InternalNotificationServiceImpl` - 9 edges
9. `AuthServiceImpl` - 8 edges
10. `ProjectQueries Integration Tests` - 7 edges

## Surprising Connections (you probably didn't know these)
- `TaskAggregated_DeleteTaskReachabilityListener` --implements--> `Closure Table Engine`  [INFERRED]
  src/modules/task/internal/listeners/TaskAggregated_DeleteTaskReachabilityListener.ts → PR.md
- `bootstrap()` --calls--> `startConsumers()`  [INFERRED]
  src/app.ts → src/kafka/registry.ts
- `start()` --calls--> `bootstrap()`  [INFERRED]
  src/index.ts → src/app.ts
- `bootstrapE2E()` --calls--> `bootstrap()`  [INFERRED]
  src/tests/e2e/helpers/server.ts → src/app.ts
- `createEvent()` --calls--> `getTimeString()`  [INFERRED]
  src/utils/event-bus/idempotency.ts → src/utils/utils.ts

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

### Community 0 - "Event Handlers & Count Sync"
Cohesion: 0.03
Nodes (23): ProjectAggregated_ChangeProjectMemberCount, ProjectAggregated_ChangeUserProjectCount, ProjectAggregated_DeleteProjectMember, ProjectAggregated_DeleteProjectReachability, ProjectAggregated_DeleteProjectTask, ProjectAggregated_DeleteProjectTaskLink, ProjectAggregated_DeleteProjectTeam, ProjectAggregated_DeleteProjectTeamMember (+15 more)

### Community 1 - "E2E Test Infrastructure"
Cohesion: 0.08
Nodes (8): gqlRequest(), AddProjectMembers Mutation, CreateTeam Mutation, DeleteProjects Mutation, UpdateProject Mutation, GetMe Query, createLink(), createTask()

### Community 2 - "Task & Reachability Queries"
Cohesion: 0.04
Nodes (18): getNotifications(), getProjectMembers(), getProjects(), getNeighbourhood(), getProjectTaskLinksPage(), getTaskLinksPage(), getTaskNeighbourLinksPage(), getTasksPage() (+10 more)

### Community 3 - "GraphQL Infrastructure & Errors"
Cohesion: 0.05
Nodes (13): createLoaders(), createEvent(), createContext(), ConflictError, ForbiddenError, MutationFailedError, NotFoundError, UnauthorizedError (+5 more)

### Community 4 - "Authentication & Member Services"
Cohesion: 0.05
Nodes (8): AuthServiceImpl, deleteTeamMembers(), getTeamsByIds(), incrementTeamMemberCountsBulk(), insertTeam(), insertTeamMembers(), removeProjectTeamMembersBatch(), TeamServiceImpl

### Community 5 - "Outbox Relay & E2E Bootstrap"
Cohesion: 0.07
Nodes (18): poll(), processOutboxBatch(), reconnectListener(), setupListener(), startOutboxRelay(), stopOutboxRelay(), bootstrapE2E(), teardownE2E() (+10 more)

### Community 6 - "Kafka Topics & Aggregated Events"
Cohesion: 0.12
Nodes (19): claimEventsAtomic, CHANGE_PROJECT_MEMBER_COUNT, DELETE_PROJECT_MEMBER, REMOVE_PROJECT_MEMBER, SYNC_PROJECT_TASK_COUNT, SYNC_PROJECT_TEAM_COUNT, PROJECT_AGGREGATED, TASK_AGGREGATED (+11 more)

### Community 7 - "Test Data Generators"
Cohesion: 0.23
Nodes (12): elapsed(), esc(), generateEmail(), generateProjectName(), generateTaskTitle(), generateTeamName(), generateUsername(), pick() (+4 more)

### Community 8 - "Coverage Report UI (Sorter)"
Cohesion: 0.24
Nodes (10): addSortIndicators(), enableUI(), getNthColumn(), getTable(), getTableBody(), getTableHeader(), loadColumns(), loadData() (+2 more)

### Community 9 - "Project Domain Service"
Cohesion: 0.14
Nodes (1): ProjectServiceImpl

### Community 10 - "Database Schema & Task Mutations"
Cohesion: 0.16
Nodes (14): project Table, project_task Table, project_team Table, task_link Table, task_reachability Table, CreateTaskLink Mutation, DeleteTask Mutation, UpdateTask Mutation (+6 more)

### Community 11 - "Forest Seeding & Generators"
Cohesion: 0.35
Nodes (12): buildForestLinks(), bulkInsert(), elapsed(), esc(), generateEmail(), generateTaskTitle(), generateTeamName(), generateUsername() (+4 more)

### Community 12 - "Coverage Report UI (Prettify)"
Cohesion: 0.29
Nodes (7): a(), B(), D(), g(), i(), Q(), y()

### Community 13 - "Project Queries & Integration Tests"
Cohesion: 0.18
Nodes (11): project.created, project.deleted, project.updated, deleteProjectMembers, deleteProjects, getProjectMembers, getProjects, insertProject (+3 more)

### Community 14 - "Core Architectural Patterns"
Cohesion: 0.2
Nodes (10): Task Deletion Architecture, Event-Driven Architecture, Redis Targeted Routing, Idempotency Engine, Materialized Paths, Transactional Outbox Pattern, Kafka Backbone, Redis Routing Mesh (+2 more)

### Community 15 - "Community 15"
Cohesion: 0.22
Nodes (1): InternalNotificationServiceImpl

### Community 16 - "Community 16"
Cohesion: 0.28
Nodes (1): KafkaBus

### Community 17 - "Community 17"
Cohesion: 0.33
Nodes (7): Atomic Event Orchestration, Chunked Self-Signaling Deletion Architecture, Outbox wCTE Architecture, Task Triggers Architecture, Automation Engine Intro, Task Automations: Conditions & Actions, Automation Architecture: Database

### Community 18 - "Community 18"
Cohesion: 0.29
Nodes (7): TeamAggregated_PurgeTeamMembershipsListener, Team, TeamMember, TeamQueries, TeamQueries Integration Tests, TeamService, TeamServiceImpl

### Community 19 - "Community 19"
Cohesion: 0.33
Nodes (1): LoggerImpl

### Community 20 - "Community 20"
Cohesion: 0.33
Nodes (2): byActorIdAndId(), byActorIdAndId()

### Community 21 - "Community 21"
Cohesion: 0.33
Nodes (6): Team GraphQL Queries, Task Link Deletion E2E, Task Graph Reachability Stress Test E2E, Team Stress Test E2E, Task Reachability Engine, Volume Seed Script

### Community 22 - "Community 22"
Cohesion: 0.7
Nodes (4): goToNext(), goToPrevious(), makeCurrent(), toggleClass()

### Community 23 - "Community 23"
Cohesion: 0.4
Nodes (1): MemoryBus

### Community 24 - "Community 24"
Cohesion: 0.4
Nodes (4): requireAuth, AuthService, AuthServiceImpl, byId()

### Community 25 - "Community 25"
Cohesion: 0.8
Nodes (5): claimEventsAtomic, ProjectEvents_BatchAggregator, startConsumers, TaskEvents_BatchAggregator, TeamEvents_BatchAggregator

### Community 26 - "Community 26"
Cohesion: 0.4
Nodes (4): Closure Table Engine, E2E Testing Framework, Reactive Outbox Relay, TaskAggregated_DeleteTaskReachabilityListener

### Community 27 - "Community 27"
Cohesion: 0.4
Nodes (5): Dispatch Outbox Events to Bus, Database Notification Listener, Process Outbox Event Batch, Start Outbox Relay Service, Event Bus Facade

### Community 28 - "Community 28"
Cohesion: 0.5
Nodes (4): Automation Architecture: Module, Automation Architecture: Condition Evaluation, Automation Architecture: Action Handler, Automation Architecture: Execution Flow

### Community 29 - "Community 29"
Cohesion: 0.5
Nodes (4): projectResolvers, ProjectService, ProjectServiceImpl, taskResolvers

### Community 30 - "Community 30"
Cohesion: 0.5
Nodes (4): contractTaskReachability, expandTaskReachability, syncTaskGraphCounters, TaskAggregated_ReachabilitySyncListener

### Community 31 - "Community 31"
Cohesion: 0.5
Nodes (4): Task Reachability Engine, Closure Table Pattern, Taskinator Frontend (ui-v1), Radial Task Graph (Neural Lattice)

### Community 32 - "Community 32"
Cohesion: 0.5
Nodes (4): Internal Notification Module, InternalNotificationQueries, InternalNotificationService, InternalNotificationServiceImpl

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (2): addUsers(), getLetterSequence()

### Community 34 - "Community 34"
Cohesion: 0.67
Nodes (1): TaskEvents_BatchAggregator

### Community 38 - "Community 38"
Cohesion: 0.67
Nodes (3): Explicit Kafka Architecture, Data Lifecycle & Event flows, Smart Event Processing

### Community 39 - "Community 39"
Cohesion: 0.67
Nodes (3): createEvent, MemoryBus, Bus

### Community 40 - "Community 40"
Cohesion: 0.67
Nodes (3): insertTask, TaskService, TaskServiceImpl

### Community 41 - "Community 41"
Cohesion: 0.67
Nodes (3): System Bootstrap, Bootstrap E2E Infrastructure, Realtime Redis Bridge

### Community 42 - "Community 42"
Cohesion: 0.67
Nodes (3): Task Concurrency Stress Test E2E, Team Update E2E, Optimistic Locking

### Community 47 - "Community 47"
Cohesion: 1.0
Nodes (2): Task Read API, Frontend Design Philosophy

### Community 48 - "Community 48"
Cohesion: 1.0
Nodes (2): schema, typeDefs

### Community 49 - "Community 49"
Cohesion: 1.0
Nodes (2): createContext, yoga

### Community 50 - "Community 50"
Cohesion: 1.0
Nodes (2): Origin Tracking (System Actor), Recursive Event Loops

### Community 51 - "Community 51"
Cohesion: 1.0
Nodes (2): Apply Schema Script, Wipe Schema Script

### Community 52 - "Community 52"
Cohesion: 1.0
Nodes (2): Task Creation E2E, Event-Driven Counters

### Community 53 - "Community 53"
Cohesion: 1.0
Nodes (2): Forest-based DAG Seeding, Reachability Index Table

### Community 57 - "Community 57"
Cohesion: 1.0
Nodes (1): Future Backend Features

### Community 58 - "Community 58"
Cohesion: 1.0
Nodes (1): Internal Notification Service Design

### Community 59 - "Community 59"
Cohesion: 1.0
Nodes (1): Project Automations: Conditions & Actions

### Community 60 - "Community 60"
Cohesion: 1.0
Nodes (1): Team Automations: Conditions & Actions

### Community 61 - "Community 61"
Cohesion: 1.0
Nodes (1): E2E Testing Guide

### Community 62 - "Community 62"
Cohesion: 1.0
Nodes (1): Project Module README

### Community 63 - "Community 63"
Cohesion: 1.0
Nodes (1): Team Module README

### Community 64 - "Community 64"
Cohesion: 1.0
Nodes (1): DomainEvent

### Community 65 - "Community 65"
Cohesion: 1.0
Nodes (1): KAFKA_TOPICS

### Community 66 - "Community 66"
Cohesion: 1.0
Nodes (1): KAFKA_EVENTS

### Community 67 - "Community 67"
Cohesion: 1.0
Nodes (1): eventBus

### Community 68 - "Community 68"
Cohesion: 1.0
Nodes (1): pubsub

### Community 69 - "Community 69"
Cohesion: 1.0
Nodes (1): byId (Project)

### Community 70 - "Community 70"
Cohesion: 1.0
Nodes (1): byActorIdAndId (Project)

### Community 71 - "Community 71"
Cohesion: 1.0
Nodes (1): byId (ProjectMember)

### Community 72 - "Community 72"
Cohesion: 1.0
Nodes (1): byActorIdAndId (ProjectMember)

### Community 73 - "Community 73"
Cohesion: 1.0
Nodes (1): UnauthorizedError

### Community 74 - "Community 74"
Cohesion: 1.0
Nodes (1): teamResolvers

### Community 75 - "Community 75"
Cohesion: 1.0
Nodes (1): ProjectAggregated_RemoveProjectTeamMember

### Community 76 - "Community 76"
Cohesion: 1.0
Nodes (1): TaskAggregated_SyncTeamTaskCountListener

### Community 77 - "Community 77"
Cohesion: 1.0
Nodes (1): ProjectAggregated_DeleteProjectTeamMember

### Community 78 - "Community 78"
Cohesion: 1.0
Nodes (1): ProjectAggregated_DeleteProjectTeam

### Community 79 - "Community 79"
Cohesion: 1.0
Nodes (1): TeamAggregated_SyncTeamMemberCountListener

### Community 80 - "Community 80"
Cohesion: 1.0
Nodes (1): TaskAggregated_DeleteTaskLinksListener

### Community 81 - "Community 81"
Cohesion: 1.0
Nodes (1): TeamAggregated_OrphanTeamTasksListener

### Community 82 - "Community 82"
Cohesion: 1.0
Nodes (1): updateTask

### Community 83 - "Community 83"
Cohesion: 1.0
Nodes (1): deleteTask

### Community 84 - "Community 84"
Cohesion: 1.0
Nodes (1): insertTaskLink

### Community 85 - "Community 85"
Cohesion: 1.0
Nodes (1): SignIn Mutation

### Community 86 - "Community 86"
Cohesion: 1.0
Nodes (1): GetUserById Query

### Community 87 - "Community 87"
Cohesion: 1.0
Nodes (1): GetUsersByIds Query

### Community 88 - "Community 88"
Cohesion: 1.0
Nodes (1): CreateProject Mutation

### Community 89 - "Community 89"
Cohesion: 1.0
Nodes (1): RemoveProjectMembers Mutation

### Community 90 - "Community 90"
Cohesion: 1.0
Nodes (1): GetSingleProject Query

### Community 91 - "Community 91"
Cohesion: 1.0
Nodes (1): GetBatchProjects Query

### Community 92 - "Community 92"
Cohesion: 1.0
Nodes (1): GetUserProjects Query

### Community 93 - "Community 93"
Cohesion: 1.0
Nodes (1): GetProjectMembers Query

### Community 94 - "Community 94"
Cohesion: 1.0
Nodes (1): AddTeamMembers Mutation

### Community 95 - "Community 95"
Cohesion: 1.0
Nodes (1): RemoveTeamMembers Mutation

### Community 96 - "Community 96"
Cohesion: 1.0
Nodes (1): DeleteTeams Mutation

### Community 97 - "Community 97"
Cohesion: 1.0
Nodes (1): Optimistic Locking

### Community 98 - "Community 98"
Cohesion: 1.0
Nodes (1): CTE-Based Authorization

### Community 99 - "Community 99"
Cohesion: 1.0
Nodes (1): GraphQL DataLoaders

### Community 100 - "Community 100"
Cohesion: 1.0
Nodes (1): Trigger Service

### Community 101 - "Community 101"
Cohesion: 1.0
Nodes (1): CreateTask Mutation

### Community 102 - "Community 102"
Cohesion: 1.0
Nodes (1): DeleteTaskLink Mutation

### Community 103 - "Community 103"
Cohesion: 1.0
Nodes (1): UpdateTaskLink Mutation

### Community 104 - "Community 104"
Cohesion: 1.0
Nodes (1): TeamAggregated_UnassignMemberFromTeamTasksListener

### Community 105 - "Community 105"
Cohesion: 1.0
Nodes (1): ProjectAggregated_UnassignProjectTaskMember

### Community 106 - "Community 106"
Cohesion: 1.0
Nodes (1): ProjectAggregated_DeleteProjectReachability

### Community 107 - "Community 107"
Cohesion: 1.0
Nodes (1): ProjectAggregated_DeleteProjectTask

### Community 108 - "Community 108"
Cohesion: 1.0
Nodes (1): ProjectAggregated_DeleteProjectTaskLink

### Community 110 - "Community 110"
Cohesion: 1.0
Nodes (1): Teardown E2E Infrastructure

### Community 111 - "Community 111"
Cohesion: 1.0
Nodes (1): E2E Test HTTP Server

### Community 112 - "Community 112"
Cohesion: 1.0
Nodes (1): Get ISO Time String

### Community 113 - "Community 113"
Cohesion: 1.0
Nodes (1): Get Epoch Time

### Community 114 - "Community 114"
Cohesion: 1.0
Nodes (1): Encode Pagination Cursor

### Community 115 - "Community 115"
Cohesion: 1.0
Nodes (1): Decode Pagination Cursor

### Community 116 - "Community 116"
Cohesion: 1.0
Nodes (1): Outbox Entry Interface

### Community 117 - "Community 117"
Cohesion: 1.0
Nodes (1): Append Events to Outbox

### Community 118 - "Community 118"
Cohesion: 1.0
Nodes (1): Kafka Event Bus Implementation

### Community 119 - "Community 119"
Cohesion: 1.0
Nodes (1): Stop Outbox Relay Service

### Community 120 - "Community 120"
Cohesion: 1.0
Nodes (1): Add Users Script

### Community 121 - "Community 121"
Cohesion: 1.0
Nodes (1): Task Link Update E2E

### Community 122 - "Community 122"
Cohesion: 1.0
Nodes (1): Denormalization Migration

## Knowledge Gaps
- **152 isolated node(s):** `Frontend Design Philosophy`, `Task Read API`, `Future Backend Features`, `Internal Notification Service Design`, `Explicit Kafka Architecture` (+147 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Project Domain Service`** (14 nodes): `ProjectServiceImpl`, `.addProjectMembers()`, `.createProject()`, `.deleteProjects()`, `.destroy()`, `.getProjectMembers()`, `.getProjectMembersByActorIdAndIds()`, `.getProjectMembersByIds()`, `.getProjectsByActorIdAndProjectIds()`, `.getProjectsByIds()`, `.getProjectsOfUser()`, `.init()`, `.removeProjectMembers()`, `.updateProject()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (9 nodes): `InternalNotificationServiceImpl`, `.createNotification()`, `.createNotificationsBatch()`, `.destroy()`, `.getNotifications()`, `.getUnreadCount()`, `.init()`, `.markAllAsRead()`, `.markAsRead()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (9 nodes): `KafkaBus`, `.constructor()`, `.createConsumer()`, `.destroy()`, `.emit()`, `.executeHandlers()`, `.init()`, `.publish()`, `.subscribe()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (6 nodes): `LoggerImpl`, `.debug()`, `.error()`, `.info()`, `.warn()`, `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (6 nodes): `byActorIdAndId()`, `byId()`, `byActorIdAndId()`, `byId()`, `task.ts`, `team.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (5 nodes): `MemoryBus`, `.destroy()`, `.init()`, `.publish()`, `.subscribe()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (3 nodes): `addUsers()`, `getLetterSequence()`, `add-users.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (3 nodes): `TaskEvents_BatchAggregator`, `.handleTaskBatch()`, `.init()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (2 nodes): `Task Read API`, `Frontend Design Philosophy`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (2 nodes): `schema`, `typeDefs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (2 nodes): `createContext`, `yoga`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (2 nodes): `Origin Tracking (System Actor)`, `Recursive Event Loops`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (2 nodes): `Apply Schema Script`, `Wipe Schema Script`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (2 nodes): `Task Creation E2E`, `Event-Driven Counters`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (2 nodes): `Forest-based DAG Seeding`, `Reachability Index Table`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57`** (1 nodes): `Future Backend Features`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 58`** (1 nodes): `Internal Notification Service Design`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 59`** (1 nodes): `Project Automations: Conditions & Actions`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 60`** (1 nodes): `Team Automations: Conditions & Actions`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 61`** (1 nodes): `E2E Testing Guide`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 62`** (1 nodes): `Project Module README`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 63`** (1 nodes): `Team Module README`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 64`** (1 nodes): `DomainEvent`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 65`** (1 nodes): `KAFKA_TOPICS`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 66`** (1 nodes): `KAFKA_EVENTS`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 67`** (1 nodes): `eventBus`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 68`** (1 nodes): `pubsub`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 69`** (1 nodes): `byId (Project)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 70`** (1 nodes): `byActorIdAndId (Project)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 71`** (1 nodes): `byId (ProjectMember)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 72`** (1 nodes): `byActorIdAndId (ProjectMember)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 73`** (1 nodes): `UnauthorizedError`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 74`** (1 nodes): `teamResolvers`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 75`** (1 nodes): `ProjectAggregated_RemoveProjectTeamMember`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 76`** (1 nodes): `TaskAggregated_SyncTeamTaskCountListener`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 77`** (1 nodes): `ProjectAggregated_DeleteProjectTeamMember`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 78`** (1 nodes): `ProjectAggregated_DeleteProjectTeam`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 79`** (1 nodes): `TeamAggregated_SyncTeamMemberCountListener`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 80`** (1 nodes): `TaskAggregated_DeleteTaskLinksListener`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 81`** (1 nodes): `TeamAggregated_OrphanTeamTasksListener`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 82`** (1 nodes): `updateTask`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 83`** (1 nodes): `deleteTask`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 84`** (1 nodes): `insertTaskLink`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 85`** (1 nodes): `SignIn Mutation`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 86`** (1 nodes): `GetUserById Query`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 87`** (1 nodes): `GetUsersByIds Query`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 88`** (1 nodes): `CreateProject Mutation`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 89`** (1 nodes): `RemoveProjectMembers Mutation`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 90`** (1 nodes): `GetSingleProject Query`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 91`** (1 nodes): `GetBatchProjects Query`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 92`** (1 nodes): `GetUserProjects Query`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 93`** (1 nodes): `GetProjectMembers Query`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 94`** (1 nodes): `AddTeamMembers Mutation`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 95`** (1 nodes): `RemoveTeamMembers Mutation`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 96`** (1 nodes): `DeleteTeams Mutation`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 97`** (1 nodes): `Optimistic Locking`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 98`** (1 nodes): `CTE-Based Authorization`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 99`** (1 nodes): `GraphQL DataLoaders`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 100`** (1 nodes): `Trigger Service`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 101`** (1 nodes): `CreateTask Mutation`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 102`** (1 nodes): `DeleteTaskLink Mutation`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 103`** (1 nodes): `UpdateTaskLink Mutation`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 104`** (1 nodes): `TeamAggregated_UnassignMemberFromTeamTasksListener`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 105`** (1 nodes): `ProjectAggregated_UnassignProjectTaskMember`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 106`** (1 nodes): `ProjectAggregated_DeleteProjectReachability`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 107`** (1 nodes): `ProjectAggregated_DeleteProjectTask`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 108`** (1 nodes): `ProjectAggregated_DeleteProjectTaskLink`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 110`** (1 nodes): `Teardown E2E Infrastructure`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 111`** (1 nodes): `E2E Test HTTP Server`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 112`** (1 nodes): `Get ISO Time String`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 113`** (1 nodes): `Get Epoch Time`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 114`** (1 nodes): `Encode Pagination Cursor`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 115`** (1 nodes): `Decode Pagination Cursor`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 116`** (1 nodes): `Outbox Entry Interface`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 117`** (1 nodes): `Append Events to Outbox`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 118`** (1 nodes): `Kafka Event Bus Implementation`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 119`** (1 nodes): `Stop Outbox Relay Service`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 120`** (1 nodes): `Add Users Script`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 121`** (1 nodes): `Task Link Update E2E`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 122`** (1 nodes): `Denormalization Migration`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ProjectServiceImpl` connect `Project Domain Service` to `GraphQL Infrastructure & Errors`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Are the 10 inferred relationships involving `encodeCursor()` (e.g. with `getProjects()` and `getProjectMembers()`) actually correct?**
  _`encodeCursor()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Frontend Design Philosophy`, `Task Read API`, `Future Backend Features` to the rest of the system?**
  _152 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Event Handlers & Count Sync` be split into smaller, more focused modules?**
  _Cohesion score 0.03 - nodes in this community are weakly interconnected._
- **Should `E2E Test Infrastructure` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Task & Reachability Queries` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._
- **Should `GraphQL Infrastructure & Errors` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._