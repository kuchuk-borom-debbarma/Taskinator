import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ToggleLeft, ToggleRight, Zap, ListChecks, ChevronDown, GitBranch, Edit2, Trash2 } from 'lucide-react';
import { graphql, useFragment } from '../../gql';
import type { FragmentType } from '../../gql';
import { ConditionBuilderCanvas } from './Builder/ConditionBuilderCanvas';
import { PipelineEditor } from './Pipeline/PipelineEditor';

export const AutopilotCardFragment = graphql(`
  fragment AutopilotCardFragment on Autopilot {
    id
    fk_project_id
    triggers
    isActive
    createdAt
    version
    pipeline {
      __typename
      ... on AutopilotCondition {
        id
        name
        definition {
          __typename
          ... on PredicateNode {
            domain
            field
            operator
            value
          }
          ... on AndNode {
            children {
              __typename
            }
          }
          ... on OrNode {
            children {
              __typename
            }
          }
          ... on NotNode {
            child {
              __typename
            }
          }
        }
      }
      ... on AutopilotAction {
        id
        type
        params
      }
    }
  }
`);

interface AutopilotCardProps {
  autopilot: FragmentType<typeof AutopilotCardFragment>;
  onClick?: () => void;
  onToggle?: (id: string, isActive: boolean) => void;
  onEdit?: (autopilot: any) => void;
  onDelete?: (id: string) => void;
}

/**
 * Extracts a human-readable summary from the first predicate leaf in the condition tree.
 */
function extractConditionSummary(node: any): string {
  if (!node) return '—';

  if (node.__typename === 'PredicateNode') {
    const field = node.field ?? 'field';
    const op = node.operator ?? '==';
    const val = String(node.value ?? '…');
    return `${field} ${op} ${val}`;
  }

  // Handle nested nodes if needed, but for summary we usually just look at top level or first child
  if (node.__typename === 'AndNode' || node.__typename === 'OrNode') {
    return node.__typename === 'AndNode' ? 'ALL OF...' : 'ANY OF...';
  }

  if (node.__typename === 'NotNode') {
    return 'NOT...';
  }

  return 'Condition';
}

export const AutopilotCard: React.FC<AutopilotCardProps> = ({ autopilot: fragmentProp, onClick, onToggle, onEdit, onDelete }) => {
  const autopilot = useFragment(AutopilotCardFragment, fragmentProp);
  const [expanded, setExpanded] = useState(false);
  const [pipelineExpanded, setPipelineExpanded] = useState(false);

  // Extract first condition and actions from pipeline
  const conditions = autopilot.pipeline
    .filter((step): step is any => step.__typename === 'AutopilotCondition')
    .map(step => step);
  
  const actions = autopilot.pipeline
    .filter((step): step is any => step.__typename === 'AutopilotAction')
    .map(step => ({
      id: step.id,
      type: step.type,
      config: step.params,
      position: 0 // Will be handled by index in editor
    }));

  const firstCondition = conditions[0];
  const conditionSummary = firstCondition 
    ? extractConditionSummary(firstCondition.definition) 
    : 'No conditions';
    
  const isActive = autopilot.isActive;

  const handleExpandToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded((prev) => !prev);
    if (pipelineExpanded) setPipelineExpanded(false);
  };

  const handlePipelineToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPipelineExpanded((prev) => !prev);
    if (expanded) setExpanded(false);
  };

  return (
    <motion.div
      whileHover={!expanded ? { y: -3, boxShadow: '0 28px 60px rgba(20, 32, 48, 0.14)' } : {}}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      onClick={onClick}
      className="surface-card rounded-[20px] p-5 flex flex-col gap-4 cursor-pointer"
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

        <div className="flex items-center gap-1.5">
          {/* Edit Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(autopilot);
            }}
            className="rounded-full p-1.5 text-app-muted transition hover:bg-app-line/60 hover:text-app-ink focus:outline-none"
            title="Edit autopilot rule"
          >
            <Edit2 size={14} />
          </button>

          {/* Delete Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('Are you sure you want to delete this Autopilot rule? This cannot be undone.')) {
                onDelete?.(autopilot.id);
              }
            }}
            className="rounded-full p-1.5 text-app-muted transition hover:bg-app-danger/10 hover:text-app-danger focus:outline-none"
            title="Delete autopilot rule"
          >
            <Trash2 size={14} />
          </button>

          {/* Active toggle (interactive) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle?.(autopilot.id, !isActive);
            }}
            className="shrink-0 text-app-muted transition hover:text-app-ink focus:outline-none"
            title={isActive ? 'Deactivate rule' : 'Activate rule'}
          >
            {isActive ? (
              <ToggleRight size={22} className="text-app-success transition-colors" />
            ) : (
              <ToggleLeft size={22} className="transition-colors" />
            )}
          </button>
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

      {/* Condition summary (collapsed) */}
      {!expanded && (
        <p className="rounded-lg bg-app-line/30 px-3 py-2 font-mono text-xs text-app-muted line-clamp-1">
          {conditionSummary}
        </p>
      )}

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-app-muted">
        <span className="inline-flex items-center gap-1.5">
          <ListChecks size={13} />
          {actions.length} action{actions.length !== 1 ? 's' : ''}
        </span>

        <div className="flex items-center gap-2">
          {/* View Conditions toggle */}
          {conditions.length > 0 && (
            <button
              onClick={handleExpandToggle}
              className="inline-flex items-center gap-1 rounded-full border border-app-line bg-white/60 px-2.5 py-1 text-[11px] font-semibold text-app-muted transition hover:bg-white hover:text-app-ink"
            >
              <GitBranch size={11} />
              {expanded ? 'Hide' : 'Conditions'}
              <motion.span
                animate={{ rotate: expanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="inline-flex"
              >
                <ChevronDown size={12} />
              </motion.span>
            </button>
          )}

          {/* View Pipeline toggle */}
          <button
            onClick={handlePipelineToggle}
            className="inline-flex items-center gap-1 rounded-full border border-app-line bg-white/60 px-2.5 py-1 text-[11px] font-semibold text-app-muted transition hover:bg-white hover:text-app-ink"
          >
            <ListChecks size={11} />
            {pipelineExpanded ? 'Hide' : 'Pipeline'}
            <motion.span
              animate={{ rotate: pipelineExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="inline-flex"
            >
              <ChevronDown size={12} />
            </motion.span>
          </button>
        </div>

        <span>
          {new Date(autopilot.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
      </div>

      {/* Expanded: Condition Builder Canvas (read-only) */}
      <AnimatePresence>
        {expanded && firstCondition && (
          <motion.div
            key="canvas"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 320 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-[320px] w-full mt-2">
              <ConditionBuilderCanvas
                initialCondition={firstCondition.definition as any}
                readOnly
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded: Action Pipeline (read-only) */}
      <AnimatePresence>
        {pipelineExpanded && (
          <motion.div
            key="pipeline"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pt-1">
              <PipelineEditor
                pipeline={actions as any}
                readOnly
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

