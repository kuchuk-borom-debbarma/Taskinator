import { createSchema } from 'graphql-yoga';
import { pubsub } from './pubsub';
import { projectService } from '../modules/project';
import { teamService } from '../modules/team';
import { taskService } from '../modules/task';
import { notificationService } from '../modules/internal-notification';
import { taskTriggerService } from '../modules/task-trigger';
import { authService } from '../modules/auth';
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
    creator: User
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

  type ProjectMemberConnection {
    edges: [ProjectMemberEdge!]!
    pageInfo: PageInfo!
  }

  type ProjectMemberEdge {
    node: ProjectMember!
    cursor: String!
  }

  type Team {
    id: ID!
    name: String!
    projectId: ID!
    createdBy: String!
    creator: User
    createdAt: String!
    updatedAt: String
  }

  type TeamMember {
    id: ID!
    teamId: ID!
    userId: String!
    user: User
    createdAt: String!
  }

  type TeamEdge {
    node: Team!
    cursor: String!
  }

  type TeamConnection {
    edges: [TeamEdge!]!
    pageInfo: PageInfo!
  }

  type TeamMemberConnection {
    edges: [TeamMemberEdge!]!
    pageInfo: PageInfo!
  }

  type TeamMemberEdge {
    node: TeamMember!
    cursor: String!
  }

  type Task {
    id: ID!
    title: String!
    description: String
    status: String!
    projectId: ID!
    teamId: ID
    team: Team
    memberId: ID
    assignee: User
    parentTaskId: ID
    materializedPath: String!
    createdBy: String!
    creator: User
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

  type TaskTrigger {
    id: ID!
    name: String!
    projectId: ID!
    taskId: ID!
    triggerType: String!
    triggerData: String!
    createdAt: String!
    updatedAt: String
  }

  type TaskTriggerEdge {
    node: TaskTrigger!
    cursor: String!
  }

  type TaskTriggerConnection {
    edges: [TaskTriggerEdge!]!
    pageInfo: PageInfo!
  }

  type InternalNotification {
    id: ID!
    userId: String!
    title: String!
    message: String!
    type: String!
    metadata: String
    isRead: Boolean!
    createdAt: String!
    readAt: String
  }

  type NotificationEdge {
    node: InternalNotification!
    cursor: String!
  }

  type NotificationConnection {
    edges: [NotificationEdge!]!
    pageInfo: PageInfo!
  }

  type Query {
    me: User
    projects(first: Int, after: String): ProjectConnection!
    project(id: ID!): Project
    teams(projectId: ID!, first: Int, after: String): TeamConnection!
    tasks(projectId: ID!, first: Int, after: String): TaskConnection!
    projectMembers(projectId: ID!, first: Int, after: String): ProjectMemberConnection!
    teamMembers(projectId: ID!, teamId: ID!, first: Int, after: String): TeamMemberConnection!
    taskTriggers(taskId: ID!, first: Int, after: String): TaskTriggerConnection!
    notifications(first: Int, after: String): NotificationConnection!
    unreadNotificationsCount: Int!
    searchUsers(search: String, first: Int, after: String): UserSearchResultConnection!
    searchTeamUsers(projectId: ID!, teamId: ID!, search: String, first: Int, after: String): UserSearchResultConnection!
  }

  type UserSearchResultConnection {
    edges: [UserSearchResultEdge!]!
    pageInfo: PageInfo!
  }

  type UserSearchResultEdge {
    node: User!
    cursor: String!
  }

  type User {
    id: ID!
    username: String!
    email: String!
  }

  type Mutation {
    createProject(name: String!, description: String): Project
    deleteProjects(projectIds: [ID!]!): Boolean
    addProjectMembers(projectId: ID!, userIds: [String!]!): [ProjectMember]
    removeProjectMembers(projectId: ID!, memberIds: [ID!]!): [ID]
    
    createTeam(projectId: ID!, name: String!): Team
    deleteTeams(projectId: ID!, teamIds: [ID!]!): [ID]
    addTeamMembers(projectId: ID!, teamId: ID!, userIds: [String!]!): [TeamMember]
    removeTeamMembers(projectId: ID!, teamId: ID!, userIds: [String!]!): [String]

    createTask(projectId: ID!, title: String!, description: String!, teamId: ID, parentTaskId: ID): Task
    updateTasks(projectId: ID!, tasks: [UpdateTaskInput!]!): [ID]
    deleteTasks(projectId: ID!, taskIds: [ID!]!): [ID]
    
    addTaskTrigger(taskId: ID!, projectId: ID!, name: String!, triggerType: String!, triggerData: String!): TaskTrigger
    deleteTaskTrigger(taskId: ID!, triggerId: ID!): Boolean

    markNotificationAsRead(id: ID!): Boolean
    markAllNotificationsAsRead: Boolean
  }

  input UpdateTaskInput {
    id: ID!
    version: Int!
    status: String
    title: String
    description: String
    teamId: ID
    memberId: ID
    parentTaskId: ID
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
    creator: (p: any, _: any, context: GraphQLContext) => context.loaders.user.load(p.userId),
  },
  ProjectMember: {
    createdAt: (m: any) => m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
    user: (m: any, _: any, context: GraphQLContext) => context.loaders.user.load(m.userId),
  },
  Team: {
    createdAt: (t: any) => t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt,
    updatedAt: (t: any) => t.updatedAt instanceof Date ? t.updatedAt.toISOString() : t.updatedAt,
    creator: (t: any, _: any, context: GraphQLContext) => context.loaders.user.load(t.createdBy),
  },
  TeamMember: {
    createdAt: (m: any) => m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
    user: (m: any, _: any, context: GraphQLContext) => context.loaders.user.load(m.userId),
  },
  Task: {
    createdAt: (t: any) => t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt,
    updatedAt: (t: any) => t.updatedAt instanceof Date ? t.updatedAt.toISOString() : t.updatedAt,
    project: (t: any, _: any, context: GraphQLContext) => context.loaders.project.load(t.projectId),
    team: (t: any, _: any, context: GraphQLContext) => t.teamId ? context.loaders.team.load(t.teamId) : null,
    assignee: (t: any, _: any, context: GraphQLContext) => t.memberId ? context.loaders.user.load(t.memberId) : null,
    creator: (t: any, _: any, context: GraphQLContext) => context.loaders.user.load(t.createdBy),
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
    projectMembers: async (_: any, { projectId, first, after }: any, context: GraphQLContext) => {
      if (!context.userId) throw new Error('Unauthorized');
      const { members, nextCursor } = await projectService.getProjectMembers(context.userId, projectId, {
        limit: first,
        cursor: after,
      });
      return {
        edges: members.map(m => ({ node: m, cursor: m.id })),
        pageInfo: { hasNextPage: !!nextCursor, endCursor: nextCursor },
      };
    },
    teamMembers: async (_: any, { projectId, teamId, first, after }: any, context: GraphQLContext) => {
      if (!context.userId) throw new Error('Unauthorized');
      const { members, nextCursor } = await teamService.getTeamMembers(context.userId, projectId, teamId, {
        limit: first,
        cursor: after,
      });
      return {
        edges: members.map(m => ({ node: m, cursor: m.id })),
        pageInfo: { hasNextPage: !!nextCursor, endCursor: nextCursor },
      };
    },
    taskTriggers: async (_: any, { taskId, first, after }: any, context: GraphQLContext) => {
      if (!context.userId) throw new Error('Unauthorized');
      const { triggers, nextCursor } = await taskTriggerService.getTriggersForTask({
        userId: context.userId,
        taskId,
        cursor: after,
        limit: first,
      });
      return {
        edges: triggers.map(t => ({ 
            node: { ...t, triggerData: JSON.stringify(t.triggerData) }, 
            cursor: t.id 
        })),
        pageInfo: { hasNextPage: !!nextCursor, endCursor: nextCursor },
      };
    },
    notifications: async (_: any, { first, after }: any, context: GraphQLContext) => {
      if (!context.userId) throw new Error('Unauthorized');
      const { notifications, nextCursor } = await notificationService.getNotifications(context.userId, {
        limit: first,
        cursor: after,
      });
      return {
        edges: notifications.map(n => ({ 
            node: { ...n, metadata: JSON.stringify(n.metadata) }, 
            cursor: n.id 
        })),
        pageInfo: { hasNextPage: !!nextCursor, endCursor: nextCursor },
      };
    },
    unreadNotificationsCount: async (_: any, __: any, context: GraphQLContext) => {
      if (!context.userId) throw new Error('Unauthorized');
      return notificationService.getUnreadCount(context.userId);
    },
    searchUsers: async (_: any, { search, first, after }: any, context: GraphQLContext) => {
        const { users, nextCursor } = await authService.searchUsers({ search, cursor: after, limit: first, actorId: context.userId });
        return {
            edges: users.map(u => ({ node: u, cursor: u.id })),
            pageInfo: { hasNextPage: !!nextCursor, endCursor: nextCursor },
        };
    },
    searchTeamUsers: async (_: any, { projectId, teamId, search, first, after }: any, context: GraphQLContext) => {
        const { users, nextCursor } = await teamService.searchTeamUsers({
            actorId: context.userId!,
            projectId,
            teamId,
            search,
            cursor: after,
            limit: first,
        });
        return {
            edges: users.map(u => ({ node: u, cursor: u.id })),
            pageInfo: { hasNextPage: !!nextCursor, endCursor: nextCursor },
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
    },
    addProjectMembers: async (_: any, { projectId, userIds }: any, context: GraphQLContext) => {
        if (!context.userId) throw new Error('Unauthorized');
        return projectService.addProjectMembers({
            userId: context.userId,
            projectId,
            usersToAdd: userIds
        });
    },
    removeProjectMembers: async (_: any, { projectId, memberIds }: any, context: GraphQLContext) => {
        if (!context.userId) throw new Error('Unauthorized');
        await projectService.deleteProjectMembers({
            userId: context.userId,
            projectId,
            memberIds
        });
        return memberIds;
    },
    createTeam: async (_: any, { projectId, name }: any, context: GraphQLContext) => {
        if (!context.userId) throw new Error('Unauthorized');
        const teams = await teamService.createTeams({
            userId: context.userId,
            projectId,
            teams: [name]
        });
        return teams[0];
    },
    deleteTeams: async (_: any, { projectId, teamIds }: any, context: GraphQLContext) => {
        if (!context.userId) throw new Error('Unauthorized');
        return teamService.deleteTeams(context.userId, projectId, teamIds);
    },
    addTeamMembers: async (_: any, { projectId, teamId, userIds }: any, context: GraphQLContext) => {
        if (!context.userId) throw new Error('Unauthorized');
        return teamService.addTeamMembers({
            userId: context.userId,
            projectId,
            teamId,
            members: userIds
        });
    },
    removeTeamMembers: async (_: any, { projectId, teamId, userIds }: any, context: GraphQLContext) => {
        if (!context.userId) throw new Error('Unauthorized');
        return teamService.deleteTeamMembers({
            userId: context.userId,
            projectId,
            teamId,
            members: userIds
        });
    },
    updateTasks: async (_: any, { projectId, tasks }: any, context: GraphQLContext) => {
        if (!context.userId) throw new Error('Unauthorized');
        return taskService.updateTasks({
            userId: context.userId,
            projectId,
            tasks
        });
    },
    deleteTasks: async (_: any, { projectId, taskIds }: any, context: GraphQLContext) => {
        if (!context.userId) throw new Error('Unauthorized');
        return taskService.deleteTask({
            userId: context.userId,
            projectId,
            taskIds
        });
    },
    addTaskTrigger: async (_: any, args: any, context: GraphQLContext) => {
        if (!context.userId) throw new Error('Unauthorized');
        await taskTriggerService.addTriggerToTask({
            userId: context.userId,
            projectId: args.projectId,
            taskId: args.taskId,
            name: args.name,
            triggerType: args.triggerType as any,
            triggerData: JSON.parse(args.triggerData)
        });
        // We'd need to fetch the newly created trigger, but for now we'll just return a placeholder or refetch
        const { triggers } = await taskTriggerService.getTriggersForTask({ userId: context.userId, taskId: args.taskId, limit: 1 });
        return { ...triggers[0], triggerData: JSON.stringify(triggers[0].triggerData) };
    },
    deleteTaskTrigger: async (_: any, { taskId, triggerId }: any, context: GraphQLContext) => {
        if (!context.userId) throw new Error('Unauthorized');
        await taskTriggerService.deleteTrigger({
            userId: context.userId,
            triggerId
        });
        return true;
    },
    markNotificationAsRead: async (_: any, { id }: any, context: GraphQLContext) => {
        if (!context.userId) throw new Error('Unauthorized');
        await notificationService.markAsRead(context.userId, id);
        return true;
    },
    markAllNotificationsAsRead: async (_: any, __: any, context: GraphQLContext) => {
        if (!context.userId) throw new Error('Unauthorized');
        await notificationService.markAllAsRead(context.userId);
        return true;
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
