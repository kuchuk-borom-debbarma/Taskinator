import axios from 'axios';
import { Project, Team, Task } from '../types';

const API_BASE_URL = 'http://localhost:3000';

const api = axios.create({
    baseURL: API_BASE_URL,
});

export const projectApi = {
    getProjects: (userId: string) => 
        api.get<Project[]>(`/projects`, { params: { userId } }).then(res => res.data),
    
    getProject: (userId: string, projectId: string) => 
        api.get<Project>(`/projects/${projectId}`, { params: { userId } }).then(res => res.data),
    
    createProject: (data: { name: string; description?: string; userId: string }) => 
        api.post<Project>('/projects', data).then(res => res.data),
};

export const teamApi = {
    getTeams: (userId: string, projectId: string) => 
        api.get<Team[]>(`/teams`, { params: { userId, projectId } }).then(res => res.data),
    
    createTeams: (data: { userId: string; projectId: string; teams: string[] }) => 
        api.post<Team[]>('/teams', data).then(res => res.data),
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
    }) => 
        api.post<Task>('/tasks', data).then(res => res.data),

    updateTasks: (userId: string, projectId: string, tasks: any[]) =>
        api.patch<string[]>('/tasks', { userId, projectId, tasks }).then(res => res.data),
};
