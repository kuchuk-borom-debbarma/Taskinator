export interface Project {
    id: string;
    userId: string;
    name: string;
    description: string | null;
    version: number;
    lastEventId: string | null;
    isOwner?: boolean;
    createdAt: string;
    updatedAt?: string;
    creator?: { id: string; username: string };
}

export interface ProjectMember {
    id: string;
    projectId: string;
    userId: string;
    version: number;
    lastEventId: string | null;
    createdAt: string;
    updatedAt: string;
    user?: { id: string; username: string; email: string };
}

export interface Team {
    id: string;
    name: string;
    projectId: string;
    createdBy: string;
    version: number;
    lastEventId: string | null;
    createdAt: string;
    updatedAt: string;
    creator?: { id: string; username: string };
}

export interface TeamMember {
    id: string;
    projectId: string;
    teamId: string;
    userId: string;
    version: number;
    lastEventId: string | null;
    createdAt: string;
    updatedAt: string;
    user?: { id: string; username: string; email: string };
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
    creator?: { id: string; username: string };
    assignee?: { id: string; username: string };
    team?: { id: string; name: string };
}

export interface StartSignUpParam {
    email: string;
    username: string;
    password: string;
}

export interface SignInParam {
    email: string;
    password: string;
}

export interface JWTPayload {
    id: string;
    email: string;
    username: string;
    iat: number;
    exp: number;
}



export interface InternalNotification {
    id: string;
    userId: string;
    title: string;
    message: string;
    type: string;
    metadata: Record<string, unknown>;
    isRead: boolean;
    createdAt: string;
    readAt: string | null;
}
