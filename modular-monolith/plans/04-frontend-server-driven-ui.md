# Plan 04: Frontend Dynamic Form Integration & Server-Driven UI

This plan details the frontend client integration, dynamic form control rendering, and active state management inside `ui-v1`.

---

## 🛠️ 1. API Client Network layer

We will define standard client contracts that handle the server-driven metadata catalog and automation rules.

#### [NEW] [AutomationAPI.ts](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/ui-v1/src/api/interfaces/AutomationAPI.ts)
```typescript
export interface AutomationOption {
  value: string;
  label: string;
}

export interface ValueTemplate {
  inputType: 'SELECT' | 'TEXT' | 'NUMBER' | 'NONE';
  label: string;
  placeholder?: string;
  staticOptions?: AutomationOption[];
  dynamicOptionsSource?: string;
}

export interface TriggerTemplate {
  type: string;
  label: string;
  description: string;
  valueTemplate: ValueTemplate;
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
  triggerValue?: string;
  conditionType: string;
  conditionValue?: string;
  actionType: string;
  actionValue?: string;
  version: number;
}

export interface AutomationAPI {
  getTemplatesCatalog(projectId: string): Promise<AutomationTemplatesCatalog>;
  getRules(projectId: string): Promise<TaskAutomationRule[]>;
  createRule(input: Omit<TaskAutomationRule, 'id' | 'version'>): Promise<TaskAutomationRule>;
  updateRule(input: Partial<TaskAutomationRule> & { id: string; version: number }): Promise<TaskAutomationRule>;
  deleteRule(projectId: string, ruleId: string): Promise<boolean>;
}
```

---

## 🎨 2. Dumb Dynamic Form Renderer

Instead of building individual UI forms for different rules, we write a single generic form renderer component.

#### [NEW] [AutomationFormRenderer.tsx](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/ui-v1/src/components/Project/AutomationFormRenderer.tsx)
```tsx
import React from 'react';
import { ValueTemplate } from '../../api/interfaces/AutomationAPI';
import { Select, TextField } from '../shared/workspace';

interface RendererProps {
  template: ValueTemplate;
  value: string;
  onChange: (val: string) => void;
  projectStatuses: string[];
}

export const AutomationFormRenderer: React.FC<RendererProps> = ({
  template,
  value,
  onChange,
  projectStatuses,
}) => {
  if (template.inputType === 'NONE') return null;

  if (template.inputType === 'TEXT') {
    return (
      <TextField
        label={template.label}
        value={value}
        onChange={onChange}
        placeholder={template.placeholder}
      />
    );
  }

  if (template.inputType === 'SELECT') {
    const options = template.dynamicOptionsSource === 'PROJECT_STATUSES'
      ? projectStatuses.map(s => ({ value: s, label: s }))
      : template.staticOptions || [];

    return (
      <Select
        label={template.label}
        value={value}
        options={options}
        onChange={onChange}
      />
    );
  }

  return null;
};
```

---

## 🎛️ 3. Premium Automation Dashboard

We will build a clean dashboard allowing project managers to quickly toggle rules on or off, add new rules, and customize blocker messages.

#### [NEW] [AutomationDashboard.tsx](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/ui-v1/src/components/Project/AutomationDashboard.tsx)
* **Rule Lists**: Beautiful visual list layout organizing rules into "Active Blockers (Sync)" and "Background Cascades (Async)".
* **Form Builder**: Integrates `<AutomationFormRenderer />` to dynamically render options based on selected trigger/condition/action templates fetched from the server.
* **Toggles**: Clean, premium toggles for turning specific rules ON/OFF instantly using React Query optimistic mutations.
