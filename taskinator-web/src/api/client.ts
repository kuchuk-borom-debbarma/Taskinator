import axios from 'axios';
import type { Project, ProjectMember, Team, TeamMember, Task } from '../types';

const API_BASE_URL = 'http://127.0.0.1:3000';

const api = axios.create({
    baseURL: API_BASE_URL,
});

export const projectApi = {
    getProjects: (userId: string) => 
        api.get<Project[]>(`/projects`, { params: { userId } }).then(res => res.data),
    
    getProject: (userId: string, projectId: string) => 
        api.get<Project>(`/projects/${projectId}`, { params: { userId } }).then(res => res.data),
    
    getProjectMembers: (userId: string, projectId: string) =>
        api.get<ProjectMember[]>(`/projects/${projectId}/members`, { params: { userId } }).then(res => res.data),

    createProject: (data: { name: string; description?: string; userId: string }) => 
        api.post<Project>('/projects', data).then(res => res.data),

    deleteProjects: (userId: string, projectIds: string[]) =>
        api.delete('/projects', { data: { userId, projectIds } }).then(res => res.data),

    addProjectMembers: (data: { userId: string; projectId: string; usersToAdd: string[] }) =>
        api.post<ProjectMember[]>(`/projects/${data.projectId}/members`, data).then(res => res.data),

    deleteProjectMembers: (data: { userId: string; projectId: string; memberIds: string[] }) =>
        api.delete(`/projects/${data.projectId}/members`, { data }).then(res => res.data),
};

export const teamApi = {
    getTeams: (userId: string, projectId: string) => 
        api.get<Team[]>(`/teams`, { params: { userId, projectId } }).then(res => res.data),
    
    getTeamMembers: (userId: string, projectId: string, teamId: string) =>
        api.get<TeamMember[]>(`/teams/${teamId}/members`, { params: { userId, projectId } }).then(res => res.data),

    createTeams: (data: { userId: string; projectId: string; teams: string[] }) => 
        api.post<Team[]>('/teams', data).then(res => res.data),

    deleteTeams: (userId: string, projectId: string, teamIds: string[]) =>
        api.delete('/teams', { data: { userId, projectId, teamIds } }).then(res => res.data),

    addTeamMembers: (data: { userId: string; projectId: string; teamId: string; members: string[] }) =>
        api.post<TeamMember[]>(`/teams/${data.teamId}/members`, data).then(res => res.data),

    deleteTeamMembers: (data: { userId: string; projectId: string; teamId: string; members: string[] }) =>
        api.delete(`/teams/${data.teamId}/members`, { data }).then(res => res.data),
};

export const taskApi = {
    getTasks: (userId: string, projectId: string) => 
        api.get<Task[]>(`/tasks`, { params: { userId, projectId } }).then(res => res.data),
    
    createTask: (data: { 
        userId: string; 
        projectId: string; 
        title: string; 
        description: string; 
        initialStatus: string;
        parentTaskId?: string;
        teamId?: string;
        memberId?: string;
    }) => 
        api.post<Task>('/tasks', data).then(res => res.data),

    updateTasks: (userId: string, projectId: string, tasks: unknown[]) =>
        api.patch<string[]>('/tasks', { userId, projectId, tasks }).then(res => res.data),

    deleteTasks: (userId: string, projectId: string, taskIds: string[]) =>
        api.delete('/tasks', { data: { userId, projectId, taskIds } }).then(res => res.data),
};
