import React from "react";
import { useChapterFrame as useCurrentFrame } from "../ChapterFrameContext";
import { COLORS, FONTS, fadeIn, slideUp, ease, progress, scaleIn, float } from "../design";

const PATTERNS = [
  {
    number: 1,
    title: 'Single-Trip Authorization (CTE)',
    icon: '🔐',
    color: COLORS.accent,
    old: '2 DB round-trips: SELECT permission check\n+ INSERT/UPDATE if allowed',
    new: 'WITH auth_check AS (\n  SELECT 1 FROM project_members\n  WHERE project_id = $1 AND user_id = $actor\n)\nINSERT INTO ... WHERE EXISTS (SELECT 1 FROM auth_check)',
    benefit: 'Permission evaluated once, shared atomically across mutation. No TOCTOU race.',
    startFrame: 30,
  },
  {
    number: 2,
    title: 'Bulk Insert via unnest()',
    icon: '⚡',
    color: COLORS.green,
    old: 'Loop: 100 × INSERT statements\n= 100 network round-trips',
    new: 'INSERT INTO project_members\nSELECT unnest($ids::uuid[]) AS user_id,\n       $projectId AS project_id\nON CONFLICT DO NOTHING',
    benefit: 'PostgreSQL processes entire array in 1 execution plan. N→1 cost. The ONLY way to handle bulk ops at 10k RPS.',
    startFrame: 350,
  },
  {
    number: 3,
    title: 'RETURNING for State Recovery',
    icon: '↩️',
    color: COLORS.cyan,
    old: 'INSERT/UPDATE + follow-up SELECT\nto get new version/lastEventId',
    new: 'UPDATE project_task\n  SET version = version + 1, ...\nWHERE id = $1 AND version = $2\nRETURNING id, version, last_event_id',
    benefit: 'Single round-trip. Absolute source of truth immediately. No phantom read risk.',
    startFrame: 700,
  },
  {
    number: 4,
    title: 'Materialized Path (Subtree)',
    icon: '🌳',
    color: COLORS.orange,
    old: 'Recursive CTEs or app-level traversal\nO(n) queries for subtree depth n',
    new: "SELECT * FROM project_task\nWHERE materialized_path\n  LIKE '<parent-uuid>/%'\n-- Uses btree text_pattern_ops index",
    benefit: 'Single index scan for entire subtree. O(log n) vs O(n²) join approach.',
    startFrame: 1050,
  },
];

// Pattern card with old/new comparison
const PatternCard: React.FC<{
  pattern: typeof PATTERNS[0];
  frame: number;
  isActive: boolean;
}> = ({ pattern, frame, isActive }) => {
  const op = fadeIn(frame, pattern.startFrame, 25);
  const y = slideUp(frame, pattern.startFrame, 28);
  const isVisible = frame >= pattern.startFrame;

  if (!isVisible) return null;

  return (
    <div style={{
      opacity: op,
      transform: `translateY(${(1 - y) * 25}px)`,
      background: isActive
        ? `linear-gradient(135deg, ${pattern.color}15, ${pattern.color}05)`
        : COLORS.bgCard,
      border: `1.5px solid ${isActive ? pattern.color + '50' : COLORS.border}`,
      borderRadius: 16,
      padding: '18px 20px',
      boxShadow: isActive ? `0 0 20px ${pattern.color}15` : 'none',
    }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>
        <div style={{
          width: 36, height: 36,
          background: `${pattern.color}20`,
          border: `1.5px solid ${pattern.color}40`,
          borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
        }}>{pattern.icon}</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: isActive ? pattern.color : COLORS.text }}>
            {pattern.number}. {pattern.title}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        {/* Old way */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: COLORS.red, fontWeight: 700, marginBottom: 6, letterSpacing: 0.5 }}>❌ OLD WAY</div>
          <div style={{
            background: `${COLORS.red}08`,
            border: `1px solid ${COLORS.red}20`,
            borderRadius: 8, padding: '8px 12px',
            fontFamily: FONTS.mono, fontSize: 10,
            color: COLORS.textDim, lineHeight: 1.7,
            whiteSpace: 'pre',
          }}>{pattern.old}</div>
        </div>

        {/* New way */}
        <div style={{ flex: 1.3 }}>
          <div style={{ fontSize: 10, color: COLORS.green, fontWeight: 700, marginBottom: 6, letterSpacing: 0.5 }}>✅ OUR WAY</div>
          <div style={{
            background: '#0a0f1e',
            border: `1px solid ${pattern.color}25`,
            borderRadius: 8, padding: '8px 12px',
            fontFamily: FONTS.mono, fontSize: 10,
            color: COLORS.text, lineHeight: 1.7,
            whiteSpace: 'pre',
          }}>
            {pattern.new.split('\n').map((line, i) => (
              <div key={i}>
                {line.split(/(WITH|INSERT|SELECT|UPDATE|WHERE|INTO|SET|RETURNING|FROM|EXISTS|LIKE|ON|CONFLICT|AND|unnest)/g).map((part, j) => {
                  if (/^(WITH|INSERT|SELECT|UPDATE|WHERE|INTO|SET|RETURNING|FROM|EXISTS|LIKE|ON|CONFLICT|AND|unnest)$/.test(part)) {
                    return <span key={j} style={{ color: pattern.color }}>{part}</span>;
                  }
                  return <span key={j}>{part}</span>;
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{
        marginTop: 10, fontSize: 11.5, color: COLORS.textMuted,
        lineHeight: 1.6, borderTop: `1px solid ${COLORS.border}`,
        paddingTop: 8,
      }}>
        💡 <strong style={{ color: pattern.color }}>Why:</strong> {pattern.benefit}
      </div>
    </div>
  );
};

// Round-trip counter
const RoundTripCounter: React.FC<{ frame: number }> = ({ frame }) => {
  const before = 4;
  const after = 1;
  const t = progress(frame, 1200, 1350, ease.outCubic);
  const displayed = Math.round(before - (before - after) * t);

  return (
    <div style={{
      opacity: fadeIn(frame, 1200, 20),
      background: `${COLORS.green}12`,
      border: `1px solid ${COLORS.green}30`,
      borderRadius: 16, padding: '20px 28px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 8 }}>Average DB round-trips per request</div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, fontWeight: 900, color: COLORS.red, textDecoration: 'line-through', opacity: 0.7 }}>~4</div>
          <div style={{ fontSize: 11, color: COLORS.textDim }}>before</div>
        </div>
        <div style={{ fontSize: 36, color: COLORS.textDim }}>→</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 56, fontWeight: 900, color: COLORS.green }}>{displayed}</div>
          <div style={{ fontSize: 11, color: COLORS.textDim }}>after CTEs + RETURNING</div>
        </div>
      </div>
      <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 8 }}>
        Moving logic into the database via CTEs and atomic statements is the foundation of our high-performance architecture.
      </div>
    </div>
  );
};

export const SQLPatternsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const overallFade = frame > 1450 ? 1 - progress(frame, 1450, 1500, ease.inOutCubic) : 1;
  const activePattern = PATTERNS.findIndex((p, i) =>
    frame >= p.startFrame && (i === PATTERNS.length - 1 || frame < PATTERNS[i + 1].startFrame)
  );

  return (
    <div style={{
      width: '100%', height: '100%',
      background: `radial-gradient(ellipse at 40% 70%, #0b1018 0%, ${COLORS.bg} 70%)`,
      fontFamily: FONTS.sans, overflow: 'hidden',
      position: 'relative', opacity: overallFade,
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(rgba(6,182,212,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.025) 1px, transparent 1px)`,
        backgroundSize: '55px 55px',
      }} />

      <div style={{ padding: '45px 60px 40px', height: '100%', display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'hidden' }}>
        {/* Header */}
        <div style={{ opacity: fadeIn(frame, 5, 20), flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: 12, color: COLORS.cyan, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
                Chapter 8 — SQL Performance
              </div>
              <div style={{ fontSize: 40, fontWeight: 900, color: COLORS.text, letterSpacing: -1.5, lineHeight: 1 }}>
                High-Performance<br />
                <span style={{ color: COLORS.cyan }}>SQL Patterns</span>
              </div>
            </div>
            <div style={{
              marginBottom: 4, fontSize: 14, color: COLORS.textMuted, lineHeight: 1.6, maxWidth: 380,
            }}>
              Six SQL patterns we standardized across all services. Not just "queries that work" —
              queries engineered for minimum latency under extreme load.
            </div>
          </div>
        </div>

        {/* Patterns grid */}
        <div style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          overflowY: 'hidden',
        }}>
          {PATTERNS.map((pattern, i) => (
            <PatternCard
              key={i}
              pattern={pattern}
              frame={frame}
              isActive={i === activePattern}
            />
          ))}
        </div>

        {/* Round-trip counter */}
        {frame > 1200 && <RoundTripCounter frame={frame} />}
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
          CTEs + unnest + RETURNING — moving auth and batching logic into SQL reduces average round-trips from ~4 to 1.
        </div>
      </div>
    </div>
  );
};
