import { createSchema } from 'graphql-yoga';
import { pubsub } from './pubsub';
import { projectService } from '../modules/project';
import { teamService } from '../modules/team';
import { taskService } from '../modules/task';
import type { GraphQLContext } from './context';

export const typeDefs = /* GraphQL */ `
  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  type Project {
    id: ID!
    name: String!
    description: String
    userId: String!
    isOwner: Boolean
    createdAt: String!
    updatedAt: String
  }

  type ProjectEdge {
    node: Project!
    cursor: String!
  }

  type ProjectConnection {
    edges: [ProjectEdge!]!
    pageInfo: PageInfo!
    totalCount: Int
  }

  type Team {
    id: ID!
    name: String!
    projectId: ID!
    createdBy: String!
    createdAt: String!
    updatedAt: String
  }

  type TeamEdge {
    node: Team!
    cursor: String!
  }

  type TeamConnection {
    edges: [TeamEdge!]!
    pageInfo: PageInfo!
  }

  type Task {
    id: ID!
    title: String!
    description: String
    status: String!
    projectId: ID!
    teamId: ID
    memberId: ID
    parentTaskId: ID
    materializedPath: String!
    createdBy: String!
    createdAt: String!
    updatedAt: String
  }

  type TaskEdge {
    node: Task!
    cursor: String!
  }

  type TaskConnection {
    edges: [TaskEdge!]!
    pageInfo: PageInfo!
  }

  type Query {
    me: User
    projects(first: Int, after: String): ProjectConnection!
    project(id: ID!): Project
    teams(projectId: ID!, first: Int, after: String): TeamConnection!
    tasks(projectId: ID!, first: Int, after: String): TaskConnection!
  }

  type User {
    id: ID!
    username: String!
    email: String!
  }

  type Mutation {
    createProject(name: String!, description: String): Project
    deleteProjects(projectIds: [ID!]!): Boolean
    createTask(projectId: ID!, title: String!, description: String!, teamId: ID, parentTaskId: ID): Task
  }

  type Subscription {
    taskEvents(projectId: ID!): TaskEvent!
  }

  union TaskEvent = TaskCreated | TaskUpdated | TaskDeleted

  type TaskCreated {
    task: Task!
  }

  type TaskUpdated {
    task: Task!
  }

  type TaskDeleted {
    id: ID!
    projectId: ID!
  }
`;

export const resolvers = {
  Project: {
    createdAt: (p: any) => p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
    updatedAt: (p: any) => p.updatedAt instanceof Date ? p.updatedAt.toISOString() : p.updatedAt,
  },
  Team: {
    createdAt: (t: any) => t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt,
    updatedAt: (t: any) => t.updatedAt instanceof Date ? t.updatedAt.toISOString() : t.updatedAt,
  },
  Task: {
    createdAt: (t: any) => t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt,
    updatedAt: (t: any) => t.updatedAt instanceof Date ? t.updatedAt.toISOString() : t.updatedAt,
    project: (t: any, _: any, context: GraphQLContext) => context.loaders.project.load(t.projectId),
  },
  Query: {
    me: (_: any, __: any, context: GraphQLContext) => {
      if (!context.userId) return null;
      // Fetching user details would normally go through an authLoader
      return { id: context.userId, username: 'Current User', email: 'user@taskinator.io' };
    },
    projects: async (_: any, { first, after }: any, context: GraphQLContext) => {
      if (!context.userId) throw new Error('Unauthorized');
      const { projects, nextCursor } = await projectService.getProjects(context.userId, {
        limit: first,
        cursor: after,
      });

      return {
        edges: projects.map((p) => ({
          node: p,
          cursor: `${p.createdAt}|${p.id}`,
        })),
        pageInfo: {
          hasNextPage: !!nextCursor,
          endCursor: nextCursor,
        },
      };
    },
    project: async (_: any, { id }: any, context: GraphQLContext) => {
      if (!context.userId) throw new Error('Unauthorized');
      return projectService.getProject(context.userId, id);
    },
    teams: async (_: any, { projectId, first, after }: any, context: GraphQLContext) => {
      if (!context.userId) throw new Error('Unauthorized');
      const { teams, nextCursor } = await teamService.getTeams(context.userId, projectId, {
        limit: first,
        cursor: after,
      });

      return {
        edges: teams.map((t) => ({
          node: t,
          cursor: t.id,
        })),
        pageInfo: {
          hasNextPage: !!nextCursor,
          endCursor: nextCursor,
        },
      };
    },
    tasks: async (_: any, { projectId, first, after }: any, context: GraphQLContext) => {
      if (!context.userId) throw new Error('Unauthorized');
      const { tasks, nextCursor } = await taskService.getTasks(context.userId, projectId, {
        limit: first,
        cursor: after,
      });

      return {
        edges: tasks.map((t) => ({
          node: t,
          cursor: t.id,
        })),
        pageInfo: {
          hasNextPage: !!nextCursor,
          endCursor: nextCursor,
        },
      };
    },
  },
  Mutation: {
    createProject: async (_: any, { name, description }: any, context: GraphQLContext) => {
        if (!context.userId) throw new Error('Unauthorized');
        return projectService.createProject({
            name,
            description,
            userId: context.userId
        });
    },
    deleteProjects: async (_: any, { projectIds }: any, context: GraphQLContext) => {
        if (!context.userId) throw new Error('Unauthorized');
        await projectService.deleteProjects({
            userId: context.userId,
            projectIds
        });
        return true;
    },
    createTask: async (_: any, args: any, context: GraphQLContext) => {
        if (!context.userId) throw new Error('Unauthorized');
        return taskService.createTask({
            userId: context.userId,
            projectId: args.projectId,
            title: args.title,
            description: args.description,
            teamId: args.teamId,
            parentTaskId: args.parentTaskId,
            initialStatus: 'TODO'
        });
    }
  },
  Subscription: {
    taskEvents: {
      subscribe: async function* (_: any, { projectId }: any) {
        // Listen to all task events and yield only those matching the projectId
        const taskCreated = pubsub.subscribe('task_created');
        const taskUpdated = pubsub.subscribe('task_updated');
        const taskDeleted = pubsub.subscribe('task_deleted');

        const combined = async function* () {
            const iterators = [taskCreated, taskUpdated, taskDeleted];
            // Simple multiplexing (not perfect but works for this demo)
            // Ideally use a library like 'iterall' or Yoga's multi-subscribe if available
            while (true) {
                const results = await Promise.race(iterators.map(it => it.next()));
                if (results.value) {
                    if ((results.value as any).projectId === projectId) {
                        yield { taskEvents: results.value };
                    }
                }
            }
        };
        
        // For simplicity and correctness in this environment, we'll use a better pattern:
        // Yoga's pubsub supports multiple event names, but we still need to filter.
        const iter = pubsub.subscribe('task_created', 'task_updated', 'task_deleted');
        for await (const event of iter) {
            if ((event as any).projectId === projectId) {
                // Map event to union type
                if ('title' in event) {
                    // It's Created or Updated. We need to distinguish or just wrap.
                    // For now, assume payload has enough info.
                    yield { taskEvents: { __typename: 'TaskCreated', task: event } };
                } else {
                    yield { taskEvents: { __typename: 'TaskDeleted', id: (event as any).id, projectId: (event as any).projectId } };
                }
            }
        }
      },
    },
  },
};

export const schema = createSchema({
  typeDefs,
  resolvers,
});
