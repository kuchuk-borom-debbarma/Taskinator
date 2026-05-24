import React from "react";
import { useChapterFrame as useCurrentFrame } from "../ChapterFrameContext";
import { COLORS, FONTS, fadeIn, slideUp, ease, progress, scaleIn, pulse } from "../design";

const SQL_IDEMPOTENCY = `-- Atomic "have I seen this?" check + mark as seen
INSERT INTO processed_event (event_id, consumer_group, processed_at)
VALUES ($1, $2, now())
ON CONFLICT (event_id, consumer_group) DO NOTHING
RETURNING event_id;

-- If RETURNING is empty → already processed → skip
-- If RETURNING has a row → new event → run business logic
-- All in ONE B-Tree operation — O(log n)`;

const BATCH_IDEMPOTENCY = `-- withBatchIdempotency: check entire batch in 1 query
WITH inserted AS (
  INSERT INTO processed_event
  SELECT unnest($events::uuid[]), $groupId, now()
  ON CONFLICT DO NOTHING
  RETURNING event_id
)
-- Only process events that were newly inserted
SELECT event_id FROM inserted;
-- N DB round-trips → 1  ✨`;

// Animated flow step
const FlowStep: React.FC<{
  number: number; label: string; detail: string; color: string;
  frame: number; startFrame: number; isLast?: boolean;
  badge?: string;
}> = ({ number, label, detail, color, frame, startFrame, isLast, badge }) => {
  const op = fadeIn(frame, startFrame, 20);
  const sc = scaleIn(frame, startFrame, 22);

  return (
    <div style={{ display: 'flex', gap: 0, alignItems: 'stretch' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: 16 }}>
        <div style={{
          opacity: op,
          transform: `scale(${sc})`,
          width: 40, height: 40,
          borderRadius: '50%',
          background: `${color}20`,
          border: `2px solid ${color}60`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 900, color: color,
          boxShadow: `0 0 16px ${color}30`,
          flexShrink: 0,
        }}>{number}</div>
        {!isLast && <div style={{ width: 2, flex: 1, background: `${color}20`, margin: '4px 0' }} />}
      </div>
      <div style={{
        opacity: op,
        transform: `translateY(${(1 - fadeIn(frame, startFrame, 20)) * 10}px)`,
        paddingBottom: isLast ? 0 : 16,
        flex: 1,
      }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>{label}</div>
          {badge && (
            <div style={{
              fontSize: 9, color: color, fontWeight: 700, letterSpacing: 1,
              background: `${color}15`, border: `1px solid ${color}30`,
              borderRadius: 999, padding: '2px 8px',
            }}>{badge}</div>
          )}
        </div>
        <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.6 }}>{detail}</div>
      </div>
    </div>
  );
};

// Animated table row visualization
const TableViz: React.FC<{ frame: number; startFrame: number }> = ({ frame, startFrame }) => {
  const op = fadeIn(frame, startFrame, 20);
  const rows = [
    { eventId: 'evt-uuid-1', group: 'task-cleanup-group', status: 'PROCESSED', color: COLORS.green },
    { eventId: 'evt-uuid-2', group: 'member-cleanup-group', status: 'PROCESSED', color: COLORS.green },
    { eventId: 'evt-uuid-1', group: 'member-cleanup-group', status: 'DUPLICATE → SKIP', color: COLORS.orange },
    { eventId: 'evt-uuid-3', group: 'task-cleanup-group', status: 'NEW → EXECUTE', color: COLORS.cyan },
  ];

  return (
    <div style={{ opacity: op }}>
      <div style={{
        background: '#0a0f1e',
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12, overflow: 'hidden',
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          padding: '8px 16px',
          background: COLORS.bgCard,
          borderBottom: `1px solid ${COLORS.border}`,
          fontSize: 11, color: COLORS.textDim, fontWeight: 600,
          fontFamily: FONTS.mono,
        }}>
          <div>event_id</div>
          <div>consumer_group</div>
          <div>status</div>
        </div>
        {rows.map((row, i) => {
          const rowOp = fadeIn(frame, startFrame + 10 + i * 15, 12);
          return (
            <div key={i} style={{
              opacity: rowOp,
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
              padding: '8px 16px',
              borderBottom: i < rows.length - 1 ? `1px solid ${COLORS.border}` : 'none',
              background: row.status.includes('SKIP') ? `${COLORS.orange}08` : row.status.includes('NEW') ? `${COLORS.cyan}08` : 'transparent',
            }}>
              <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: COLORS.textDim }}>
                {row.eventId}
              </div>
              <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: COLORS.textMuted }}>
                {row.group}
              </div>
              <div style={{
                fontSize: 10, color: row.color, fontWeight: 600, fontFamily: FONTS.mono,
              }}>{row.status}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Scale metric card
const MetricCard: React.FC<{
  before: string; after: string; label: string; color: string;
  frame: number; startFrame: number;
}> = ({ before, after, label, color, frame, startFrame }) => {
  const op = fadeIn(frame, startFrame, 20);
  const sc = scaleIn(frame, startFrame, 22);
  const t = progress(frame, startFrame + 15, startFrame + 45, ease.outCubic);

  return (
    <div style={{
      opacity: op,
      transform: `scale(${sc})`,
      background: `${color}10`,
      border: `1px solid ${color}25`,
      borderRadius: 12, padding: '14px 16px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <div style={{ fontSize: 18, color: COLORS.red, fontWeight: 800, textDecoration: 'line-through', opacity: 0.6 }}>{before}</div>
        <div style={{ fontSize: 16 }}>→</div>
        <div style={{ fontSize: 22, color: color, fontWeight: 900 }}>{after}</div>
      </div>
    </div>
  );
};

export const IdempotencyScene: React.FC = () => {
  const frame = useCurrentFrame();
  const overallFade = frame > 1450 ? 1 - progress(frame, 1450, 1500, ease.inOutCubic) : 1;
  const showBatch = frame > 800;

  return (
    <div style={{
      width: '100%', height: '100%',
      background: `radial-gradient(ellipse at 30% 60%, #0b1020 0%, ${COLORS.bg} 70%)`,
      fontFamily: FONTS.sans, overflow: 'hidden',
      position: 'relative', opacity: overallFade,
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(rgba(16,185,129,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.025) 1px, transparent 1px)`,
        backgroundSize: '55px 55px',
      }} />

      <div style={{ display: 'flex', height: '100%' }}>
        {/* Left */}
        <div style={{ width: '50%', padding: '45px 20px 40px 55px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ opacity: fadeIn(frame, 5, 20) }}>
            <div style={{ fontSize: 12, color: COLORS.green, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
              Chapter 6 — Idempotency
            </div>
            <div style={{ fontSize: 36, fontWeight: 900, color: COLORS.text, letterSpacing: -1, lineHeight: 1.1 }}>
              Exactly-Once<br />
              <span style={{ color: COLORS.green }}>at 10k RPS</span>
            </div>
            <div style={{ fontSize: 14, color: COLORS.textMuted, marginTop: 8, lineHeight: 1.6 }}>
              Kafka guarantees at-least-once delivery. That means duplicates.
              We solve this with a three-layer defense system.
            </div>
          </div>

          {/* The three layers */}
          <div style={{ opacity: fadeIn(frame, 30, 20) }}>
            <div style={{ fontSize: 13, color: COLORS.textMuted, fontWeight: 600, marginBottom: 12 }}>
              🛡️ Three-Layer Idempotency Defense
            </div>
            <FlowStep
              number={1} label="processed_event Table (Primary)"
              detail="Dedicated table tracking (event_id, consumer_group) pairs. Transactional Inbox pattern — the check AND mark happen atomically."
              color={COLORS.green} frame={frame} startFrame={40}
              badge="PRIMARY"
            />
            <FlowStep
              number={2} label="last_event_id on Entity (Fencing)"
              detail="Every entity row stores the last event ID that modified it. Acts as a Fencing Token — rejects older events trying to overwrite newer state."
              color={COLORS.cyan} frame={frame} startFrame={100}
              badge="SECONDARY"
            />
            <FlowStep
              number={3} label="version Column (Out-of-Order Guard)"
              detail="Compare-and-swap update. If an older event arrives with stale version, the WHERE clause matches 0 rows. Database rejects it atomically."
              color={COLORS.orange} frame={frame} startFrame={160}
              badge="TERTIARY"
              isLast
            />
          </div>

          {/* Partition strategy */}
          {frame > 700 && (
            <div style={{
              opacity: fadeIn(frame, 700, 20),
              background: `${COLORS.purple}10`,
              border: `1px solid ${COLORS.purple}25`,
              borderRadius: 12, padding: '14px 18px',
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.purple, marginBottom: 8 }}>
                📊 10k RPS Scaling Strategy for processed_event
              </div>
              {[
                '**Composite PK** (event_id, consumer_group) — O(log n) lookup',
                '**Table partitioned by processed_at** — daily partitions keep active index in RAM',
                '**TTL = Kafka retention** — drop 7-day-old partitions instantly, no vacuum',
              ].map((item, i) => {
                const iOp = fadeIn(frame, 710 + i * 15, 12);
                const text = item.replace(/\*\*(.*?)\*\*/g, (_, t) => t);
                const isBold = (s: string) => item.includes(`**${s}**`);
                return (
                  <div key={i} style={{
                    opacity: iOp, display: 'flex', gap: 8,
                    alignItems: 'flex-start', marginBottom: 8,
                  }}>
                    <span style={{ color: COLORS.purple }}>›</span>
                    <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.5 }}>
                      {item.split(/\*\*(.*?)\*\*/g).map((part, j) =>
                        j % 2 === 1
                          ? <strong key={j} style={{ color: COLORS.text }}>{part}</strong>
                          : <span key={j}>{part}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right */}
        <div style={{ width: '50%', padding: '45px 55px 40px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* SQL block */}
          <div style={{ opacity: fadeIn(frame, 20, 20) }}>
            <div style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: 600, marginBottom: 8 }}>
              ⚡ Single-query atomic idempotency check
            </div>
            <div style={{
              background: '#0a0f1e',
              border: `1px solid ${COLORS.green}30`,
              borderRadius: 12, padding: '16px 20px',
              fontFamily: FONTS.mono, fontSize: 12, lineHeight: 1.8,
              color: COLORS.text, whiteSpace: 'pre',
            }}>
              {SQL_IDEMPOTENCY.split('\n').map((line, i) => {
                const lineOp = fadeIn(frame, 25 + i * 12, 10);
                return (
                  <div key={i} style={{ opacity: lineOp }}>
                    {line.split(/(INSERT|INTO|VALUES|ON|CONFLICT|DO|NOTHING|RETURNING|SELECT|FROM|WHERE|--.*$)/g).map((part, j) => {
                      if (/^(INSERT|INTO|VALUES|ON|CONFLICT|DO|NOTHING|RETURNING|SELECT|FROM|WHERE)$/.test(part)) {
                        return <span key={j} style={{ color: COLORS.accent }}>{part}</span>;
                      }
                      if (part.startsWith('--')) return <span key={j} style={{ color: COLORS.textDim, fontStyle: 'italic' }}>{part}</span>;
                      return <span key={j}>{part}</span>;
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Table visualization */}
          <TableViz frame={frame} startFrame={300} />

          {/* Batch idempotency */}
          {showBatch && (
            <div style={{
              opacity: fadeIn(frame, 800, 20),
            }}>
              <div style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: 600, marginBottom: 8 }}>
                🚀 Batch idempotency — N queries → 1 (for 10k RPS burst)
              </div>
              <div style={{
                background: '#0a0f1e',
                border: `1px solid ${COLORS.cyan}30`,
                borderRadius: 12, padding: '14px 18px',
                fontFamily: FONTS.mono, fontSize: 11.5, lineHeight: 1.8,
                color: COLORS.text, whiteSpace: 'pre',
              }}>
                {BATCH_IDEMPOTENCY.split('\n').map((line, i) => {
                  const lineOp = fadeIn(frame, 810 + i * 10, 10);
                  return (
                    <div key={i} style={{ opacity: lineOp }}>
                      {line.split(/(WITH|INSERT|SELECT|FROM|ON|CONFLICT|RETURNING|\-\-.*$)/g).map((part, j) => {
                        if (/^(WITH|INSERT|SELECT|FROM|ON|CONFLICT|RETURNING)$/.test(part)) {
                          return <span key={j} style={{ color: COLORS.cyan }}>{part}</span>;
                        }
                        if (part.startsWith('--') || part.startsWith('# N')) {
                          return <span key={j} style={{ color: COLORS.green, fontStyle: 'italic' }}>{part}</span>;
                        }
                        return <span key={j}>{part}</span>;
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Metrics */}
          {frame > 1100 && (
            <div style={{
              opacity: fadeIn(frame, 1100, 20),
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12,
            }}>
              <MetricCard before="N" after="1" label="DB round-trips per batch" color={COLORS.green} frame={frame} startFrame={1110} />
              <MetricCard before="O(n)" after="O(log n)" label="Per-event lookup cost" color={COLORS.cyan} frame={frame} startFrame={1130} />
              <MetricCard before="Vacuum" after="DROP" label="Cleanup strategy" color={COLORS.orange} frame={frame} startFrame={1150} />
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
          INSERT ON CONFLICT DO NOTHING RETURNING — have I seen this? + mark as seen — in one B-Tree operation. N round-trips → 1.
        </div>
      </div>
    </div>
  );
};
