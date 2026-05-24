import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import type { ValueTemplate } from '../../api/interfaces/AutomationAPI';
import { useApi } from '../../hooks/useApi';
import { TextField } from '../shared/workspace';

interface RendererProps {
  template: ValueTemplate;
  value: string;
  onChange: (value: string) => void;
  projectStatuses: string[];
  /** Required when template.dynamicOptionsSource is 'TEAM_MEMBER' */
  projectId?: string;
  /**
   * When true the picker shows special options:
   *   "actor"  – the person who triggered the rule
   *   "none"   – remove current assignee
   * Used by SET_ASSIGNEE action; ASSIGNEE_EQUALS condition omits them.
   */
  includeSpecialAssignees?: boolean;
}

const SELECT_CLASS =
  'w-full rounded-2xl border border-app-line bg-white/85 px-4 py-3 text-sm text-app-ink outline-none transition focus:border-app-accent focus:ring-4 focus:ring-app-accent/10';

/**
 * Dynamic form component that renders fields based on server-driven template specification.
 *
 * Supported inputTypes:
 *   NONE              – renders nothing
 *   TEXT / NUMBER     – single text/number input
 *   SELECT            – single dropdown (static or dynamic options)
 *   SELECT_FROM_TO    – two optional dropdowns for from/to status transitions
 *   TEAM_MEMBER       – two-step cascade: pick team → pick member from that team
 */
export function AutomationFormRenderer({
  template,
  value,
  onChange,
  projectStatuses,
  projectId,
  includeSpecialAssignees = false,
}: RendererProps) {
  if (template.inputType === 'NONE') return null;

  if (template.inputType === 'COMPOSITE' && template.fields) {
    let config: Record<string, string> = {};
    if (value) {
      try {
        config = JSON.parse(value);
      } catch {
        config = {};
      }
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {template.fields.map((field) => (
          <div key={field.key} className="w-full">
            <AutomationFormRenderer
              template={field}
              value={config[field.key] || ''}
              onChange={(newFieldVal) => {
                const updatedConfig = { ...config, [field.key]: newFieldVal };
                onChange(JSON.stringify(updatedConfig));
              }}
              projectStatuses={projectStatuses}
              projectId={projectId}
              includeSpecialAssignees={includeSpecialAssignees}
            />
          </div>
        ))}
      </div>
    );
  }

  if (template.inputType === 'TEXT' || template.inputType === 'NUMBER') {
    return (
      <TextField
        label={template.label}
        value={value}
        onChange={onChange}
        placeholder={template.placeholder ?? undefined}
        type={template.inputType === 'NUMBER' ? 'number' : 'text'}
      />
    );
  }

  // Resolve options list for SELECT
  const options =
    template.dynamicOptionsSource === 'PROJECT_STATUSES'
      ? projectStatuses.map((status) => ({ value: status, label: formatStatusLabel(status) }))
      : template.staticOptions ?? [];

  if (template.inputType === 'SELECT') {
    return (
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-app-ink">{template.label}</span>
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={SELECT_CLASS}
        >
          <option value="">Select</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  // Two-step Team → Member cascade picker
  if (template.inputType === 'TEAM_MEMBER') {
    return (
      <TeamMemberPicker
        projectId={projectId ?? ''}
        value={value}
        onChange={onChange}
        includeSpecialAssignees={includeSpecialAssignees}
      />
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// TeamMemberPicker
// Two-step cascade: first pick a team, then pick a member from that team.
// ---------------------------------------------------------------------------

function TeamMemberPicker({
  projectId,
  value,
  onChange,
  includeSpecialAssignees,
}: {
  projectId: string;
  value: string;
  onChange: (value: string) => void;
  includeSpecialAssignees: boolean;
}) {
  const { teamApi } = useApi();

  // Local team selection state (does not affect the saved value directly).
  const [selectedTeamId, setSelectedTeamId] = useState('');

  // Fetch all teams for the project.
  const teamsQuery = useQuery({
    queryKey: ['automation-teams', projectId],
    queryFn: () => teamApi.getTeams(projectId, { first: 50 }),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 10,
  });

  // Fetch members for the selected team.
  const membersQuery = useQuery({
    queryKey: ['automation-team-members', projectId, selectedTeamId],
    queryFn: () => teamApi.getTeamMembers(projectId, selectedTeamId, { first: 100 }),
    enabled: !!selectedTeamId,
    staleTime: 1000 * 60 * 5,
  });

  const teams = teamsQuery.data?.teams ?? [];
  const members = membersQuery.data?.members ?? [];

  // Determine the currently displayed member value (strip special values for the dropdown).
  const isSpecial = value === 'actor' || value === 'none' || value === '';
  const memberDropdownValue = isSpecial ? value : value;

  return (
    <div className="space-y-3">
      {/* Step 1: Team selector */}
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-app-ink">Team</span>
        {teamsQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-app-muted">
            <Loader2 size={14} className="animate-spin" />
            Loading teams…
          </div>
        ) : teams.length === 0 ? (
          <p className="rounded-2xl border border-app-line bg-white/85 px-4 py-3 text-sm text-app-muted">
            No teams found — create a team first before assigning members.
          </p>
        ) : (
          <select
            value={selectedTeamId}
            onChange={(event) => {
              setSelectedTeamId(event.target.value);
              // Clear the member value when team changes
              if (!includeSpecialAssignees) onChange('');
              else onChange('actor');
            }}
            className={SELECT_CLASS}
          >
            <option value="">Select a team…</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        )}
      </label>

      {/* Step 2: Member selector (only visible after a team is chosen) */}
      {selectedTeamId && (
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-app-ink">Member</span>
          {membersQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-app-muted">
              <Loader2 size={14} className="animate-spin" />
              Loading members…
            </div>
          ) : (
            <select
              value={memberDropdownValue}
              onChange={(event) => onChange(event.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">Select a member…</option>
              {/* Special options only for the SET_ASSIGNEE action */}
              {includeSpecialAssignees && (
                <>
                  <option value="actor">Person who triggered the rule</option>
                  <option value="none">Unassign (remove assignee)</option>
                </>
              )}
              {members.map((member) => (
                <option key={member.id} value={member.user?.id ?? member.id}>
                  {member.user?.username ?? member.id}
                </option>
              ))}
            </select>
          )}
        </label>
      )}

      {/* Show special-option picker when no team is selected but special options apply */}
      {!selectedTeamId && includeSpecialAssignees && (
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-app-ink">Or use a special value</span>
          <select
            value={isSpecial ? value : ''}
            onChange={(event) => onChange(event.target.value)}
            className={SELECT_CLASS}
          >
            <option value="">— choose —</option>
            <option value="actor">Person who triggered the rule</option>
            <option value="none">Unassign (remove assignee)</option>
          </select>
        </label>
      )}
    </div>
  );
}

/**
 * Formats a status string (e.g. READY_TO_TEST → Ready To Test) for display.
 */
export function formatStatusLabel(status: string) {
  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
