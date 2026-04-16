import type { BaseService } from '../project';

export type AutomationScope = 'PROJECT' | 'TEAM';

export type AutomationRule = {
    id: string;
    projectId: string;
    actorId: string;
    name: string;
    targetScope: AutomationScope;
    teamId?: string | null;
    rules: any; // JSONB Array of { operator, rules, actions }
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
};

export interface AutomationService extends BaseService {
    addAutomation(data: {
        userId: string;
        projectId: string;
        name: string;
        targetScope: AutomationScope;
        teamId?: string;
        rules: any;
        isActive?: boolean;
    }): Promise<AutomationRule>;

    updateAutomation(data: {
        userId: string;
        automationId: string;
        name?: string;
        targetScope?: AutomationScope;
        teamId?: string | null;
        rules?: any;
        isActive?: boolean;
    }): Promise<AutomationRule>;

    getAutomationsByFilter(data: {
        projectId?: string;
        actorId?: string;
        teamId?: string | null;
        targetScope?: AutomationScope;
        cursor?: string;
        limit?: number;
    }): Promise<{ automations: AutomationRule[]; nextCursor: string | null }>;

    getAutomationsByProjectIds(
        projectIds: string[],
    ): Promise<Map<string, AutomationRule[]>>;
    getAutomationsByTeamIds(
        teamIds: string[],
    ): Promise<Map<string, AutomationRule[]>>;

    deleteAutomation(data: {
        userId: string;
        automationId: string;
    }): Promise<void>;
}
