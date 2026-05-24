export interface AutomationOption {
  value: string;
  label: string;
}

export type InputType =
  | 'SELECT'
  | 'TEXT'
  | 'NUMBER'
  | 'NONE'
  | 'TEAM_MEMBER'
  | 'COMPOSITE';

export interface TemplateField {
  key: string;
  inputType: InputType;
  label: string;
  placeholder?: string | null;
  staticOptions?: AutomationOption[] | null;
  dynamicOptionsSource?: string | null;
}

export interface ValueTemplate {
  inputType: InputType;
  label: string;
  placeholder?: string | null;
  staticOptions?: AutomationOption[] | null;
  dynamicOptionsSource?: string | null;
  fields?: TemplateField[] | null;
}

export interface TriggerTemplate {
  type: string;
  label: string;
  description: string;
  valueTemplate: ValueTemplate;
  supportedModes: string[];
  /**
   * Condition type keys that are semantically valid for this trigger.
   * Returned by the catalog; used by the wizard to filter Step 2.
   */
  compatibleConditions: string[];
  /**
   * Action type keys that are semantically valid for this trigger.
   * Returned by the catalog; used by the wizard to filter Step 3.
   */
  compatibleActions: string[];
}

export interface ConditionTemplate {
  type: string;
  label: string;
  description: string;
  valueTemplate: ValueTemplate;
}

export interface ActionTemplate {
  type: string;
  label: string;
  description: string;
  valueTemplate: ValueTemplate;
  supportedModes: string[];
}

export interface AutomationTemplatesCatalog {
  triggers: TriggerTemplate[];
  conditions: ConditionTemplate[];
  actions: ActionTemplate[];
}

export interface TaskAutomationRule {
  id: string;
  projectId: string;
  name: string;
  isActive: boolean;
  isSync: boolean;
  triggerType: string;
  triggerValue?: string | null;
  conditionType: string;
  conditionValue?: string | null;
  actionType: string;
  actionValue?: string | null;
  version: number;
}

export type CreateTaskAutomationRuleInput = Omit<TaskAutomationRule, 'id' | 'version'>;

export type UpdateTaskAutomationRuleInput = Partial<Omit<TaskAutomationRule, 'id'>> & {
  id: string;
  version: number;
  projectId: string;
};

export interface AutomationAPI {
  getTemplatesCatalog(projectId: string): Promise<AutomationTemplatesCatalog>;
  getRules(projectId: string): Promise<TaskAutomationRule[]>;
  createRule(input: CreateTaskAutomationRuleInput): Promise<TaskAutomationRule>;
  updateRule(input: UpdateTaskAutomationRuleInput): Promise<TaskAutomationRule>;
  deleteRule(projectId: string, ruleId: string): Promise<boolean>;
}
