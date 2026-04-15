import DataLoader from 'dataloader';
import { projectService } from '../modules/project';
import type { Project } from '../modules/project/ProjectService';
import { teamService } from '../modules/team';
import type { Team } from '../modules/team/TeamService';
import { taskService } from '../modules/task';
import type { ProjectTask } from '../modules/task/TaskService';
import { authService } from '../modules/auth';
import type { UserResult } from '../modules/auth/AuthService';
import { automationService } from '../modules/automation';
import type { AutomationRule } from '../modules/automation/AutomationService';

export const createLoaders = (userId: string) => {
    return {
        project: new DataLoader<string, Project | null>(async (ids) => {
            const projects = await projectService.getProjectsByIds(
                userId,
                ids as string[],
            );
            const map = new Map(projects.map((p) => [p.id, p]));
            return ids.map((id) => map.get(id) || null);
        }),
        team: new DataLoader<string, Team | null>(async (ids) => {
            const teams = await teamService.getTeamsByIds(
                userId,
                ids as string[],
            );
            const map = new Map(teams.map((t) => [t.id, t]));
            return ids.map((id) => map.get(id) || null);
        }),
        user: new DataLoader<string, UserResult | null>(async (ids) => {
            const users = await authService.getUsersByIds(ids as string[]);
            const map = new Map(users.map((u) => [u.id, u]));
            return ids.map((id) => map.get(id) || null);
        }),
        taskAutomations: new DataLoader<string, AutomationRule[]>(
            async (taskIds) => {
                const map = await automationService.getAutomationsByTaskIds(
                    taskIds as string[],
                );
                return taskIds.map((id) => map.get(id) || []);
            },
        ),
        projectAutomations: new DataLoader<string, AutomationRule[]>(
            async (projectIds) => {
                const map = await automationService.getAutomationsByProjectIds(
                    projectIds as string[],
                );
                return projectIds.map((id) => map.get(id) || []);
            },
        ),
        teamAutomations: new DataLoader<string, AutomationRule[]>(
            async (teamIds) => {
                const map = await automationService.getAutomationsByTeamIds(
                    teamIds as string[],
                );
                return teamIds.map((id) => map.get(id) || []);
            },
        ),
        taskLinks: new DataLoader<
            { projectId: string; taskId: string },
            { direct: any[]; story: any[] },
            string
        >(
            async (keys) => {
                const projectGroups = new Map<string, string[]>();
                keys.forEach((k) => {
                    const taskIds = projectGroups.get(k.projectId) || [];
                    taskIds.push(k.taskId);
                    projectGroups.set(k.projectId, taskIds);
                });

                const resultMap = new Map<
                    string,
                    { direct: any[]; story: any[] }
                >();
                for (const [projectId, taskIds] of projectGroups.entries()) {
                    const linksMap = await taskService.getLinksByTaskIds(
                        projectId,
                        taskIds,
                    );
                    linksMap.forEach((val, tid) =>
                        resultMap.set(`${projectId}|${tid}`, val),
                    );
                }

                return keys.map(
                    (k) =>
                        resultMap.get(`${k.projectId}|${k.taskId}`) || {
                            direct: [],
                            story: [],
                        },
                );
            },
            { cacheKeyFn: (key) => `${key.projectId}|${key.taskId}` },
        ),
    };
};
