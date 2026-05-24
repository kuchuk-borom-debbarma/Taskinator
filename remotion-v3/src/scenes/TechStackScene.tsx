import React from "react";
import { useChapterFrame as useCurrentFrame } from "../ChapterFrameContext";
import { COLORS, FONTS, fadeIn, slideUp, scaleIn, float, ease, progress, stagger, pulse } from "../design";

interface TechItem {
  name: string;
  logo: string;
  color: string;
  role: string;
  why: string;
  delay: number;
}

const TECH_ITEMS: TechItem[] = [
  {
    name: 'Bun', logo: '🍞', color: '#fbf0df',
    role: 'Runtime & Tooling',
    why: 'High performance + built-in bundler, tester, package manager. Single binary ships everything.',
    delay: 20,
  },
  {
    name: 'PostgreSQL', logo: '🐘', color: COLORS.postgres,
    role: 'Primary Database',
    why: 'Relational model, strict schemas, FK constraints. Projects/teams/tasks need ordered, structured data.',
    delay: 40,
  },
  {
    name: 'Kysely', logo: '🔷', color: COLORS.cyan,
    role: 'Type-Safe Query Builder',
    why: 'End-to-end TypeScript safety from request handler to DB query. Raw SQL escape hatch for complex auth.',
    delay: 60,
  },
  {
    name: 'Kafka', logo: '⚡', color: COLORS.kafka,
    role: 'Event Streaming',
    why: 'Durable, ordered event streaming. Async task completion, decoupled cleanup cascades at 10k RPS.',
    delay: 80,
  },
  {
    name: 'Redis', logo: '🔴', color: COLORS.redis,
    role: 'Cache & Rate Limiting',
    why: 'Fast ephemeral storage. Caches hot read paths (project members). Rate-limiter for API protection.',
    delay: 100,
  },
  {
    name: 'JWT', logo: '🔑', color: COLORS.orange,
    role: 'Authentication',
    why: 'Stateless tokens. No session store to manage. Scales horizontally with zero coordination overhead.',
    delay: 120,
  },
  {
    name: 'GraphQL Yoga', logo: '🔮', color: COLORS.graphql,
    role: 'API Gateway',
    why: 'Relay-spec pagination, type-safe resolvers, DataLoader for N+1 prevention, schema-first design.',
    delay: 140,
  },
  {
    name: 'OpenTelemetry', logo: '📡', color: COLORS.green,
    role: 'Observability',
    why: 'Distributed tracing across request lifecycle. Essential for debugging 10k RPS distributed events.',
    delay: 160,
  },
];

const TechCard: React.FC<{ item: TechItem; frame: number; isSelected: boolean; onClick?: () => void }> = ({
  item, frame, isSelected,
}) => {
  const op = fadeIn(frame, item.delay, 20);
  const sc = scaleIn(frame, item.delay, 20);
  const f = float(frame + item.delay * 3, 4, 0.6);
  const p = pulse(frame + item.delay * 5);

  return (
    <div style={{
      opacity: op,
      transform: `scale(${sc}) translateY(${f}px)`,
      background: isSelected
        ? `linear-gradient(135deg, ${item.color}20, ${item.color}08)`
        : `linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))`,
      border: `1.5px solid ${isSelected ? item.color + '60' : COLORS.border}`,
      borderRadius: 16,
      padding: '16px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      boxShadow: isSelected ? `0 0 20px ${item.color}20` : 'none',
    }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
        <div style={{
          fontSize: 28,
          width: 44, height: 44,
          background: `${item.color}15`,
          border: `1px solid ${item.color}30`,
          borderRadius: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: isSelected ? `0 0 16px ${item.color}40` : 'none',
        }}>{item.logo}</div>
        <div>
          <div style={{ color: item.color, fontWeight: 700, fontSize: 15 }}>{item.name}</div>
          <div style={{ color: COLORS.textDim, fontSize: 11 }}>{item.role}</div>
        </div>
      </div>
      {isSelected && (
        <div style={{
          fontSize: 12, color: COLORS.textMuted, lineHeight: 1.6,
          borderTop: `1px solid ${item.color}20`,
          paddingTop: 10, marginTop: 4,
        }}>{item.why}</div>
      )}
    </div>
  );
};

// Architecture flow diagram
const FlowDiagram: React.FC<{ frame: number }> = ({ frame }) => {
  const show = frame > 170;
  if (!show) return null;

  const t = progress(frame, 170, 200, ease.outExpo);
  const layers = [
    { label: 'Client', color: COLORS.textDim, items: ['Web App', 'Mobile'] },
    { label: 'API Layer', color: COLORS.graphql, items: ['GraphQL Yoga', 'REST Express'] },
    { label: 'Service Layer', color: COLORS.accent, items: ['ProjectService', 'TaskService', 'TeamService'] },
    { label: 'Data Layer', color: COLORS.postgres, items: ['Kysely + PostgreSQL', 'Redis Cache'] },
    { label: 'Event Layer', color: COLORS.kafka, items: ['Kafka Topics', 'Consumer Groups'] },
  ];

  return (
    <div style={{
      opacity: t,
      transform: `translateY(${(1 - t) * 20}px)`,
      background: COLORS.bgCard,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 16, padding: '20px 24px',
    }}>
      <div style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 14, fontWeight: 600 }}>
        📐 System Layers
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
        {layers.map((layer, i) => {
          const layerT = progress(frame, 175 + i * 10, 205 + i * 10, ease.outCubic);
          return (
            <div key={i} style={{
              flex: 1,
              opacity: layerT,
              transform: `translateY(${(1 - layerT) * 15}px)`,
              background: `${layer.color}10`,
              border: `1px solid ${layer.color}25`,
              borderRadius: 10, padding: '12px 8px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 11, color: layer.color, fontWeight: 700, marginBottom: 8 }}>
                {layer.label}
              </div>
              {layer.items.map((item, j) => (
                <div key={j} style={{
                  fontSize: 10, color: COLORS.textDim,
                  background: `${layer.color}08`,
                  border: `1px solid ${layer.color}15`,
                  borderRadius: 6, padding: '4px 6px', marginBottom: 4,
                }}>{item}</div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const TechStackScene: React.FC = () => {
  const frame = useCurrentFrame();
  const overallFade = frame > 1450 ? 1 - progress(frame, 1450, 1500, ease.inOutCubic) : 1;

  // Cycle through selected cards
  const selectedIndex = Math.floor(frame / 200) % TECH_ITEMS.length;

  return (
    <div style={{
      width: '100%', height: '100%',
      background: `radial-gradient(ellipse at 70% 30%, #0f1628 0%, ${COLORS.bg} 70%)`,
      fontFamily: FONTS.sans,
      overflow: 'hidden',
      position: 'relative',
      opacity: overallFade,
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(rgba(99,102,241,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.025) 1px, transparent 1px)`,
        backgroundSize: '50px 50px',
      }} />

      <div style={{ display: 'flex', height: '100%', gap: 0 }}>
        {/* Left: header + flow diagram */}
        <div style={{ width: '40%', padding: '50px 30px 40px 60px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ opacity: fadeIn(frame, 5, 20) }}>
            <div style={{ fontSize: 12, color: COLORS.accent, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
              Chapter 2 — Tech Stack
            </div>
            <div style={{ fontSize: 42, fontWeight: 900, color: COLORS.text, letterSpacing: -1.5, lineHeight: 1.1 }}>
              Every Tool,<br />
              <span style={{ color: COLORS.accent }}>Every Reason</span>
            </div>
            <div style={{ fontSize: 15, color: COLORS.textMuted, marginTop: 12, lineHeight: 1.6 }}>
              No cargo-culting. Each technology was chosen to solve a specific constraint at 10,000 RPS.
            </div>
          </div>

          <FlowDiagram frame={frame} />

          {/* RPS target callout */}
          {frame > 250 && (
            <div style={{
              opacity: fadeIn(frame, 250, 20),
              background: `linear-gradient(135deg, ${COLORS.orange}15, ${COLORS.red}08)`,
              border: `1px solid ${COLORS.orange}30`,
              borderRadius: 12, padding: '16px 20px',
              display: 'flex', gap: 12, alignItems: 'center',
            }}>
              <div style={{ fontSize: 28 }}>🎯</div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 900, color: COLORS.orange }}>10,000 RPS</div>
                <div style={{ fontSize: 12, color: COLORS.textMuted }}>Production target — every choice is shaped by this constraint</div>
              </div>
            </div>
          )}
        </div>

        {/* Right: tech grid */}
        <div style={{
          width: '60%',
          padding: '50px 60px 40px 20px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: 'repeat(4, 1fr)',
          gap: 14,
          alignContent: 'start',
        }}>
          {TECH_ITEMS.map((item, i) => (
            <TechCard
              key={i}
              item={item}
              frame={frame}
              isSelected={i === selectedIndex}
            />
          ))}
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
          textAlign: 'center',
          backdropFilter: 'blur(12px)',
        }}>
          Bun runtime + PostgreSQL + Kysely + Kafka + Redis — engineered for high-throughput, type-safe operations.
          Each tool solves a specific scaling bottleneck.
        </div>
      </div>
    </div>
  );
};
