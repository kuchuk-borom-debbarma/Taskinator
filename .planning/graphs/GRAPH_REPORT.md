# Graph Report - Taskinator-v2  (2026-05-16)

## Corpus Check
- 366 files · ~1,095,008 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 991 nodes · 1291 edges · 37 communities detected
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 89 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 54|Community 54]]

## God Nodes (most connected - your core abstractions)
1. `gql()` - 34 edges
2. `GraphQLTaskAPI` - 15 edges
3. `TaskServiceImpl` - 15 edges
4. `ProjectServiceImpl` - 14 edges
5. `GraphQLProjectAPI` - 13 edges
6. `TeamServiceImpl` - 13 edges
7. `GraphQLTeamAPI` - 12 edges
8. `encodeCursor()` - 12 edges
9. `decodeCursor()` - 12 edges
10. `seed()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `bootstrap()` --calls--> `startConsumers()`  [INFERRED]
  modular-monolith/src/app.ts → modular-monolith/src/kafka/registry.ts
- `bootstrap()` --calls--> `startOutboxRelay()`  [INFERRED]
  modular-monolith/src/app.ts → modular-monolith/src/utils/event-bus/OutboxRelay.ts
- `start()` --calls--> `bootstrap()`  [INFERRED]
  modular-monolith/src/index.ts → modular-monolith/src/app.ts
- `bootstrapE2E()` --calls--> `bootstrap()`  [INFERRED]
  modular-monolith/src/tests/e2e/helpers/server.ts → modular-monolith/src/app.ts
- `createEvent()` --calls--> `getTimeString()`  [INFERRED]
  modular-monolith/src/utils/event-bus/idempotency.ts → modular-monolith/src/utils/utils.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.03
Nodes (25): AutopilotDispatcher, ProjectAggregated_ChangeProjectMemberCount, ProjectAggregated_ChangeUserProjectCount, ProjectAggregated_DeleteProjectMember, ProjectAggregated_DeleteProjectReachability, ProjectAggregated_DeleteProjectTask, ProjectAggregated_DeleteProjectTaskLink, ProjectAggregated_DeleteProjectTeam (+17 more)

### Community 1 - "Community 1"
Cohesion: 0.03
Nodes (15): createLoaders(), createEvent(), createContext(), ConflictError, ForbiddenError, MutationFailedError, NotFoundError, UnauthorizedError (+7 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (3): gqlRequest(), createLink(), createTask()

### Community 3 - "Community 3"
Cohesion: 0.04
Nodes (19): AutopilotQueryService, getNotifications(), getProjectMembers(), getProjects(), getNeighbourhood(), getProjectTaskLinksPage(), getTaskLinksPage(), getTaskNeighbourLinksPage() (+11 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (5): GraphQLAutopilotAPI, GraphQLProjectAPI, GraphQLTaskAPI, GraphQLTeamAPI, gql()

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (7): deleteTeamMembers(), getTeamsByIds(), incrementTeamMemberCountsBulk(), insertTeam(), insertTeamMembers(), removeProjectTeamMembersBatch(), TeamServiceImpl

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (4): ActionRunner, AuditService, AutopilotEngine, LoggerImpl

### Community 7 - "Community 7"
Cohesion: 0.08
Nodes (4): centered(), centeredBold(), imgPlaceholder(), insertImage()

### Community 8 - "Community 8"
Cohesion: 0.11
Nodes (8): poll(), processOutboxBatch(), reconnectListener(), setupListener(), startOutboxRelay(), ProjectContextResolver, TaskContextResolver, applySchema()

### Community 9 - "Community 9"
Cohesion: 0.09
Nodes (13): stopOutboxRelay(), bootstrapE2E(), teardownE2E(), ExternalNotificationServiceImpl, startConsumers(), createClient(), getRedisPublisher(), getRedisSubscriber() (+5 more)

### Community 10 - "Community 10"
Cohesion: 0.13
Nodes (5): useLayout(), useApi(), CreateProjectModal(), AuthenticatedLayout(), TaskGraphView()

### Community 11 - "Community 11"
Cohesion: 0.25
Nodes (12): elapsed(), esc(), generateEmail(), generateProjectName(), generateTaskTitle(), generateTeamName(), generateUsername(), pick() (+4 more)

### Community 12 - "Community 12"
Cohesion: 0.16
Nodes (4): getPriorityMeta(), getStatusMeta(), PriorityBadge(), StatusBadge()

### Community 13 - "Community 13"
Cohesion: 0.24
Nodes (10): addSortIndicators(), enableUI(), getNthColumn(), getTable(), getTableBody(), getTableHeader(), loadColumns(), loadData() (+2 more)

### Community 14 - "Community 14"
Cohesion: 0.14
Nodes (1): ProjectServiceImpl

### Community 15 - "Community 15"
Cohesion: 0.35
Nodes (12): buildForestLinks(), bulkInsert(), elapsed(), esc(), generateEmail(), generateTaskTitle(), generateTeamName(), generateUsername() (+4 more)

### Community 16 - "Community 16"
Cohesion: 0.29
Nodes (7): a(), B(), D(), g(), i(), Q(), y()

### Community 17 - "Community 17"
Cohesion: 0.28
Nodes (1): KafkaBus

### Community 18 - "Community 18"
Cohesion: 0.29
Nodes (3): ApiProvider(), useAuth(), RootComponent()

### Community 19 - "Community 19"
Cohesion: 0.4
Nodes (2): getLinkLabelColor(), RelationshipTooltip()

### Community 20 - "Community 20"
Cohesion: 0.4
Nodes (2): handleClose(), handleCreate()

### Community 21 - "Community 21"
Cohesion: 0.53
Nodes (4): handleAdd(), handleEditSave(), handleRemove(), notify()

### Community 23 - "Community 23"
Cohesion: 0.4
Nodes (2): TaskGraph(), useTaskGraphLayout()

### Community 24 - "Community 24"
Cohesion: 0.7
Nodes (4): goToNext(), goToPrevious(), makeCurrent(), toggleClass()

### Community 25 - "Community 25"
Cohesion: 0.4
Nodes (1): MemoryBus

### Community 26 - "Community 26"
Cohesion: 0.5
Nodes (2): D(), F()

### Community 31 - "Community 31"
Cohesion: 0.67
Nodes (2): handleAdd(), handleClose()

### Community 32 - "Community 32"
Cohesion: 0.67
Nodes (1): ConditionEvaluator

### Community 33 - "Community 33"
Cohesion: 0.5
Nodes (1): ContextService

### Community 34 - "Community 34"
Cohesion: 0.67
Nodes (2): D(), fr()

### Community 35 - "Community 35"
Cohesion: 0.67
Nodes (2): D(), F()

### Community 36 - "Community 36"
Cohesion: 0.67
Nodes (2): D(), F()

### Community 37 - "Community 37"
Cohesion: 0.67
Nodes (2): D(), fr()

### Community 43 - "Community 43"
Cohesion: 1.0
Nodes (2): conditionTreeToGraph(), traverse()

### Community 44 - "Community 44"
Cohesion: 0.67
Nodes (1): AuthenticationError

### Community 45 - "Community 45"
Cohesion: 1.0
Nodes (2): addUsers(), getLetterSequence()

### Community 54 - "Community 54"
Cohesion: 1.0
Nodes (2): cardH(), mid()

## Knowledge Gaps
- **Thin community `Community 14`** (14 nodes): `ProjectServiceImpl`, `.addProjectMembers()`, `.createProject()`, `.deleteProjects()`, `.destroy()`, `.getProjectMembers()`, `.getProjectMembersByActorIdAndIds()`, `.getProjectMembersByIds()`, `.getProjectsByActorIdAndProjectIds()`, `.getProjectsByIds()`, `.getProjectsOfUser()`, `.init()`, `.removeProjectMembers()`, `.updateProject()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (9 nodes): `KafkaBus`, `.constructor()`, `.createConsumer()`, `.destroy()`, `.emit()`, `.executeHandlers()`, `.init()`, `.publish()`, `.subscribe()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (6 nodes): `ControlButton()`, `getLinkLabelColor()`, `handleKeyDown()`, `handleWheel()`, `RelationshipTooltip()`, `TaskMap.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (6 nodes): `handleBack()`, `handleClose()`, `handleCreate()`, `handleNext()`, `toggleTrigger()`, `CreateAutopilotModal.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (5 nodes): `getLinkLabelColor()`, `TaskGraph()`, `useTaskGraphLayout()`, `TaskGraph.tsx`, `useTaskGraphLayout.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (5 nodes): `MemoryBus`, `.destroy()`, `.init()`, `.publish()`, `.subscribe()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (5 nodes): `TransactionalOutbox.tsx`, `D()`, `F()`, `SP()`, `tx()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (4 nodes): `ActionTypeTile()`, `handleAdd()`, `handleClose()`, `AddActionModal.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (4 nodes): `ConditionEvaluator`, `.evaluate()`, `.evaluatePredicate()`, `ConditionEvaluator.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (4 nodes): `ContextService`, `.buildContext()`, `.registerResolver()`, `ContextService.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (4 nodes): `UpgradedAsyncFlow.tsx`, `D()`, `fr()`, `sp()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (4 nodes): `ConcurrencyControl.tsx`, `D()`, `F()`, `SP()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (4 nodes): `AsyncProblems.tsx`, `D()`, `F()`, `SP()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (4 nodes): `AsyncSolution.tsx`, `D()`, `fr()`, `sp()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (3 nodes): `conditionTreeToGraph()`, `traverse()`, `treeSerializer.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (3 nodes): `AuthenticationError`, `.constructor()`, `errors.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (3 nodes): `add-users.ts`, `addUsers()`, `getLetterSequence()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (3 nodes): `SchemaDesign.tsx`, `cardH()`, `mid()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ProjectServiceImpl` connect `Community 14` to `Community 1`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `TeamServiceImpl` connect `Community 5` to `Community 1`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Are the 33 inferred relationships involving `gql()` (e.g. with `.getProjectAutopilots()` and `.createAutopilot()`) actually correct?**
  _`gql()` has 33 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.03 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.03 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._