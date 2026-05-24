import React from "react";
import { useChapterFrame as useCurrentFrame } from "../ChapterFrameContext";
import { COLORS, FONTS, fadeIn, slideUp, ease, progress, scaleIn, float, pulse } from "../design";

// Animated summary card
const SummaryCard: React.FC<{
  icon: string; title: string; desc: string; color: string;
  frame: number; index: number;
}> = ({ icon, title, desc, color, frame, index }) => {
  const startFrame = 40 + index * 30;
  const op = fadeIn(frame, startFrame, 20);
  const sc = scaleIn(frame, startFrame, 22);
  const f = float(frame + index * 40, 4, 0.5);
  const p = pulse(frame + index * 30);

  return (
    <div style={{
      opacity: op,
      transform: `scale(${sc}) translateY(${f}px)`,
      background: `linear-gradient(135deg, ${color}15, ${color}04)`,
      border: `1.5px solid ${color}35`,
      borderRadius: 16, padding: '16px 18px',
      boxShadow: `0 0 ${20 + p * 10}px ${color}15`,
    }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: color, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 11, color: COLORS.textMuted, lineHeight: 1.5 }}>{desc}</div>
    </div>
  );
};

// What's next card
const NextCard: React.FC<{ item: string; color: string; frame: number; startFrame: number }> = ({ item, color, frame, startFrame }) => {
  const op = fadeIn(frame, startFrame, 15);
  const x = progress(frame, startFrame, startFrame + 20, ease.outCubic);
  return (
    <div style={{
      opacity: op,
      transform: `translateX(${(1 - x) * -20}px)`,
      display: 'flex', gap: 10, alignItems: 'center',
      background: `${color}08`,
      border: `1px solid ${color}20`,
      borderRadius: 10, padding: '10px 14px',
      marginBottom: 8,
    }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 8px ${color}` }} />
      <div style={{ fontSize: 13, color: COLORS.textMuted }}>{item}</div>
    </div>
  );
};

const SUMMARY_ITEMS = [
  { icon: '🏗️', title: 'Modular Monolith', desc: 'Clear domain boundaries. Extract services when real pressure demands it.', color: COLORS.accent },
  { icon: '🐘', title: 'Materialized Paths', desc: 'O(1) subtree reads. Atomic path updates. Read-heavy design validated.', color: COLORS.postgres },
  { icon: '⚡', title: 'Kafka Choreography', desc: 'One broadcast. Three parallel cleanup groups. Zero coordination overhead.', color: COLORS.kafka },
  { icon: '🛡️', title: 'Three-Layer Idempotency', desc: 'processed_event + version + last_event_id. Exactly-once at 10k RPS.', color: COLORS.green },
  { icon: '🔒', title: 'Optimistic Locking', desc: 'Compare-and-swap. No deadlocks. Version travels through Kafka events.', color: COLORS.orange },
  { icon: '⚙️', title: 'SQL Engineering', desc: 'CTEs + unnest + RETURNING. ~4 DB round-trips → 1. Database as compute.', color: COLORS.cyan },
  { icon: '🔮', title: 'Ports & Adapters', desc: 'GraphQL + REST as thin adapters. Service layer is pure domain logic.', color: COLORS.graphql },
  { icon: '🤖', title: 'TCA Engine', desc: 'Trigger→Condition→Action. Self-propagating cascades via events.', color: COLORS.purple },
];

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const overallFade = frame > 1420 ? 1 - progress(frame, 1420, 1500, ease.inOutCubic) : 1;

  const titleOp = fadeIn(frame, 5, 25);
  const titleY = slideUp(frame, 5, 30);
  const showNext = frame > 900;
  const showEnd = frame > 1200;

  return (
    <div style={{
      width: '100%', height: '100%',
      background: `radial-gradient(ellipse at 50% 50%, #0f1729 0%, ${COLORS.bg} 70%)`,
      fontFamily: FONTS.sans, overflow: 'hidden',
      position: 'relative', opacity: overallFade,
    }}>
      {/* Grid background */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
      }} />

      {/* Glow orbs */}
      {[
        { x: 15, y: 20, color: COLORS.accent, size: 500 },
        { x: 85, y: 80, color: COLORS.purple, size: 400 },
        { x: 50, y: 50, color: COLORS.cyan, size: 300 },
      ].map((orb, i) => {
        const p = pulse(frame + i * 40);
        return (
          <div key={i} style={{
            position: 'absolute',
            left: orb.x + '%', top: orb.y + '%',
            width: orb.size, height: orb.size,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${orb.color}30, transparent 70%)`,
            filter: `blur(${50 + p * 20}px)`,
            transform: 'translate(-50%, -50%)',
            opacity: 0.5 + p * 0.2,
          }} />
        );
      })}

      <div style={{ padding: '40px 60px', height: '100%', display: 'flex', flexDirection: 'column', gap: 24, overflowY: 'hidden' }}>
        {/* Header */}
        <div style={{
          opacity: titleOp,
          transform: `translateY(${(1 - titleY) * 20}px)`,
          textAlign: 'center', flexShrink: 0,
        }}>
          <div style={{ fontSize: 12, color: COLORS.accent, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>
            Chapter 11 — Outro
          </div>
          <h2 style={{
            margin: 0, fontSize: 48, fontWeight: 900,
            background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.cyan}, ${COLORS.purple})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            letterSpacing: -1.5,
          }}>The Full Picture</h2>
          <div style={{ fontSize: 16, color: COLORS.textMuted, marginTop: 8 }}>
            Everything we built to hit 10,000 RPS with exactly-once semantics
          </div>
        </div>

        {/* Summary grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
          flex: 1,
        }}>
          {SUMMARY_ITEMS.map((item, i) => (
            <SummaryCard
              key={i}
              icon={item.icon}
              title={item.title}
              desc={item.desc}
              color={item.color}
              frame={frame}
              index={i}
            />
          ))}
        </div>

        {/* What's next */}
        {showNext && (
          <div style={{
            opacity: fadeIn(frame, 900, 25),
            display: 'flex', gap: 24, flexShrink: 0,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, marginBottom: 12 }}>
                🚀 What's coming next
              </div>
              {[
                { item: 'Full UI walkthrough — React + GraphQL client architecture', color: COLORS.accent },
                { item: 'Load testing results — actual 10k RPS benchmark data', color: COLORS.green },
                { item: 'Observability deep dive — OpenTelemetry trace visualization', color: COLORS.cyan },
                { item: 'Mutation testing — Stryker results on critical paths', color: COLORS.orange },
              ].map((n, i) => (
                <NextCard key={i} item={n.item} color={n.color} frame={frame} startFrame={910 + i * 20} />
              ))}
            </div>

            {/* Final CTA */}
            {showEnd && (
              <div style={{
                width: 280, flexShrink: 0,
                opacity: fadeIn(frame, 1200, 25),
                transform: `scale(${scaleIn(frame, 1200, 25)})`,
                background: `linear-gradient(135deg, ${COLORS.accent}20, ${COLORS.purple}10)`,
                border: `1.5px solid ${COLORS.accent}40`,
                borderRadius: 20, padding: '24px',
                textAlign: 'center',
                boxShadow: `0 0 40px ${COLORS.accent}20`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 12,
              }}>
                <div style={{
                  width: 60, height: 60, borderRadius: 16,
                  background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.purple})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28,
                  boxShadow: `0 0 30px ${COLORS.accent}60`,
                }}>T</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: COLORS.text }}>Task-In</div>
                <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.6 }}>
                  Backend built for scale.<br />Every decision justified.<br />Every tradeoff documented.
                </div>
                <div style={{
                  marginTop: 8, fontSize: 12, color: COLORS.accent, fontWeight: 600,
                  letterSpacing: 1,
                }}>Like · Subscribe · Comment 🔔</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
