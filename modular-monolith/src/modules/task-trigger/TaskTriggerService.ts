import type { BaseService } from '../project';

export type AutomationScope = 'TASK' | 'PROJECT' | 'TEAM' | 'MEMBER';

export type AutomationGroup = {
    id: string;
    name: string;
    scope: AutomationScope;
    targetId: string | null; // e.g. taskId, projectId, etc.
    triggerEvent: string;    // e.g. 'project.task.updated'
    isEnabled: boolean;
    createdAt: Date;
    updatedAt: Date;
};

export type AutomationRule = {
    id: string;
    groupId: string;
    sequenceNumber: number;
    conditions: any; // Predicate tree (all/any)
    actions: any[];  // Sequential array of {type, params}
    canPropagate: boolean;
    version: number;
    createdAt: Date;
    updatedAt: Date;
};

export interface TaskTriggerService extends BaseService {
    createAutomationGroup(data: {
        userId: string;
        name: string;
        scope: AutomationScope;
        targetId: string | null;
        triggerEvent: string;
    }): Promise<AutomationGroup>;

    addRuleToGroup(data: {
        userId: string;
        groupId: string;
        sequenceNumber: number;
        conditions: any;
        actions: any[];
        canPropagate?: boolean;
    }): Promise<AutomationRule>;

    getAutomationGroups(data: {
        scope: AutomationScope;
        targetId: string;
        triggerEvent: string;
    }): Promise<AutomationGroup[]>;

    getRulesForGroup(groupId: string): Promise<AutomationRule[]>;

    // Compatibility methods for old listeners if needed, otherwise clean them up in later steps
}
