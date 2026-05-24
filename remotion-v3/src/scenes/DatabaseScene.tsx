import React from "react";
import { useChapterFrame as useCurrentFrame } from "../ChapterFrameContext";
import { COLORS, FONTS, fadeIn, slideUp, ease, progress, float, pulse } from "../design";

// Animated SQL code block with syntax highlighting
const SqlBlock: React.FC<{
  code: string; frame: number; startFrame: number; title?: string;
}> = ({ code, frame, startFrame, title }) => {
  const op = fadeIn(frame, startFrame, 20);
  const y = slideUp(frame, startFrame, 25);
  const charsVisible = Math.floor(Math.max(0, frame - startFrame) * 2);
  const visibleCode = code.slice(0, charsVisible);

  const highlight = (line: string): React.ReactNode[] => {
    const keywords = /\b(CREATE|TABLE|PRIMARY|KEY|REFERENCES|NOT|NULL|DEFAULT|UNIQUE|INDEX|ON|WITH|SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|AND|OR|LIKE|JOIN|AS|RETURNING|SET|VALUES|CONSTRAINT|CHECK|CASCADE)\b/g;
    const types = /\b(UUID|TEXT|INTEGER|BOOLEAN|TIMESTAMPTZ|BIGINT|JSONB)\b/g;
    const strings = /'[^']*'/g;
    const comments = /--.*$/;

    const parts: React.ReactNode[] = [];
    let remaining = line;
    let key = 0;

    // Simple tokenizer
    const tokens = line.split(/(\s+|[(),;])/);
    for (const token of tokens) {
      if (keywords.test(token)) {
        parts.push(<span key={key++} style={{ color: COLORS.accent }}>{token}</span>);
      } else if (types.test(token)) {
        parts.push(<span key={key++} style={{ color: COLORS.orange }}>{token}</span>);
      } else if (token.startsWith("'")) {
        parts.push(<span key={key++} style={{ color: COLORS.green }}>{token}</span>);
      } else if (token.startsWith('--')) {
        parts.push(<span key={key++} style={{ color: COLORS.textDim, fontStyle: 'italic' }}>{token}</span>);
      } else {
        parts.push(<span key={key++} style={{ color: COLORS.text }}>{token}</span>);
      }
    }
    return parts;
  };

  return (
    <div style={{
      opacity: op,
      transform: `translateY(${(1 - y) * 20}px)`,
      background: '#0a0f1e',
      border: `1px solid ${COLORS.border}`,
      borderRadius: 14, overflow: 'hidden',
    }}>
      {title && (
        <div style={{
          padding: '10px 16px',
          borderBottom: `1px solid ${COLORS.border}`,
          background: COLORS.bgCard,
          fontSize: 12, color: COLORS.textMuted, fontWeight: 600,
          display: 'flex', gap: 8, alignItems: 'center',
        }}>
          <span style={{ color: COLORS.postgres }}>🐘</span> {title}
        </div>
      )}
      <div style={{
        fontFamily: FONTS.mono, fontSize: 12.5,
        padding: '16px 20px',
        lineHeight: 1.7, overflowX: 'auto',
        whiteSpace: 'pre',
        color: COLORS.text,
      }}>
        {visibleCode.split('\n').map((line, i) => (
          <div key={i}>{highlight(line)}</div>
        ))}
        <span style={{
          display: 'inline-block',
          width: 2, height: '1em',
          background: COLORS.accent,
          animation: 'blink 1s step-end infinite',
          verticalAlign: 'text-bottom',
          marginLeft: 1,
        }} />
      </div>
    </div>
  );
};

// Animated tree node for materialized path
const TreeNode: React.FC<{
  label: string; path: string; level: number; frame: number; startFrame: number;
  color: string; isHighlighted?: boolean;
}> = ({ label, path, level, frame, startFrame, color, isHighlighted }) => {
  const op = fadeIn(frame, startFrame, 15);
  const x = slideUp(frame, startFrame, 20);
  const p = pulse(frame + startFrame);

  return (
    <div style={{
      opacity: op,
      transform: `translateX(${(1 - x) * -20}px)`,
      display: 'flex', alignItems: 'center', gap: 8,
      marginLeft: level * 28,
      marginBottom: 6,
    }}>
      {level > 0 && (
        <div style={{
          position: 'absolute',
          left: level * 28 - 16,
          width: 16, height: 1,
          background: COLORS.borderBright, marginTop: 0,
        }} />
      )}
      <div style={{
        background: isHighlighted ? `${color}20` : `${COLORS.bgCard}`,
        border: `1px solid ${isHighlighted ? color + '60' : COLORS.border}`,
        borderRadius: 8,
        padding: '6px 14px',
        display: 'flex', gap: 12, alignItems: 'center',
        boxShadow: isHighlighted ? `0 0 16px ${color}30` : 'none',
      }}>
        <span style={{ color: isHighlighted ? color : COLORS.text, fontWeight: 600, fontSize: 14 }}>{label}</span>
        <code style={{
          fontFamily: FONTS.mono, fontSize: 11,
          color: COLORS.textDim,
          background: 'rgba(0,0,0,0.3)',
          padding: '2px 8px', borderRadius: 4,
        }}>{path}</code>
      </div>
    </div>
  );
};

const SCHEMA_SQL = `CREATE TABLE project_task (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fk_project_id UUID NOT NULL REFERENCES projects(id),
  fk_parent_id  UUID REFERENCES project_task(id),
  title         TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'TODO',
  priority      INTEGER NOT NULL DEFAULT 0,
  -- Materialized path for O(1) subtree queries
  materialized_path TEXT NOT NULL DEFAULT '',
  -- Optimistic locking
  version       INTEGER NOT NULL DEFAULT 1,
  last_event_id UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast subtree index
CREATE INDEX idx_task_path ON project_task
  USING btree (materialized_path text_pattern_ops);`;

const UPDATE_SQL = `-- Moving a task subtree (atomic!)
WITH task_info AS (
  SELECT materialized_path, id FROM project_task
  WHERE id = $newParentId
)
UPDATE project_task
SET materialized_path =
  (SELECT materialized_path FROM task_info) ||
  (SELECT id FROM task_info) || '/'
  || substring(materialized_path FROM
       length(old_parent_path) + 1)
WHERE materialized_path LIKE old_parent_path || '%'`;

export const DatabaseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const overallFade = frame > 1450 ? 1 - progress(frame, 1450, 1500, ease.inOutCubic) : 1;

  const treeNodes = [
    { label: 'Epic: Auth System', path: '', level: 0, startFrame: 200, color: COLORS.accent, isH: false },
    { label: 'Design OAuth flow', path: '<uuid-auth>/', level: 1, startFrame: 220, color: COLORS.cyan, isH: false },
    { label: 'Implement JWT', path: '<uuid-auth>/', level: 1, startFrame: 235, color: COLORS.cyan, isH: false },
    { label: 'Write tests', path: '<uuid-auth>/<uuid-jwt>/', level: 2, startFrame: 250, color: COLORS.green, isH: true },
    { label: 'Code review', path: '<uuid-auth>/<uuid-jwt>/', level: 2, startFrame: 265, color: COLORS.green, isH: false },
    { label: 'Refresh token logic', path: '<uuid-auth>/', level: 1, startFrame: 280, color: COLORS.cyan, isH: false },
  ];

  const showSQL2 = frame > 700;

  return (
    <div style={{
      width: '100%', height: '100%',
      background: `radial-gradient(ellipse at 40% 60%, #0d1525 0%, ${COLORS.bg} 70%)`,
      fontFamily: FONTS.sans, overflow: 'hidden',
      position: 'relative', opacity: overallFade,
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(rgba(51,103,145,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(51,103,145,0.04) 1px, transparent 1px)`,
        backgroundSize: '50px 50px',
      }} />

      <div style={{ display: 'flex', height: '100%' }}>
        {/* Left panel */}
        <div style={{ width: '50%', padding: '45px 25px 40px 55px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Header */}
          <div style={{ opacity: fadeIn(frame, 5, 20) }}>
            <div style={{ fontSize: 12, color: COLORS.postgres, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
              Chapter 3 — Database Schema
            </div>
            <div style={{ fontSize: 38, fontWeight: 900, color: COLORS.text, letterSpacing: -1, lineHeight: 1.1 }}>
              Hierarchical Tasks &<br />
              <span style={{ color: COLORS.postgres }}>Materialized Paths</span>
            </div>
          </div>

          {/* Problem statement */}
          <div style={{ opacity: fadeIn(frame, 25, 20) }}>
            <div style={{
              background: `${COLORS.red}10`,
              border: `1px solid ${COLORS.red}25`,
              borderRadius: 12, padding: '14px 18px',
              fontSize: 13, color: COLORS.textMuted, lineHeight: 1.6,
            }}>
              <strong style={{ color: COLORS.red }}>Problem:</strong> Tasks are hierarchical — epics contain stories, stories contain subtasks.
              Querying entire subtrees with parent-child joins is O(n²). We need O(1) subtree reads.
            </div>
          </div>

          {/* Tree visualization */}
          <div style={{ opacity: fadeIn(frame, 150, 20) }}>
            <div style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 12, fontWeight: 600 }}>
              📂 Task Tree with Materialized Paths
            </div>
            <div style={{ position: 'relative' }}>
              {treeNodes.map((node, i) => (
                <TreeNode
                  key={i}
                  label={node.label}
                  path={node.path}
                  level={node.level}
                  frame={frame}
                  startFrame={node.startFrame}
                  color={node.color}
                  isHighlighted={node.isH}
                />
              ))}
            </div>
          </div>

          {/* Get subtree query */}
          {frame > 320 && (
            <div style={{
              opacity: fadeIn(frame, 320, 20),
              background: '#0a0f1e',
              border: `1px solid ${COLORS.green}30`,
              borderRadius: 12, padding: '14px 18px',
            }}>
              <div style={{ fontSize: 12, color: COLORS.green, fontWeight: 600, marginBottom: 8 }}>
                ⚡ Get entire subtree — O(1) with index
              </div>
              <code style={{ fontFamily: FONTS.mono, fontSize: 12, color: COLORS.text, lineHeight: 1.7 }}>
                <span style={{ color: COLORS.accent }}>SELECT</span> * <span style={{ color: COLORS.accent }}>FROM</span> project_task<br />
                <span style={{ color: COLORS.accent }}>WHERE</span> materialized_path{' '}
                <span style={{ color: COLORS.cyan }}>LIKE</span>{' '}
                <span style={{ color: COLORS.green }}>'&lt;uuid-auth&gt;/%'</span>;
              </code>
            </div>
          )}

          {/* Design decisions */}
          {frame > 400 && (
            <div style={{ opacity: fadeIn(frame, 400, 20), display: 'flex', gap: 12 }}>
              {[
                { label: 'Hard Deletes', icon: '🗑️', reason: 'Soft deletes add query complexity without clear value yet', color: COLORS.textDim },
                { label: 'Optimistic Lock', icon: '🔒', reason: 'version column on every entity — projects are read-heavy', color: COLORS.orange },
                { label: 'Normalized', icon: '📐', reason: 'No denormalization until query patterns prove it necessary', color: COLORS.cyan },
              ].map((d, i) => {
                const dOp = fadeIn(frame, 410 + i * 15, 15);
                return (
                  <div key={i} style={{
                    opacity: dOp,
                    flex: 1,
                    background: COLORS.bgCard,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 10, padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 20, marginBottom: 6 }}>{d.icon}</div>
                    <div style={{ fontSize: 12, color: COLORS.text, fontWeight: 700, marginBottom: 4 }}>{d.label}</div>
                    <div style={{ fontSize: 10, color: COLORS.textDim, lineHeight: 1.4 }}>{d.reason}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right panel — SQL */}
        <div style={{ width: '50%', padding: '45px 55px 40px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SqlBlock
            code={SCHEMA_SQL}
            frame={frame}
            startFrame={30}
            title="project_task table schema"
          />

          {showSQL2 && (
            <SqlBlock
              code={UPDATE_SQL}
              frame={frame}
              startFrame={700}
              title="Atomic subtree path update (moving tasks)"
            />
          )}

          {/* Tradeoff callout */}
          {frame > 900 && (
            <div style={{
              opacity: fadeIn(frame, 900, 20),
              background: `linear-gradient(135deg, ${COLORS.accent}12, ${COLORS.purple}06)`,
              border: `1px solid ${COLORS.accent}25`,
              borderRadius: 12, padding: '16px 20px',
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 8 }}>⚖️ Tradeoff Analysis</div>
              <div style={{ display: 'flex', gap: 20 }}>
                <div>
                  <div style={{ fontSize: 11, color: COLORS.green, fontWeight: 600, marginBottom: 4 }}>✅ Read Fast</div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted }}>Subtree queries = single LIKE index scan</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: COLORS.orange, fontWeight: 600, marginBottom: 4 }}>⚠️ Write Complex</div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted }}>Moving tasks requires atomic path recalculation</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: COLORS.cyan, fontWeight: 600, marginBottom: 4 }}>✅ Correct Choice</div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted }}>Task reads {'>>'}  task moves in prod traffic</div>
                </div>
              </div>
            </div>
          )}

          {/* Reachability closure table mention */}
          {frame > 1100 && (
            <div style={{
              opacity: fadeIn(frame, 1100, 20),
              background: COLORS.bgCard,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 12, padding: '14px 20px',
            }}>
              <div style={{ fontSize: 12, color: COLORS.purple, fontWeight: 700, marginBottom: 8 }}>
                🕸️ task_reachability closure table (bonus)
              </div>
              <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.6 }}>
                Pre-computed ancestor↔descendant closure table for the TCA Automation Engine.
                Enables O(1) "does task A have unfinished descendants?" without traversal.
                Updated via trigger on insert/update.
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
          Materialized paths give us O(1) subtree reads. The tradeoff: subtree moves need atomic SQL WITH blocks. Read {'>>'}  Write — correct choice.
        </div>
      </div>
    </div>
  );
};
