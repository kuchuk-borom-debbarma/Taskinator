import React from "react";
import { useChapterFrame as useCurrentFrame } from "../ChapterFrameContext";
import { COLORS, FONTS, fadeIn, slideUp, ease, progress, float, pulse, scaleIn } from "../design";

// Animated Kafka topic
const KafkaTopic: React.FC<{
  name: string; events: string[]; frame: number; startFrame: number; color?: string;
}> = ({ name, events, frame, startFrame, color = COLORS.kafka }) => {
  const op = fadeIn(frame, startFrame, 20);
  const sc = scaleIn(frame, startFrame, 22);
  const f = float(frame + startFrame, 5, 0.5);

  return (
    <div style={{
      opacity: op,
      transform: `scale(${sc}) translateY(${f}px)`,
      background: `linear-gradient(135deg, ${color}18, ${color}06)`,
      border: `1.5px solid ${color}40`,
      borderRadius: 14,
      padding: '14px 16px',
      minWidth: 200,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: color,
          boxShadow: `0 0 10px ${color}`,
        }} />
        <code style={{ fontFamily: FONTS.mono, fontSize: 12, color: color, fontWeight: 700 }}>{name}</code>
      </div>
      {events.map((event, i) => {
        const eOp = fadeIn(frame, startFrame + 10 + i * 8, 12);
        return (
          <div key={i} style={{
            opacity: eOp,
            display: 'flex', alignItems: 'center', gap: 8,
            marginBottom: 5,
            padding: '4px 8px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 6,
            border: `1px solid ${COLORS.border}`,
          }}>
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: color, opacity: 0.7 }} />
            <code style={{ fontFamily: FONTS.mono, fontSize: 10, color: COLORS.textMuted }}>{event}</code>
          </div>
        );
      })}
    </div>
  );
};

// Animated message flying through a topic
const FlyingMessage: React.FC<{
  frame: number; startFrame: number; x1: number; x2: number; y: number; color: string; label: string;
}> = ({ frame, startFrame, x1, x2, y, color, label }) => {
  const t = progress(frame, startFrame, startFrame + 60, ease.outCubic);
  if (t <= 0) return null;
  const x = x1 + (x2 - x1) * t;
  const opacity = t < 0.1 ? t / 0.1 : t > 0.8 ? (1 - t) / 0.2 : 1;

  return (
    <div style={{
      position: 'absolute',
      left: x + '%', top: y + '%',
      transform: 'translate(-50%, -50%)',
      opacity,
      background: `${color}20`,
      border: `1px solid ${color}60`,
      borderRadius: 999,
      padding: '4px 12px',
      fontSize: 10,
      color: color,
      fontFamily: FONTS.mono,
      fontWeight: 600,
      boxShadow: `0 0 12px ${color}40`,
      whiteSpace: 'nowrap',
    }}>{label}</div>
  );
};

// Partition visualization
const PartitionViz: React.FC<{ frame: number; startFrame: number }> = ({ frame, startFrame }) => {
  const op = fadeIn(frame, startFrame, 20);
  const partitions = [
    { key: 'proj-uuid-1', events: ['CREATED', 'UPDATED'] },
    { key: 'proj-uuid-2', events: ['MEMBER_ADDED', 'TASK_CREATED', 'UPDATED'] },
    { key: 'proj-uuid-3', events: ['DELETED'] },
  ];

  return (
    <div style={{ opacity: op }}>
      <div style={{ fontSize: 13, color: COLORS.textMuted, fontWeight: 600, marginBottom: 10 }}>
        📦 Partitions by projectId (ordering guarantee per project)
      </div>
      {partitions.map((p, i) => {
        const pOp = fadeIn(frame, startFrame + i * 15, 15);
        return (
          <div key={i} style={{
            opacity: pOp,
            display: 'flex', alignItems: 'center', gap: 12,
            marginBottom: 8,
          }}>
            <div style={{
              fontFamily: FONTS.mono, fontSize: 11, color: COLORS.cyan,
              background: `${COLORS.cyan}10`, border: `1px solid ${COLORS.cyan}25`,
              borderRadius: 6, padding: '4px 10px',
              minWidth: 140, textAlign: 'center',
            }}>{p.key}</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {p.events.map((e, j) => {
                const msgT = progress(frame, startFrame + i * 15 + j * 10, startFrame + i * 15 + j * 10 + 15, ease.outCubic);
                return (
                  <div key={j} style={{
                    opacity: msgT,
                    transform: `scale(${msgT})`,
                    background: `${COLORS.kafka}15`,
                    border: `1px solid ${COLORS.kafka}30`,
                    borderRadius: 4, padding: '3px 8px',
                    fontSize: 10, color: COLORS.kafka,
                    fontFamily: FONTS.mono,
                  }}>{e}</div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const KAFKA_TOPICS = [
  { name: 'project-events', events: ['PROJECT_CREATED', 'PROJECT_UPDATED', 'PROJECT_DELETED'], startFrame: 80, color: COLORS.accent },
  { name: 'project-member-events', events: ['MEMBER_ADDED', 'MEMBER_REMOVED'], startFrame: 130, color: COLORS.cyan },
  { name: 'project-team-events', events: ['TEAM_CREATED', 'TEAM_DELETED'], startFrame: 180, color: COLORS.orange },
  { name: 'project-task-events', events: ['TASK_CREATED', 'TASK_UPDATED', 'TASK_DELETED'], startFrame: 230, color: COLORS.green },
];

export const KafkaScene: React.FC = () => {
  const frame = useCurrentFrame();
  const overallFade = frame > 1450 ? 1 - progress(frame, 1450, 1500, ease.inOutCubic) : 1;
  const msgCycle = Math.floor(frame / 60) % 4;

  const messages = [
    { startFrame: 350, x1: 15, x2: 75, y: 60, color: COLORS.accent, label: 'PROJECT_DELETED' },
    { startFrame: 450, x1: 15, x2: 75, y: 65, color: COLORS.green, label: 'eventId: "uuid-abc"' },
    { startFrame: 550, x1: 15, x2: 75, y: 70, color: COLORS.cyan, label: 'projectId: "proj-1"' },
  ];

  return (
    <div style={{
      width: '100%', height: '100%',
      background: `radial-gradient(ellipse at 60% 40%, #12100a 0%, ${COLORS.bg} 70%)`,
      fontFamily: FONTS.sans, overflow: 'hidden',
      position: 'relative', opacity: overallFade,
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(rgba(255,107,53,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,107,53,0.03) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
      }} />

      {/* Flying messages */}
      {messages.map((m, i) => (
        <FlyingMessage key={i} frame={frame} {...m} />
      ))}

      <div style={{ display: 'flex', height: '100%' }}>
        {/* Left */}
        <div style={{ width: '45%', padding: '45px 20px 40px 55px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ opacity: fadeIn(frame, 5, 20) }}>
            <div style={{ fontSize: 12, color: COLORS.kafka, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
              Chapter 4 — Event Streaming
            </div>
            <div style={{ fontSize: 38, fontWeight: 900, color: COLORS.text, letterSpacing: -1, lineHeight: 1.1 }}>
              Kafka Event Bus<br />
              <span style={{ color: COLORS.kafka }}>at 10k RPS</span>
            </div>
            <div style={{ fontSize: 15, color: COLORS.textMuted, marginTop: 10, lineHeight: 1.6 }}>
              Durable, ordered streaming. Every domain change becomes a fact in the log.
            </div>
          </div>

          {/* Design decisions */}
          {[
            {
              icon: '🔑', title: 'Partition Key: projectId',
              text: 'All events for a project land in the same partition → ordering guarantee per project boundary. Teams, tasks, members all scope under project.',
              color: COLORS.accent, delay: 35,
            },
            {
              icon: '📦', title: 'One Topic Per Domain',
              text: 'project-events, task-events, team-events. Consumers stay narrowly focused. A catch-all topic forces every consumer to filter what it doesn\'t care about.',
              color: COLORS.orange, delay: 80,
            },
            {
              icon: '⚡', title: 'Batch Publishing',
              text: 'Events published in arrays → single producer.send() call. N network round-trips reduced to 1. Critical for bulk task creation bursts.',
              color: COLORS.green, delay: 125,
            },
            {
              icon: '🆔', title: 'Idempotent eventId',
              text: 'Every event carries a UUID eventId. Consumers verify before processing. Guards against Kafka\'s at-least-once delivery guarantee.',
              color: COLORS.cyan, delay: 170,
            },
          ].map((item, i) => {
            const op = fadeIn(frame, item.delay, 20);
            const y = slideUp(frame, item.delay, 22);
            return (
              <div key={i} style={{
                opacity: op,
                transform: `translateY(${(1 - y) * 15}px)`,
                display: 'flex', gap: 12, alignItems: 'flex-start',
                background: `${item.color}08`,
                border: `1px solid ${item.color}20`,
                borderRadius: 12, padding: '12px 16px',
              }}>
                <div style={{ fontSize: 20, flexShrink: 0 }}>{item.icon}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: item.color, marginBottom: 4 }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.5 }}>{item.text}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right */}
        <div style={{ width: '55%', padding: '45px 55px 40px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Topics grid */}
          <div style={{ opacity: fadeIn(frame, 40, 20) }}>
            <div style={{ fontSize: 13, color: COLORS.textMuted, fontWeight: 600, marginBottom: 12 }}>
              🔊 Kafka Topics (1 per domain entity)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {KAFKA_TOPICS.map((t, i) => (
                <KafkaTopic key={i} {...t} frame={frame} />
              ))}
            </div>
          </div>

          {/* Partitions */}
          {frame > 310 && (
            <div style={{
              opacity: fadeIn(frame, 310, 20),
              background: COLORS.bgCard,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 14, padding: '18px 20px',
            }}>
              <PartitionViz frame={frame} startFrame={320} />
            </div>
          )}

          {/* EventBus abstraction */}
          {frame > 700 && (
            <div style={{
              opacity: fadeIn(frame, 700, 20),
              background: `linear-gradient(135deg, ${COLORS.purple}12, ${COLORS.purple}04)`,
              border: `1px solid ${COLORS.purple}30`,
              borderRadius: 14, padding: '18px 20px',
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.purple, marginBottom: 12 }}>
                🔄 Polymorphic EventBus Abstraction
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
                {[
                  { name: 'KafkaBus', env: 'Production', color: COLORS.kafka, icon: '⚡', desc: 'Real Kafka broker, consumer groups, exactly-once' },
                  { name: 'MemoryBus', env: 'Test / Dev', color: COLORS.green, icon: '🧪', desc: 'In-process EventEmitter, zero infrastructure, millisecond tests' },
                ].map((bus, i) => {
                  const busOp = fadeIn(frame, 710 + i * 20, 15);
                  return (
                    <div key={i} style={{
                      opacity: busOp, flex: 1,
                      background: `${bus.color}10`,
                      border: `1px solid ${bus.color}25`,
                      borderRadius: 10, padding: '12px',
                    }}>
                      <div style={{ fontSize: 18, marginBottom: 6 }}>{bus.icon}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: bus.color }}>{bus.name}</div>
                      <div style={{ fontSize: 10, color: COLORS.textDim, marginBottom: 6 }}>{bus.env}</div>
                      <div style={{ fontSize: 11, color: COLORS.textMuted }}>{bus.desc}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{
                marginTop: 10, fontSize: 12, color: COLORS.textDim,
                fontFamily: FONTS.mono,
                background: 'rgba(0,0,0,0.3)',
                borderRadius: 8, padding: '8px 12px',
              }}>
                <span style={{ color: COLORS.accent }}>USE_MEMORY_BUS</span>=true → swap at startup. Zero code changes.
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
          One topic per domain. projectId as partition key. Batch publishing reduces N network round-trips to 1.
          MemoryBus swaps in for tests — zero Kafka dependency.
        </div>
      </div>
    </div>
  );
};
