import type { GraphQLContext } from '../context.ts';
import _ from 'lodash';

/**
 * Standardizes the creation of a reference/stub object.
 * Ensuring we always have an 'id' and the correct __typename.
 */
export const buildRef = (id: string | null | undefined, __typename?: string) => {
    if (!id) return null;
    return { id, __typename };
};

/**
 * Checks if an entity is a stub (only has ID) or fully hydrated.
 */
const hasDetails = (entity: any, fields: string[]) => {
    if (!entity) return false;
    // If any of the required detail fields exist, we consider it hydrated
    return fields.some(f => !_.isNil(entity[f]));
};

/**
 * Generic resolve helper to handle stub detection and DataLoader invocation.
 */
export const resolveUser = async (user: any, context: GraphQLContext) => {
    if (!user) return null;
    if (hasDetails(user, ['username', 'email'])) return user;
    return context.loaders.user.load(user.id);
};

export const resolveTeam = async (team: any, context: GraphQLContext) => {
    if (!team) return null;
    if (hasDetails(team, ['name', 'projectId'])) return team;
    return context.loaders.team.load(team.id);
};

export const resolveProject = async (project: any, context: GraphQLContext) => {
    if (!project) return null;
    if (hasDetails(project, ['name', 'description'])) return project;
    return context.loaders.project.load(project.id);
};

export const resolveTask = async (task: any, context: GraphQLContext) => {
    if (!task) return null;
    if (hasDetails(task, ['title', 'status', 'projectId'])) return task;
    return context.loaders.task.load(task.id);
};
