import type {
    AutomationRule,
    AutomationScope,
    AutomationService,
} from '../AutomationService.ts';
import {
    deleteAutomationQuery,
    getAutomationsQuery,
    insertAutomation,
    updateAutomationQuery,
    getAutomationsByTaskIdsQuery,
    getAutomationsByProjectIdsQuery,
    getAutomationsByTeamIdsQuery
} from './AutomationQueries.ts';
import eventBus from '../../../utils/EventBus.ts';
import { automationListener } from './listeners/AutomationListener.ts';

export class AutomationServiceImpl implements AutomationService {
    async addAutomation(data: {
        userId: string;
        projectId: string;
        targetScope: AutomationScope;
        taskId?: string;
        teamId?: string;
        rules: any;
        isActive?: boolean;
    }): Promise<AutomationRule> {
        return insertAutomation(data);
    }

    async updateAutomation(data: {
        userId: string;
        automationId: string;
        targetScope?: AutomationScope;
        taskId?: string | null;
        teamId?: string | null;
        rules?: any;
        isActive?: boolean;
    }): Promise<void> {
        await updateAutomationQuery(data);
    }

    async getAutomationsByFilter(data: {
        projectId?: string;
        actorId?: string;
        taskId?: string | null;
        teamId?: string | null;
        targetScope?: AutomationScope;
        cursor?: string;
        limit?: number;
    }): Promise<{ automations: AutomationRule[]; nextCursor: string | null }> {
        return getAutomationsQuery(data);
    }

    async getAutomationsByTaskIds(taskIds: string[]): Promise<Map<string, AutomationRule[]>> {
        return getAutomationsByTaskIdsQuery(taskIds);
    }

    async getAutomationsByProjectIds(projectIds: string[]): Promise<Map<string, AutomationRule[]>> {
        return getAutomationsByProjectIdsQuery(projectIds);
    }

    async getAutomationsByTeamIds(teamIds: string[]): Promise<Map<string, AutomationRule[]>> {
        return getAutomationsByTeamIdsQuery(teamIds);
    }

    async deleteAutomation(data: {
        userId: string;
        automationId: string;
    }): Promise<void> {
        await deleteAutomationQuery(data);
    }

    async destroy(): Promise<void> {
        console.log(`Disconnecting event bus ${this.constructor.name}`);
        await automationListener.stop();
        await eventBus.destroy();
    }

    async init(): Promise<void> {
        console.log(`Initializing event bus ${this.constructor.name}`);
        await eventBus.init();
        await automationListener.init();
    }
}
