import type { BaseService } from '../project/ProjectService.ts';

export type AutomationScope = 'TASK' | 'PROJECT' | 'TEAM';

export type AutomationRule = {
    id: string;
    projectId: string;
    actorId: string;
    targetScope: AutomationScope;
    taskId?: string | null;
    teamId?: string | null;
    rules: any; // JSONB Array of { conditions, actions }
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
};

export interface AutomationService extends BaseService {
    addAutomation(data: {
        userId: string;
        projectId: string;
        targetScope: AutomationScope;
        taskId?: string;
        teamId?: string;
        rules: any;
        isActive?: boolean;
    }): Promise<AutomationRule>;

    updateAutomation(data: {
        userId: string;
        automationId: string;
        targetScope?: AutomationScope;
        taskId?: string | null;
        teamId?: string | null;
        rules?: any;
        isActive?: boolean;
    }): Promise<void>;

    getAutomationsByFilter(data: {
        projectId?: string;
        actorId?: string;
        taskId?: string | null;
        teamId?: string | null;
        targetScope?: AutomationScope;
        cursor?: string;
        limit?: number;
    }): Promise<{ automations: AutomationRule[]; nextCursor: string | null }>;

    deleteAutomation(data: { userId: string; automationId: string }): Promise<void>;
}
