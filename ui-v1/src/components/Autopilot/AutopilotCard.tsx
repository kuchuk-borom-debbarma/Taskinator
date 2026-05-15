import React from 'react';
import { motion } from 'framer-motion';
import { ToggleLeft, ToggleRight, Zap, ListChecks } from 'lucide-react';
import type { AutopilotItem, AutopilotConditionNode } from '../../api/interfaces/AutopilotAPI';

interface AutopilotCardProps {
  autopilot: AutopilotItem;
  onClick?: () => void;
}

/**
 * Extracts a human-readable summary from the first predicate leaf in the condition tree.
 * e.g., { type: 'predicate', field: 'status', operator: '==', value: 'DONE' } → "status == DONE"
 */
function extractConditionSummary(node: AutopilotConditionNode | null | undefined): string {
  if (!node) return '—';

  if (node.type === 'predicate') {
    const field = node.field ?? 'field';
    const op = node.operator ?? '==';
    const val = String(node.value ?? '…');
    return `${field} ${op} ${val}`;
  }

  // Recurse into children/child to find first predicate
  if (node.children && node.children.length > 0) {
    return extractConditionSummary(node.children[0]);
  }
  if (node.child) {
    return extractConditionSummary(node.child);
  }

  return node.type.toUpperCase();
}

export const AutopilotCard: React.FC<AutopilotCardProps> = ({ autopilot, onClick }) => {
  const conditionSummary = extractConditionSummary(autopilot.conditions);
  const isActive = autopilot.isActive;

  return (
    <motion.div
      whileHover={{ y: -3, boxShadow: '0 28px 60px rgba(20, 32, 48, 0.14)' }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      onClick={onClick}
      className="surface-card cursor-pointer rounded-[20px] p-5 flex flex-col gap-4"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${
              isActive ? 'bg-app-success' : 'bg-app-neutral'
            }`}
          />
          <span className="text-sm font-semibold text-app-ink line-clamp-1">
            Autopilot <span className="font-mono text-app-muted">#{autopilot.id.slice(-6)}</span>
          </span>
        </div>

        {/* Active toggle (visual-only for Phase 10) */}
        <div className="shrink-0 text-app-muted transition hover:text-app-ink">
          {isActive ? (
            <ToggleRight size={22} className="text-app-success" />
          ) : (
            <ToggleLeft size={22} />
          )}
        </div>
      </div>

      {/* Trigger badges */}
      <div className="flex flex-wrap gap-1.5">
        {autopilot.triggers.map((trigger) => (
          <span
            key={trigger}
            className="inline-flex items-center gap-1 rounded-full bg-app-accent-soft px-2.5 py-0.5 text-xs font-semibold text-app-accent"
          >
            <Zap size={10} />
            {trigger}
          </span>
        ))}
      </div>

      {/* Condition summary */}
      <p className="rounded-lg bg-app-line/30 px-3 py-2 font-mono text-xs text-app-muted line-clamp-1">
        {conditionSummary}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-app-muted">
        <span className="inline-flex items-center gap-1.5">
          <ListChecks size={13} />
          {autopilot.actions.length} action{autopilot.actions.length !== 1 ? 's' : ''}
        </span>
        <span>
          {new Date(autopilot.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
      </div>
    </motion.div>
  );
};
