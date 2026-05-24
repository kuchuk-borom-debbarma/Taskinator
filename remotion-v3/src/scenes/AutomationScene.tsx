import React from "react";
import { useChapterFrame as useCurrentFrame } from "../ChapterFrameContext";
import { COLORS, FONTS, fadeIn, slideUp, ease, progress, scaleIn, float, pulse } from "../design";

// TCA Rule visualizer
const TCARule: React.FC<{
  trigger: string; triggerDetail?: string;
  condition: string; conditionDetail?: string;
  action: string; actionDetail?: string;
  color: string; frame: number; startFrame: number;
  mode: 'SYNC' | 'ASYNC';
}> = ({ trigger, triggerDetail, condition, conditionDetail, action, actionDetail, color, frame, startFrame, mode }) => {
  const op = fadeIn(frame, startFrame, 25);
  const y = slideUp(frame, startFrame, 28);

  const steps = [
    { label: 'WHEN', value: trigger, detail: triggerDetail, icon: '⚡', pColor: COLORS.orange },
    { label: 'IF', value: condition, detail: conditionDetail, icon: '🔍', pColor: COLORS.cyan },
    { label: 'THEN', value: action, detail: actionDetail, icon: '✅', pColor: COLORS.green },
  ];

  return (
    <div style={{
      opacity: op,
      transform: `translateY(${(1 - y) * 20}px)`,
      background: `${color}08`,
      border: `1.5px solid ${color}30`,
      borderRadius: 16, padding: '16px 18px',
    }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <div style={{
          fontSize: 9, fontWeight: 800, letterSpacing: 1.5,
          color: mode === 'SYNC' ? COLORS.orange : COLORS.green,
          background: mode === 'SYNC' ? `${COLORS.orange}15` : `${COLORS.green}15`,
          border: `1px solid ${mode === 'SYNC' ? COLORS.orange : COLORS.green}30`,
          borderRadius: 999, padding: '3px 10px',
        }}>{mode}</div>
        <div style={{ fontSize: 11, color: COLORS.textDim }}>
          {mode === 'SYNC' ? 'Pre-commit guard — blocks mutation' : 'Post-commit cascade — async background'}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
        {steps.map((step, i) => {
          const sOp = fadeIn(frame, startFrame + 10 + i * 15, 15);
          return (
            <React.Fragment key={i}>
              <div style={{
                opacity: sOp, flex: 1,
                background: `${step.pColor}10`,
                border: `1px solid ${step.pColor}25`,
                borderRadius: 10, padding: '10px 12px',
              }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: step.pColor, letterSpacing: 1.5, marginBottom: 4 }}>
                  {step.icon} {step.label}
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.text, marginBottom: 2 }}>{step.value}</div>
                {step.detail && <div style={{ fontSize: 10, color: COLORS.textDim, lineHeight: 1.4 }}>{step.detail}</div>}
              </div>
              {i < steps.length - 1 && (
                <div style={{ opacity: sOp, display: 'flex', alignItems: 'center', fontSize: 18, color: COLORS.textDim }}>→</div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

// Execution flow visualizer
const ExecutionFlow: React.FC<{ frame: number; startFrame: number; mode: 'sync' | 'async' }> = ({ frame, startFrame, mode }) => {
  const op = fadeIn(frame, startFrame, 20);

  if (mode === 'sync') {
    const steps = [
      { label: 'GraphQL task.update', color: COLORS.graphql },
      { label: 'TaskServiceImpl', color: COLORS.accent },
      { label: 'runSyncAutomationRules()', color: COLORS.orange },
      { label: 'Load active sync rules', color: COLORS.cyan },
      { label: 'Evaluate trigger match', color: COLORS.textMuted },
      { label: 'Build validationTask', color: COLORS.purple },
      { label: 'Evaluate condition', color: COLORS.textMuted },
      { label: 'Run action (may REJECT)', color: COLORS.red },
      { label: 'TaskQueries.updateTask ✓', color: COLORS.green },
    ];

    return (
      <div style={{ opacity: op }}>
        <div style={{ fontSize: 12, color: COLORS.orange, fontWeight: 700, marginBottom: 10 }}>
          ⚡ SYNC path — Pre-commit guard (runs BEFORE DB write)
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {steps.map((step, i) => {
            const sOp = fadeIn(frame, startFrame + 5 + i * 10, 10);
            return (
              <div key={i} style={{ opacity: sOp, display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: step.color, flexShrink: 0 }} />
                <div style={{ fontSize: 11, color: step.color, fontFamily: FONTS.mono }}>{step.label}</div>
                {i < steps.length - 1 && (
                  <div style={{ fontSize: 9, color: COLORS.textDim }}>↓</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const asyncSteps = [
    { label: 'task.update commits → emits task.updated', color: COLORS.green },
    { label: 'OutboxRelay publishes on task-events', color: COLORS.kafka },
    { label: 'TaskAutomationListener.handleTaskUpdated', color: COLORS.accent },
    { label: '├─ runStatusChangedRules (changed task)', color: COLORS.cyan },
    { label: '└─ runDescendantStatusChangedRules', color: COLORS.purple },
    { label: '   ├─ query task_reachability for ancestors', color: COLORS.textDim },
    { label: '   └─ evaluate rules in ancestor context', color: COLORS.textDim },
    { label: 'Action calls taskService.updateTask → new event', color: COLORS.orange },
    { label: 'Self-propagating cascade (no graph traversal)', color: COLORS.green },
  ];

  return (
    <div style={{ opacity: op }}>
      <div style={{ fontSize: 12, color: COLORS.green, fontWeight: 700, marginBottom: 10 }}>
        🔄 ASYNC path — Post-commit cascade (background)
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {asyncSteps.map((step, i) => {
          const sOp = fadeIn(frame, startFrame + 5 + i * 10, 10);
          return (
            <div key={i} style={{ opacity: sOp, display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{
                width: 4, height: 4, borderRadius: '50%',
                background: step.color, flexShrink: 0,
                marginLeft: step.label.startsWith(' ') ? 16 : 0,
              }} />
              <div style={{
                fontSize: 10.5, color: step.color, fontFamily: FONTS.mono,
                marginLeft: step.label.startsWith('   ') ? 12 : step.label.startsWith('└') || step.label.startsWith('├') ? 8 : 0,
              }}>{step.label.trim()}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const AutomationScene: React.FC = () => {
  const frame = useCurrentFrame();
  const overallFade = frame > 1750 ? 1 - progress(frame, 1750, 1800, ease.inOutCubic) : 1;

  const showAsync = frame > 700;
  const showRegistryNote = frame > 1200;
  const showSelfPropagating = frame > 1500;

  return (
    <div style={{
      width: '100%', height: '100%',
      background: `radial-gradient(ellipse at 50% 40%, #100f1d 0%, ${COLORS.bg} 70%)`,
      fontFamily: FONTS.sans, overflow: 'hidden',
      position: 'relative', opacity: overallFade,
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(rgba(168,85,247,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.025) 1px, transparent 1px)`,
        backgroundSize: '55px 55px',
      }} />

      <div style={{ display: 'flex', height: '100%' }}>
        {/* Left */}
        <div style={{ width: '50%', padding: '40px 20px 30px 50px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ opacity: fadeIn(frame, 5, 20) }}>
            <div style={{ fontSize: 12, color: COLORS.purple, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
              Chapter 10 — Automation
            </div>
            <div style={{ fontSize: 34, fontWeight: 900, color: COLORS.text, letterSpacing: -1, lineHeight: 1.1 }}>
              TCA Automation<br />
              <span style={{ color: COLORS.purple }}>Engine</span>
            </div>
            <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 6, lineHeight: 1.6 }}>
              Trigger → Condition → Action. Project-scoped automation rules. No user code execution. No expression trees. Pure server-owned TypeScript callbacks.
            </div>
          </div>

          {/* Example rules */}
          <TCARule
            trigger="STATUS_CHANGED"
            triggerDetail="Task status → DONE"
            condition="HAS_INCOMPLETE_DESCENDANTS"
            conditionDetail="At least 1 subtask not done"
            action="REJECT_TRANSITION"
            actionDetail="Throws ValidationError before commit"
            color={COLORS.red}
            frame={frame} startFrame={40}
            mode="SYNC"
          />

          <TCARule
            trigger="DESCENDANT_STATUS_CHANGED"
            triggerDetail="Any descendant status changed"
            condition="ALL_DESCENDANTS_IN_STATUS"
            conditionDetail="Every descendant = DONE"
            action="SET_STATUS"
            actionDetail="Promotes parent task to DONE"
            color={COLORS.green}
            frame={frame} startFrame={200}
            mode="ASYNC"
          />

          <TCARule
            trigger="TASK_CREATED"
            triggerDetail="New task in project"
            condition="ASSIGNEE_EQUALS"
            conditionDetail="assignee = none (unassigned)"
            action="AUTO_ASSIGN_CREATOR"
            actionDetail="Sets assignee = task creator"
            color={COLORS.cyan}
            frame={frame} startFrame={360}
            mode="ASYNC"
          />

          {/* Data model callout */}
          {frame > 500 && (
            <div style={{
              opacity: fadeIn(frame, 500, 20),
              background: COLORS.bgCard,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 12, padding: '12px 16px',
              fontSize: 12, color: COLORS.textMuted,
            }}>
              <strong style={{ color: COLORS.text }}>Flat schema design:</strong>{" "}
              trigger_type, condition_type, action_type are string enum keys that select server-owned TS callbacks in AutomationRegistry.ts.
              No AST, no interpreter, no eval(). The registry IS the safety boundary.
            </div>
          )}
        </div>

        {/* Right */}
        <div style={{ width: '50%', padding: '40px 50px 30px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Sync execution flow */}
          <div style={{
            opacity: fadeIn(frame, 30, 20),
            background: COLORS.bgCard,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 14, padding: '16px 20px',
          }}>
            <ExecutionFlow frame={frame} startFrame={40} mode="sync" />
          </div>

          {/* Async execution flow */}
          {showAsync && (
            <div style={{
              opacity: fadeIn(frame, 700, 20),
              background: COLORS.bgCard,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 14, padding: '16px 20px',
            }}>
              <ExecutionFlow frame={frame} startFrame={710} mode="async" />
            </div>
          )}

          {/* Self-propagating cascade */}
          {showSelfPropagating && (
            <div style={{
              opacity: fadeIn(frame, 1500, 20),
              background: `${COLORS.purple}10`,
              border: `1px solid ${COLORS.purple}25`,
              borderRadius: 12, padding: '14px 18px',
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.purple, marginBottom: 8 }}>
                🔄 Self-Propagating Cascades
              </div>
              <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.7 }}>
                Async actions call <code style={{ color: COLORS.cyan }}>taskService.updateTask()</code>.
                This emits new <code style={{ color: COLORS.kafka }}>task.updated</code> events.
                Each cascade naturally triggers the next through normal event flow.
                <br /><br />
                <strong style={{ color: COLORS.text }}>No custom graph traversal needed.</strong> The event bus IS the traversal engine.
                A → B → C automations just work by emitting events at each step.
              </div>
            </div>
          )}

          {/* Registry callout */}
          {showRegistryNote && (
            <div style={{
              opacity: fadeIn(frame, 1200, 20),
              background: `${COLORS.orange}10`,
              border: `1px solid ${COLORS.orange}25`,
              borderRadius: 12, padding: '14px 18px',
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.orange, marginBottom: 8 }}>
                🗂️ TRIGGER_COMPATIBILITY Registry (single source of truth)
              </div>
              <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.6 }}>
                The resolver defines which conditions and actions are valid for each trigger.
                Frontend wizard reads this — <strong style={{ color: COLORS.text }}>zero hardcoding</strong> in the UI.
                Adding a new trigger = add one entry to the registry. UI automatically adapts.
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['STATUS_CHANGED', 'DESCENDANT_STATUS_CHANGED', 'PRIORITY_CHANGED', 'ASSIGNEE_CHANGED', 'TASK_CREATED', 'LINKED_INCOMING_STATUS_CHANGED'].map((t, i) => {
                  const tOp = fadeIn(frame, 1210 + i * 8, 10);
                  return (
                    <div key={i} style={{
                      opacity: tOp,
                      fontSize: 9, color: COLORS.orange, fontFamily: FONTS.mono,
                      background: `${COLORS.orange}10`, border: `1px solid ${COLORS.orange}20`,
                      borderRadius: 4, padding: '2px 8px',
                    }}>{t}</div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Subtitle */}
      <div style={{
        position: 'absolute', bottom: 20, left: '50%',
        transform: 'translateX(-50%)',
        opacity: fadeIn(frame, 10, 20),
      }}>
        <div style={{
          background: 'rgba(0,0,0,0.6)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 999, padding: '8px 24px',
          fontSize: 15, color: COLORS.text,
          backdropFilter: 'blur(12px)',
        }}>
          TCA: Trigger→Condition→Action. Sync guards block commits. Async cascades self-propagate through events. No user code. No eval().
        </div>
      </div>
    </div>
  );
};
