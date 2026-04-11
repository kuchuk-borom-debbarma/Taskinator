import DataLoader from 'dataloader';
import { projectService } from '../modules/project';
import type { Project } from '../modules/project/ProjectService';
import { teamService } from '../modules/team';
import type { Team } from '../modules/team/TeamService';
import { taskService } from '../modules/task';
import type { ProjectTask } from '../modules/task/TaskService';

export const createLoaders = (userId: string) => {
    return {
        project: new DataLoader<string, Project | null>(async (ids) => {
            const projects = await projectService.getProjectsByIds(userId, ids as string[]);
            const map = new Map(projects.map(p => [p.id, p]));
            return ids.map(id => map.get(id) || null);
        }),
        team: new DataLoader<string, Team | null>(async (ids) => {
            // Placeholder: currently teamService doesn't have batch fetch. 
            // We fetch individually for now but DataLoaders still cache duplicates.
            // Ideally, we'd add getTeamsByIds to TeamService.
            return Promise.all(ids.map(id => teamService.getTeams(userId, '', { limit: 1 }).then(res => res.teams.find(t => t.id === id) || null)));
        }),
    };
};
