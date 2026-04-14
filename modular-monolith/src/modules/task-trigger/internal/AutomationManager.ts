import { 
    getMatchingAutomationGroups, 
    getRulesByGroupId,
    createAutomationGroupQuery,
    addRuleToGroupQuery
} from './AutomationQueries.ts';
import type { 
    AutomationGroup, 
    AutomationRule, 
    AutomationScope,
    TaskTriggerService
} from '../TaskTriggerService.ts';

export class AutomationManager {
    /**
     * Finds all rules applicable to a specific event and scope.
     * This orchestrates the two-step fetch: Groups -> Rules.
     */
    async getRulesForEvent(data: {
        triggerEvent: string;
        scope: AutomationScope;
        targetId: string;
    }): Promise<AutomationRule[]> {
        const groups = await getMatchingAutomationGroups(data);
        if (groups.length === 0) return [];

        const allRules: AutomationRule[] = [];
        
        // Fetch rules for each matching group sequentially to maintain sequence_number logic if needed
        // Though they are already ordered within groups.
        for (const group of groups) {
            const rules = await getRulesByGroupId(group.id);
            allRules.push(...rules);
        }

        return allRules;
    }

    async createGroup(data: any): Promise<AutomationGroup> {
        return createAutomationGroupQuery(data);
    }

    async addRule(data: any): Promise<AutomationRule> {
        return addRuleToGroupQuery(data);
    }
}

export const automationManager = new AutomationManager();
