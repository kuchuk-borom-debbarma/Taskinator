# Plan 03: GraphQL API & Server-Driven Metadata Catalog

This plan details the GraphQL schema, CRUD mutations, queries, and the Server-Driven UI metadata template catalog resolver.

---

## 📑 1. GraphQL Schema Definitions

We will create a new separate schema file under `src/infra/graphql/schema/task/` which will automatically be merged at runtime by the loader.

#### [NEW] [task-automation.graphql](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/modular-monolith/src/infra/graphql/schema/task/task-automation.graphql)
```graphql
enum InputType {
  SELECT
  TEXT
  NUMBER
  NONE
}

type AutomationOption {
  value: String!
  label: String!
}

type ValueTemplate {
  inputType: InputType!
  label: String!
  placeholder: String
  staticOptions: [AutomationOption!]
  dynamicOptionsSource: String
}

type TriggerTemplate {
  type: String!
  label: String!
  description: String!
  valueTemplate: ValueTemplate!
}

type ConditionTemplate {
  type: String!
  label: String!
  description: String!
  valueTemplate: ValueTemplate!
}

type ActionTemplate {
  type: String!
  label: String!
  description: String!
  valueTemplate: ValueTemplate!
}

type AutomationTemplatesCatalog {
  triggers: [TriggerTemplate!]!
  conditions: [ConditionTemplate!]!
  actions: [ActionTemplate!]!
}

type TaskAutomationRule {
  id: ID!
  projectId: ID!
  name: String!
  isActive: Boolean!
  isSync: Boolean!
  triggerType: String!
  triggerValue: String
  conditionType: String!
  conditionValue: String
  actionType: String!
  actionValue: String
  version: Int!
}

input CreateTaskAutomationRuleInput {
  projectId: ID!
  name: String!
  isSync: Boolean!
  triggerType: String!
  triggerValue: String
  conditionType: String!
  conditionValue: String
  actionType: String!
  actionValue: String
}

input UpdateTaskAutomationRuleInput {
  projectId: ID!
  ruleId: ID!
  version: Int!
  name: String
  isActive: Boolean
  isSync: Boolean
  triggerType: String
  triggerValue: String
  conditionType: String
  conditionValue: String
  actionType: String
  actionValue: String
}

type DeleteAutomationRuleResult {
  success: Boolean!
  ruleId: ID!
}

extend type Query {
  automationTemplatesCatalog(projectId: ID!): AutomationTemplatesCatalog!
  taskAutomationRules(projectId: ID!): [TaskAutomationRule!]!
}

extend type Mutation {
  createTaskAutomationRule(input: CreateTaskAutomationRuleInput!): TaskAutomationRule!
  updateTaskAutomationRule(input: UpdateTaskAutomationRuleInput!): TaskAutomationRule!
  deleteTaskAutomationRule(projectId: ID!, ruleId: ID!): DeleteAutomationRuleResult!
}
```

---

## 🛠️ 2. GraphQL Resolvers

We will create a new resolver file dedicated to the TCA engine.

#### [NEW] [task-automation.ts](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/modular-monolith/src/infra/graphql/resolvers/task-automation.ts)
```typescript
import { taskService } from '../../../modules/task/index.ts';
import type { GraphQLContext } from '../context.ts';
import { UnauthorizedError } from '../errors.ts';

export const taskAutomationResolvers = {
    Query: {
        automationTemplatesCatalog: async (_parent: any, { projectId }: { projectId: string }, context: GraphQLContext) => {
            if (!context.userId) throw new UnauthorizedError();
            
            // Returns the Server-Driven UI metadata catalog
            return {
                triggers: [
                    {
                        type: 'TASK_STATUS_CHANGED',
                        label: 'When task status changes to',
                        description: 'Triggers when a task enters a specific status column.',
                        valueTemplate: {
                            inputType: 'SELECT',
                            label: 'Select Status',
                            dynamicOptionsSource: 'PROJECT_STATUSES'
                        }
                    },
                    {
                        type: 'PREREQUISITE_COMPLETED',
                        label: 'When all blocker prerequisites are completed',
                        description: 'Fires in the background when blocker dependencies are marked DONE.',
                        valueTemplate: {
                            inputType: 'NONE',
                            label: ''
                        }
                    }
                ],
                conditions: [
                    {
                        type: 'IS_BLOCKED',
                        label: 'If the task has active blockers',
                        description: 'Checks if prerequisites are incomplete.',
                        valueTemplate: {
                            inputType: 'NONE',
                            label: ''
                        }
                    },
                    {
                        type: 'ALL_PREREQUISITES_DONE',
                        label: 'If all prerequisite tasks are completed',
                        description: 'Checks if blockers count reaches 0.',
                        valueTemplate: {
                            inputType: 'NONE',
                            label: ''
                        }
                    }
                ],
                actions: [
                    {
                        type: 'SET_STATUS',
                        label: 'Set task status to',
                        description: 'Transitions task to target status column.',
                        valueTemplate: {
                            inputType: 'SELECT',
                            label: 'Target Status',
                            dynamicOptionsSource: 'PROJECT_STATUSES'
                        }
                    },
                    {
                        type: 'REJECT_TRANSITION',
                        label: 'Reject the drag-and-drop status transition',
                        description: 'Synchronously rejects status movement and displays a warning.',
                        valueTemplate: {
                            inputType: 'TEXT',
                            label: 'Custom Rejection Message',
                            placeholder: 'Task is blocked!'
                        }
                    }
                ]
            };
        },
        taskAutomationRules: async (_parent: any, { projectId }: { projectId: string }, context: GraphQLContext) => {
            if (!context.userId) throw new UnauthorizedError();
            return await taskService.getAutomationRulesForProject(context.userId, projectId);
        }
    },
    Mutation: {
        createTaskAutomationRule: async (_parent: any, { input }: any, context: GraphQLContext) => {
            if (!context.userId) throw new UnauthorizedError();
            return await taskService.createAutomationRule(context.userId, input);
        },
        updateTaskAutomationRule: async (_parent: any, { input }: any, context: GraphQLContext) => {
            if (!context.userId) throw new UnauthorizedError();
            return await taskService.updateAutomationRule(context.userId, input);
        },
        deleteTaskAutomationRule: async (_parent: any, { projectId, ruleId }: any, context: GraphQLContext) => {
            if (!context.userId) throw new UnauthorizedError();
            const success = await taskService.deleteAutomationRule(context.userId, projectId, ruleId);
            return { success, ruleId };
        }
    }
};
```

### Resolver Merging
#### [MODIFY] [index.ts](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/modular-monolith/src/infra/graphql/resolvers/index.ts)
Merge `taskAutomationResolvers` inside the exported array:

```typescript
import { taskAutomationResolvers } from './task-automation.ts';

export const resolvers = mergeResolvers([
    // ... other resolvers ...
    taskAutomationResolvers,
]);
```
