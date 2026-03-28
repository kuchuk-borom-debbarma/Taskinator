export interface Project {
    id: string;
    userId: string;
    name: string;
    description: string | null;
    version: number;
    lastEventId: string | null;
    createdAt: string;
    updatedAt?: string;
}

export interface Team {
    id: string;
    name: string;
    projectId: string;
    createdBy: string;
    version: number;
    lastEventId: string | null;
    createdAt: string;
    updatedAt?: string;
}

export interface Task {
    id: string;
    projectId: string;
    teamId: string | null;
    memberId: string | null;
    parentTaskId: string | null;
    title: string;
    description: string;
    status: string;
    materializedPath: string;
    version: number;
    lastEventId: string | null;
    createdBy: string;
    updatedBy: string;
    createdAt: string;
    updatedAt: string;
}
