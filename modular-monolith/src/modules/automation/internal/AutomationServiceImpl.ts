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
    getAutomationsByProjectIdsQuery,
    getAutomationsByTeamIdsQuery,
} from './AutomationQueries.ts';
import eventBus from '../../../utils/EventBus.ts';
import { automationListener } from './listeners/AutomationListener.ts';

export class AutomationServiceImpl implements AutomationService {
    async addAutomation(data: {
        userId: string;
        projectId: string;
        name: string;
        targetScope: AutomationScope;
        teamId?: string;
        rules: any;
        isActive?: boolean;
    }): Promise<AutomationRule> {
        return insertAutomation(data);
    }

    async updateAutomation(data: {
        userId: string;
        automationId: string;
        name?: string;
        targetScope?: AutomationScope;
        teamId?: string | null;
        rules?: any;
        isActive?: boolean;
    }): Promise<AutomationRule> {
        return await updateAutomationQuery(data);
    }

    async getAutomationsByFilter(data: {
        projectId?: string;
        actorId?: string;
        teamId?: string | null;
        targetScope?: AutomationScope;
        cursor?: string;
        limit?: number;
    }): Promise<{ automations: AutomationRule[]; nextCursor: string | null }> {
        return getAutomationsQuery(data);
    }

    async getAutomationsByProjectIds(
        projectIds: string[],
    ): Promise<Map<string, AutomationRule[]>> {
        return getAutomationsByProjectIdsQuery(projectIds);
    }

    async getAutomationsByTeamIds(
        teamIds: string[],
    ): Promise<Map<string, AutomationRule[]>> {
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
