import React from "react";
import { useChapterFrame as useCurrentFrame } from "../ChapterFrameContext";
import { COLORS, FONTS, fadeIn, slideUp, ease, progress, scaleIn, pulse, float } from "../design";

// Animated "conflict" collision visualization
const ConflictViz: React.FC<{ frame: number; startFrame: number }> = ({ frame, startFrame }) => {
  const t1 = progress(frame, startFrame, startFrame + 40, ease.outCubic);
  const t2 = progress(frame, startFrame + 20, startFrame + 60, ease.outCubic);
  const conflict = frame > startFrame + 45;
  const resolve = frame > startFrame + 80;

  const req1X = -5 + t1 * 35;
  const req2X = 105 - t2 * 35;

  return (
    <div style={{
      position: 'relative', height: 120,
      background: COLORS.bgCard,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 14, overflow: 'hidden',
      padding: '0 20px',
    }}>
      {/* DB in center */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        transform: 'translate(-50%, -50%)',
        width: 70, height: 50,
        background: `${COLORS.postgres}20`,
        border: `2px solid ${COLORS.postgres}50`,
        borderRadius: 8,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 2,
        zIndex: 2,
      }}>
        <div style={{ fontSize: 14 }}>🐘</div>
        <div style={{ fontSize: 9, color: COLORS.postgres, fontFamily: FONTS.mono }}>version=5</div>
      </div>

      {/* Request 1 */}
      <div style={{
        position: 'absolute',
        left: req1X + '%', top: '50%',
        transform: 'translate(-50%, -50%)',
        opacity: t1,
        background: `${COLORS.cyan}20`,
        border: `1px solid ${COLORS.cyan}50`,
        borderRadius: 8, padding: '6px 12px',
        fontSize: 10, color: COLORS.cyan, fontFamily: FONTS.mono,
        whiteSpace: 'nowrap',
        zIndex: conflict && !resolve ? 3 : 1,
      }}>SET title WHERE version=5</div>

      {/* Request 2 */}
      <div style={{
        position: 'absolute',
        left: req2X + '%', top: '50%',
        transform: 'translate(-50%, -50%)',
        opacity: t2,
        background: `${COLORS.orange}20`,
        border: `1px solid ${COLORS.orange}50`,
        borderRadius: 8, padding: '6px 12px',
        fontSize: 10, color: COLORS.orange, fontFamily: FONTS.mono,
        whiteSpace: 'nowrap',
      }}>SET status WHERE version=5</div>

      {/* Conflict indicator */}
      {conflict && !resolve && (
        <div style={{
          position: 'absolute', right: 20, top: 8,
          fontSize: 10, color: COLORS.red,
          background: `${COLORS.red}15`, border: `1px solid ${COLORS.red}30`,
          borderRadius: 6, padding: '3px 10px', fontWeight: 700,
        }}>⚡ Conflict detected — one will lose</div>
      )}

      {resolve && (
        <div style={{
          position: 'absolute', right: 20, top: 8,
          fontSize: 10, color: COLORS.green,
          background: `${COLORS.green}15`, border: `1px solid ${COLORS.green}30`,
          borderRadius: 6, padding: '3px 10px', fontWeight: 700,
        }}>✅ Winner committed → version=6. Loser retries.</div>
      )}
    </div>
  );
};

// Compare-and-swap SQL visualization
const CasSqlViz: React.FC<{ frame: number; startFrame: number }> = ({ frame, startFrame }) => {
  const op = fadeIn(frame, startFrame, 20);

  const SQL = `UPDATE project_task
  SET title      = 'New Title',
      status     = 'IN_PROGRESS',
      version    = version + 1,        -- increment
      updated_at = now()
  WHERE id      = 'task-uuid-123'
    AND version = 5;                   -- client's version

-- Returns 1 row → success, version is now 6
-- Returns 0 rows → conflict! Someone else committed first
-- Client must re-fetch and retry with version=6`;

  return (
    <div style={{
      opacity: op,
      background: '#0a0f1e',
      border: `1px solid ${COLORS.orange}30`,
      borderRadius: 14, overflow: 'hidden',
    }}>
      <div style={{
        padding: '10px 16px',
        background: COLORS.bgCard,
        borderBottom: `1px solid ${COLORS.border}`,
        fontSize: 12, color: COLORS.textMuted, fontWeight: 600,
        display: 'flex', gap: 8, alignItems: 'center',
      }}>
        <span>⚙️</span> Compare-and-Swap Query
      </div>
      <div style={{ fontFamily: FONTS.mono, fontSize: 12, padding: '14px 18px', lineHeight: 1.8, color: COLORS.text, whiteSpace: 'pre' }}>
        {SQL.split('\n').map((line, i) => {
          const lineOp = fadeIn(frame, startFrame + 5 + i * 12, 10);
          return (
            <div key={i} style={{ opacity: lineOp }}>
              {line.split(/(UPDATE|SET|WHERE|AND|RETURNING|--.*$)/g).map((part, j) => {
                if (/^(UPDATE|SET|WHERE|AND|RETURNING)$/.test(part)) return <span key={j} style={{ color: COLORS.accent }}>{part}</span>;
                if (part.startsWith('--')) return <span key={j} style={{ color: COLORS.green, fontStyle: 'italic' }}>{part}</span>;
                if (/version/.test(part)) return <span key={j} style={{ color: COLORS.orange }}>{part}</span>;
                return <span key={j}>{part}</span>;
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Kafka integration card
const KafkaVersionCard: React.FC<{ frame: number; startFrame: number }> = ({ frame, startFrame }) => {
  const op = fadeIn(frame, startFrame, 20);
  const y = slideUp(frame, startFrame, 22);

  return (
    <div style={{
      opacity: op,
      transform: `translateY(${(1 - y) * 20}px)`,
      background: `${COLORS.kafka}10`,
      border: `1px solid ${COLORS.kafka}25`,
      borderRadius: 14, padding: '18px 20px',
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.kafka, marginBottom: 12 }}>
        ⚡ Kafka + Optimistic Locking = Async Safety
      </div>
      <div style={{ display: 'flex', gap: 0 }}>
        {[
          { step: '1. DB commit', color: COLORS.accent, detail: 'Write succeeds with version=6' },
          { step: '→', color: COLORS.textDim, detail: '' },
          { step: '2. Kafka event', color: COLORS.kafka, detail: 'Emits {version:6, taskId}' },
          { step: '→', color: COLORS.textDim, detail: '' },
          { step: '3. Consumer', color: COLORS.green, detail: 'WHERE version=6 — rejects stale' },
        ].map((step, i) => {
          const sOp = fadeIn(frame, startFrame + 10 + i * 12, 12);
          if (step.step === '→') return (
            <div key={i} style={{ opacity: sOp, color: COLORS.textDim, fontSize: 20, display: 'flex', alignItems: 'center', padding: '0 8px' }}>→</div>
          );
          return (
            <div key={i} style={{
              opacity: sOp, flex: 1,
              background: `${step.color}10`,
              border: `1px solid ${step.color}20`,
              borderRadius: 8, padding: '10px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: step.color, marginBottom: 4 }}>{step.step}</div>
              <div style={{ fontSize: 10, color: COLORS.textDim }}>{step.detail}</div>
            </div>
          );
        })}
      </div>
      <div style={{
        marginTop: 10, fontSize: 12, color: COLORS.textMuted,
        borderTop: `1px solid ${COLORS.border}`, paddingTop: 10,
      }}>
        Version travels with every Kafka event → out-of-order events fail the WHERE clause at DB level. No application-level checking needed.
      </div>
    </div>
  );
};

export const OptimisticLockingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const overallFade = frame > 1450 ? 1 - progress(frame, 1450, 1500, ease.inOutCubic) : 1;

  return (
    <div style={{
      width: '100%', height: '100%',
      background: `radial-gradient(ellipse at 60% 30%, #110e08 0%, ${COLORS.bg} 70%)`,
      fontFamily: FONTS.sans, overflow: 'hidden',
      position: 'relative', opacity: overallFade,
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(rgba(245,158,11,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,0.025) 1px, transparent 1px)`,
        backgroundSize: '55px 55px',
      }} />

      <div style={{ display: 'flex', height: '100%' }}>
        {/* Left */}
        <div style={{ width: '48%', padding: '45px 20px 40px 55px', display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ opacity: fadeIn(frame, 5, 20) }}>
            <div style={{ fontSize: 12, color: COLORS.orange, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
              Chapter 7 — Concurrency
            </div>
            <div style={{ fontSize: 36, fontWeight: 900, color: COLORS.text, letterSpacing: -1, lineHeight: 1.1 }}>
              Optimistic Locking<br />
              <span style={{ color: COLORS.orange }}>vs Pessimistic</span>
            </div>
            <div style={{ fontSize: 14, color: COLORS.textMuted, marginTop: 8, lineHeight: 1.6 }}>
              At 10k RPS, concurrent updates are inevitable.
              We prevent "Lost Updates" without paying the cost of pessimistic locks.
            </div>
          </div>

          {/* Problem */}
          <div style={{ opacity: fadeIn(frame, 30, 20) }}>
            <div style={{
              background: `${COLORS.red}10`, border: `1px solid ${COLORS.red}25`,
              borderRadius: 12, padding: '14px 18px',
              fontSize: 13, color: COLORS.textMuted, lineHeight: 1.6,
            }}>
              <strong style={{ color: COLORS.red }}>The "Lost Update" problem:</strong>{" "}
              User A reads task (version=5). User B reads task (version=5).
              User A writes → version=6. User B writes version=5 → OVERWRITES User A's change silently. 💀
            </div>
          </div>

          {/* The collision viz */}
          <div style={{ opacity: fadeIn(frame, 80, 20) }}>
            <div style={{ fontSize: 13, color: COLORS.textMuted, fontWeight: 600, marginBottom: 10 }}>
              🔀 Two concurrent updates hitting the same row
            </div>
            <ConflictViz frame={frame} startFrame={90} />
          </div>

          {/* Why not pessimistic? */}
          {frame > 400 && (
            <div style={{
              opacity: fadeIn(frame, 400, 20),
              display: 'flex', gap: 14, alignItems: 'stretch',
            }}>
              {[
                {
                  label: 'Pessimistic (SELECT FOR UPDATE)',
                  color: COLORS.red, icon: '🔐',
                  items: ['Holds DB lock until transaction commits', 'Blocks all readers + writers', 'Deadlock risk at scale', '~10x performance penalty'],
                },
                {
                  label: 'Optimistic (version column)',
                  color: COLORS.green, icon: '⚡',
                  items: ['No locks held during read', 'Only fails if conflict actually occurs', 'Conflict rate ≈ 0 in normal ops', 'No deadlocks possible'],
                },
              ].map((card, i) => {
                const cOp = fadeIn(frame, 410 + i * 20, 15);
                return (
                  <div key={i} style={{
                    opacity: cOp, flex: 1,
                    background: `${card.color}08`,
                    border: `1px solid ${card.color}25`,
                    borderRadius: 12, padding: '14px 16px',
                  }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: 18 }}>{card.icon}</span>
                      <div style={{ fontSize: 12, fontWeight: 700, color: card.color }}>{card.label}</div>
                    </div>
                    {card.items.map((item, j) => (
                      <div key={j} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 5 }}>
                        <span style={{ color: card.color, fontSize: 12 }}>{i === 0 ? '✗' : '✓'}</span>
                        <span style={{ fontSize: 11, color: COLORS.textMuted }}>{item}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right */}
        <div style={{ width: '52%', padding: '45px 55px 40px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <CasSqlViz frame={frame} startFrame={30} />

          {/* Version column explanation */}
          {frame > 400 && (
            <div style={{
              opacity: fadeIn(frame, 400, 20),
              background: COLORS.bgCard,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 14, padding: '18px 20px',
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, marginBottom: 12 }}>
                📊 The version column lifecycle
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {[
                  { label: 'Create', version: 1, color: COLORS.green },
                  { label: '→', version: null, color: COLORS.textDim },
                  { label: 'Update', version: 2, color: COLORS.cyan },
                  { label: '→', version: null, color: COLORS.textDim },
                  { label: 'Update', version: 3, color: COLORS.cyan },
                  { label: '→', version: null, color: COLORS.textDim },
                  { label: 'Conflict!', version: '3 ✗', color: COLORS.red },
                  { label: '→', version: null, color: COLORS.textDim },
                  { label: 'Retry OK', version: 4, color: COLORS.orange },
                ].map((step, i) => {
                  const sOp = fadeIn(frame, 410 + i * 10, 12);
                  if (!step.version) return (
                    <div key={i} style={{ opacity: sOp, color: COLORS.textDim, fontSize: 16 }}>→</div>
                  );
                  return (
                    <div key={i} style={{
                      opacity: sOp,
                      background: `${step.color}15`,
                      border: `1px solid ${step.color}30`,
                      borderRadius: 8, padding: '8px 10px',
                      textAlign: 'center', minWidth: 60,
                    }}>
                      <div style={{ fontSize: 9, color: step.color, fontWeight: 600, marginBottom: 4 }}>{step.label}</div>
                      <div style={{ fontFamily: FONTS.mono, fontSize: 16, fontWeight: 900, color: step.color }}>v{step.version}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Kafka integration */}
          {frame > 700 && (
            <KafkaVersionCard frame={frame} startFrame={700} />
          )}

          {/* Three tools summary */}
          {frame > 1000 && (
            <div style={{
              opacity: fadeIn(frame, 1000, 20),
              background: `${COLORS.accent}08`,
              border: `1px solid ${COLORS.accent}20`,
              borderRadius: 14, padding: '16px 20px',
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 10 }}>
                🧰 Three Synchronization Tools Working Together
              </div>
              {[
                { tool: 'processed_event', role: 'Consumer memory — "Have I done this?"', color: COLORS.green },
                { tool: 'version column', role: 'Producer concurrency — "Am I overwriting someone?"', color: COLORS.orange },
                { tool: 'last_event_id', role: 'Entity identity — "Which event made me this way?"', color: COLORS.cyan },
              ].map((t, i) => {
                const tOp = fadeIn(frame, 1010 + i * 15, 12);
                return (
                  <div key={i} style={{
                    opacity: tOp, display: 'flex', gap: 12,
                    alignItems: 'center', marginBottom: 8,
                  }}>
                    <code style={{
                      fontFamily: FONTS.mono, fontSize: 11, color: t.color,
                      background: `${t.color}12`, borderRadius: 6, padding: '2px 8px',
                      minWidth: 140,
                    }}>{t.tool}</code>
                    <div style={{ fontSize: 12, color: COLORS.textMuted }}>{t.role}</div>
                  </div>
                );
              })}
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
          UPDATE ... WHERE version = $client_version. Returns 0 rows? Conflict. No locks held. No deadlocks. Version travels through Kafka events.
        </div>
      </div>
    </div>
  );
};
