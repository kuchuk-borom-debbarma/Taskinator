import DataLoader from 'dataloader';
import { projectService } from '../modules/project';
import type { Project } from '../modules/project/ProjectService';
import { teamService } from '../modules/team';
import type { Team } from '../modules/team/TeamService';
import { taskService } from '../modules/task';
import type { ProjectTask } from '../modules/task/TaskService';
import { authService } from '../modules/auth';
import type { UserResult } from '../modules/auth/AuthService';

export const createLoaders = (userId: string) => {
    return {
        project: new DataLoader<string, Project | null>(async (ids) => {
            const projects = await projectService.getProjectsByIds(userId, ids as string[]);
            const map = new Map(projects.map(p => [p.id, p]));
            return ids.map(id => map.get(id) || null);
        }),
        team: new DataLoader<string, Team | null>(async (ids) => {
            const teams = await teamService.getTeamsByIds(userId, ids as string[]);
            const map = new Map(teams.map(t => [t.id, t]));
            return ids.map(id => map.get(id) || null);
        }),
        user: new DataLoader<string, UserResult | null>(async (ids) => {
            const users = await authService.getUsersByIds(ids as string[]);
            const map = new Map(users.map(u => [u.id, u]));
            return ids.map(id => map.get(id) || null);
        }),
    };
};
