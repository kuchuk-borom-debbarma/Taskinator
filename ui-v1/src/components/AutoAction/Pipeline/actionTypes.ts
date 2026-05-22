// ─── Config field types ───────────────────────────────────────────────────────

export type ActionInputType = 'text' | 'target-select' | 'field-select' | 'dynamic-value' | 'none';

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
    key: 'set',
    label: 'Set Field Value',
    description: 'Set a specific field on a target entity to a value.',
    icon: 'CheckCircle2',
    configFields: [
      { key: 'target', label: 'Target Entity', inputType: 'target-select' },
      { key: 'field', label: 'Field Name', inputType: 'field-select' },
      { key: 'value', label: 'Value', inputType: 'dynamic-value' },
    ],
  },
  {
    key: 'unset',
    label: 'Clear Field Value',
    description: 'Remove/clear a field value on a target entity.',
    icon: 'UserX',
    configFields: [
      { key: 'target', label: 'Target Entity', inputType: 'target-select' },
      { key: 'field', label: 'Field Name', inputType: 'field-select' },
    ],
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
  const target = config.target || 'self';
  const field = config.field || '—';
  const value = config.value !== undefined ? String(config.value) : '';
  if (value) {
    return `${target}.${field} = "${value}"`;
  }
  return `Clear ${target}.${field}`;
}

// ─── Normalize Action ─────────────────────────────────────────────────────────

export interface NormalizedAction {
  type: string;
  config: Record<string, any>;
}

export function normalizeAction(action: { type: string; params?: any; config?: any }): NormalizedAction {
  const type = action.type;
  const params = action.params || action.config || {};

  // If it's already generic set/unset
  if (type === 'set' || type === 'unset') {
    return {
      type,
      config: {
        target: params.target || 'self',
        field: params.field || '',
        value: params.value !== undefined ? params.value : '',
      }
    };
  }

  // Fallback / legacy format normalization
  // If it's e.g. task.update_status, map it back to set status
  if (type === 'task.update_status') {
    return {
      type: 'set',
      config: { target: 'self', field: 'status', value: params.status || '' }
    };
  }
  if (type === 'task.update_priority') {
    return {
      type: 'set',
      config: { target: 'self', field: 'priority', value: params.priority || '' }
    };
  }
  if (type === 'task.assign_team') {
    return {
      type: 'set',
      config: { target: 'self', field: 'fk_team_id', value: params.teamId || '' }
    };
  }
  if (type === 'task.assign_member') {
    return {
      type: 'set',
      config: { target: 'self', field: 'fk_member_id', value: params.memberId || '' }
    };
  }
  if (type === 'task.unassign_team') {
    return {
      type: 'unset',
      config: { target: 'self', field: 'fk_team_id', value: '' }
    };
  }
  if (type === 'task.unassign_member') {
    return {
      type: 'unset',
      config: { target: 'self', field: 'fk_member_id', value: '' }
    };
  }

  return { type, config: params };
}

