// ─── Config field types ───────────────────────────────────────────────────────

export type ActionInputType = 'text' | 'status-select' | 'priority-select' | 'none';

export interface ActionConfigField {
  key: string;
  label: string;
  inputType: ActionInputType;
  placeholder?: string;
}

export interface ActionTypeDefinition {
  key: string;
  label: string;
  description: string;
  icon: string; // lucide icon name — resolved in component
  configFields: ActionConfigField[];
}

// ─── Registry ─────────────────────────────────────────────────────────────────

export const ACTION_TYPE_REGISTRY: ActionTypeDefinition[] = [
  {
    key: 'task.update_status',
    label: 'Update Status',
    description: 'Change the task status to a specified value.',
    icon: 'CheckCircle2',
    configFields: [
      { key: 'status', label: 'New Status', inputType: 'status-select' },
    ],
  },
  {
    key: 'task.update_priority',
    label: 'Update Priority',
    description: 'Change the task priority level.',
    icon: 'AlertTriangle',
    configFields: [
      { key: 'priority', label: 'New Priority', inputType: 'priority-select' },
    ],
  },
  {
    key: 'task.assign_team',
    label: 'Assign Team',
    description: 'Assign the task to a specific team by ID.',
    icon: 'Users',
    configFields: [
      { key: 'teamId', label: 'Team ID', inputType: 'text', placeholder: 'Enter team UUID…' },
    ],
  },
  {
    key: 'task.assign_member',
    label: 'Assign Member',
    description: 'Assign the task to a specific member by ID.',
    icon: 'UserCheck',
    configFields: [
      { key: 'memberId', label: 'Member ID', inputType: 'text', placeholder: 'Enter member UUID…' },
    ],
  },
  {
    key: 'task.unassign_team',
    label: 'Unassign Team',
    description: 'Remove the currently assigned team from the task.',
    icon: 'UserMinus',
    configFields: [], // no config required
  },
  {
    key: 'task.unassign_member',
    label: 'Unassign Member',
    description: 'Remove the currently assigned member from the task.',
    icon: 'UserX',
    configFields: [], // no config required
  },
];

export const ACTION_TYPE_MAP = new Map(
  ACTION_TYPE_REGISTRY.map((def) => [def.key, def]),
);

export function getActionDefinition(key: string): ActionTypeDefinition | undefined {
  return ACTION_TYPE_MAP.get(key);
}

// ─── Config summary ───────────────────────────────────────────────────────────

export function summariseConfig(config: Record<string, any>): string {
  const entries = Object.entries(config).filter(([, v]) => v !== undefined && v !== null);
  if (entries.length === 0) return '—';
  return entries.map(([k, v]) => `${k} = ${String(v)}`).join(', ');
}
