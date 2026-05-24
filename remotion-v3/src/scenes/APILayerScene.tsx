import React from "react";
import { useChapterFrame as useCurrentFrame } from "../ChapterFrameContext";
import { COLORS, FONTS, fadeIn, slideUp, ease, progress, scaleIn, float } from "../design";

// Hex architecture diagram
const HexDiagram: React.FC<{ frame: number }> = ({ frame }) => {
  const layers = [
    { label: 'HTTP / GraphQL', sublabel: 'Transport', color: COLORS.graphql, radius: 60, delay: 20 },
    { label: 'Routes / Resolvers', sublabel: 'Controllers', color: COLORS.accent, radius: 110, delay: 50 },
    { label: 'Service Layer', sublabel: 'Business Logic', color: COLORS.cyan, radius: 160, delay: 80 },
    { label: 'Query Objects', sublabel: 'Data Access', color: COLORS.green, radius: 210, delay: 110 },
  ];

  return (
    <div style={{ position: 'relative', width: 480, height: 480, margin: '0 auto' }}>
      <svg width="480" height="480" viewBox="-240 -240 480 480">
        {layers.map((layer, i) => {
          const t = progress(frame, layer.delay, layer.delay + 30, ease.outCubic);
          return (
            <g key={i}>
              <circle
                cx={0} cy={0} r={layer.radius * t}
                fill="none"
                stroke={layer.color}
                strokeWidth="1.5"
                strokeDasharray={`${layer.radius * 0.2} ${layer.radius * 0.05}`}
                opacity={0.4 * t}
              />
            </g>
          );
        })}

        {/* Core domain box */}
        {frame > 30 && (
          <g opacity={progress(frame, 30, 55, ease.outCubic)}>
            <rect x="-40" y="-30" width="80" height="60" rx="12"
              fill={`${COLORS.accent}20`} stroke={COLORS.accent} strokeWidth="1.5" />
            <text x={0} y={-8} textAnchor="middle" fill={COLORS.accent} fontSize="12" fontWeight="700">Domain</text>
            <text x={0} y={10} textAnchor="middle" fill={COLORS.textDim} fontSize="10">Services</text>
          </g>
        )}

        {/* Labels on rings */}
        {layers.map((layer, i) => {
          const t = progress(frame, layer.delay + 15, layer.delay + 40, ease.outCubic);
          const angle = -70 + i * 30;
          const rad = angle * Math.PI / 180;
          const lx = Math.cos(rad) * layer.radius;
          const ly = Math.sin(rad) * layer.radius;
          return (
            <g key={i} opacity={t}>
              <text x={lx} y={ly - 4} textAnchor="middle" fill={layer.color} fontSize="10" fontWeight="700">{layer.label}</text>
              <text x={lx} y={ly + 10} textAnchor="middle" fill={COLORS.textDim} fontSize="8">{layer.sublabel}</text>
            </g>
          );
        })}

        {/* Port arrows */}
        {frame > 120 && ['↗ REST', '↗ GraphQL', '↗ CLI (future)'].map((port, i) => {
          const t = progress(frame, 120 + i * 20, 150 + i * 20, ease.outCubic);
          const angle = 60 + i * 35;
          const rad = angle * Math.PI / 180;
          const x1 = Math.cos(rad) * 220;
          const y1 = Math.sin(rad) * 220;
          const x2 = Math.cos(rad) * 170;
          const y2 = Math.sin(rad) * 170;
          return (
            <g key={i} opacity={t}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={COLORS.textDim} strokeWidth="1" strokeDasharray="4 3" />
              <text x={x1 + Math.cos(rad) * 12} y={y1 + Math.sin(rad) * 12}
                textAnchor="middle" fill={COLORS.textDim} fontSize="9">{port}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// Route structure visualization
const RouteTree: React.FC<{ frame: number; startFrame: number }> = ({ frame, startFrame }) => {
  const routes = [
    { path: '/graphql', method: 'POST', domain: 'All domains', color: COLORS.graphql, delay: 0 },
    { path: '/health', method: 'GET', domain: 'System', color: COLORS.green, delay: 15 },
    { path: '/api/projects', method: 'GET/POST', domain: 'Project', color: COLORS.accent, delay: 30 },
    { path: '/api/tasks', method: 'GET/POST', domain: 'Task', color: COLORS.cyan, delay: 45 },
    { path: '/api/teams', method: 'GET/POST', domain: 'Team', color: COLORS.orange, delay: 60 },
  ];

  return (
    <div style={{ opacity: fadeIn(frame, startFrame, 20) }}>
      <div style={{ fontSize: 13, color: COLORS.textMuted, fontWeight: 600, marginBottom: 10 }}>
        🗺️ Modular Route Structure
      </div>
      {routes.map((route, i) => {
        const rOp = fadeIn(frame, startFrame + route.delay, 15);
        return (
          <div key={i} style={{
            opacity: rOp,
            display: 'flex', alignItems: 'center', gap: 10,
            marginBottom: 8,
            background: `${route.color}08`,
            border: `1px solid ${route.color}20`,
            borderRadius: 8, padding: '8px 14px',
          }}>
            <div style={{
              fontFamily: FONTS.mono, fontSize: 10, fontWeight: 700,
              color: route.method.includes('/') ? COLORS.cyan : route.method === 'POST' ? COLORS.orange : COLORS.green,
              background: 'rgba(0,0,0,0.3)',
              borderRadius: 4, padding: '2px 8px', minWidth: 60, textAlign: 'center',
            }}>{route.method}</div>
            <code style={{ fontFamily: FONTS.mono, fontSize: 11, color: route.color, flex: 1 }}>{route.path}</code>
            <div style={{ fontSize: 10, color: COLORS.textDim }}>{route.domain}</div>
          </div>
        );
      })}
    </div>
  );
};

// DataLoader N+1 viz
const DataLoaderViz: React.FC<{ frame: number; startFrame: number }> = ({ frame, startFrame }) => {
  const op = fadeIn(frame, startFrame, 20);
  const showBatched = frame > startFrame + 100;

  const queries = ['task.creator', 'task.team', 'task.assignee'];

  return (
    <div style={{ opacity: op }}>
      <div style={{ fontSize: 13, color: COLORS.textMuted, fontWeight: 600, marginBottom: 10 }}>
        🔋 DataLoader: N+1 Prevention
      </div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* Without DataLoader */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: COLORS.red, fontWeight: 700, marginBottom: 8 }}>❌ Naive (N+1)</div>
          {Array.from({ length: 5 }, (_, i) => {
            const qOp = fadeIn(frame, startFrame + 10 + i * 8, 12);
            return (
              <div key={i} style={{
                opacity: qOp,
                display: 'flex', alignItems: 'center', gap: 4,
                marginBottom: 4,
              }}>
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: COLORS.red }} />
                <code style={{ fontSize: 9, color: COLORS.textDim, fontFamily: FONTS.mono }}>
                  SELECT * FROM users WHERE id='{`user-${i + 1}`}'
                </code>
              </div>
            );
          })}
          <div style={{
            marginTop: 6, fontSize: 10, color: COLORS.red, fontWeight: 600,
          }}>= 5 queries for 5 tasks</div>
        </div>

        {/* With DataLoader */}
        <div style={{ flex: 1, opacity: showBatched ? 1 : 0.3 }}>
          <div style={{ fontSize: 10, color: COLORS.green, fontWeight: 700, marginBottom: 8 }}>✅ DataLoader (batch)</div>
          <div style={{
            opacity: showBatched ? fadeIn(frame, startFrame + 100, 15) : 0.3,
            background: `${COLORS.green}08`,
            border: `1px solid ${COLORS.green}20`,
            borderRadius: 8, padding: '8px 12px',
            marginBottom: 6,
          }}>
            <code style={{ fontSize: 9, color: COLORS.green, fontFamily: FONTS.mono, lineHeight: 1.8 }}>
              SELECT * FROM users<br />
              WHERE id = ANY([1,2,3,4,5])
            </code>
          </div>
          <div style={{
            fontSize: 10, color: COLORS.green, fontWeight: 600,
            opacity: showBatched ? fadeIn(frame, startFrame + 130, 15) : 0,
          }}>= 1 query for 5 tasks ✨</div>
        </div>
      </div>
    </div>
  );
};

export const APILayerScene: React.FC = () => {
  const frame = useCurrentFrame();
  const overallFade = frame > 1450 ? 1 - progress(frame, 1450, 1500, ease.inOutCubic) : 1;

  return (
    <div style={{
      width: '100%', height: '100%',
      background: `radial-gradient(ellipse at 50% 20%, #13081c 0%, ${COLORS.bg} 70%)`,
      fontFamily: FONTS.sans, overflow: 'hidden',
      position: 'relative', opacity: overallFade,
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(rgba(232,53,171,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(232,53,171,0.025) 1px, transparent 1px)`,
        backgroundSize: '55px 55px',
      }} />

      <div style={{ display: 'flex', height: '100%' }}>
        {/* Left: Hex diagram */}
        <div style={{ width: '42%', padding: '45px 20px 40px 55px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ opacity: fadeIn(frame, 5, 20) }}>
            <div style={{ fontSize: 12, color: COLORS.graphql, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
              Chapter 9 — API Layer
            </div>
            <div style={{ fontSize: 36, fontWeight: 900, color: COLORS.text, letterSpacing: -1, lineHeight: 1.1 }}>
              Ports & Adapters<br />
              <span style={{ color: COLORS.graphql }}>Architecture</span>
            </div>
            <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 8, lineHeight: 1.6 }}>
              Transport layer is a thin adapter. GraphQL, REST, future CLI —
              all call the same Service layer. Business logic never touches HTTP.
            </div>
          </div>

          <HexDiagram frame={frame} />
        </div>

        {/* Right: Details */}
        <div style={{ width: '58%', padding: '45px 55px 40px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* GraphQL features */}
          <div style={{ opacity: fadeIn(frame, 30, 20) }}>
            <div style={{ fontSize: 13, color: COLORS.textMuted, fontWeight: 600, marginBottom: 12 }}>
              🔮 GraphQL Yoga — What we get
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { icon: '📄', title: 'Relay Pagination', detail: 'Cursor-based (first/after/last/before) on all connections. Consistent across all entities.' },
                { icon: '🎯', title: 'Schema-First', detail: 'schema.graphql is the contract. Resolvers implement it. No accidental API drift.' },
                { icon: '🔋', title: 'DataLoader', detail: 'Batches & caches DB calls per request. Prevents N+1 for nested resolvers.' },
                { icon: '🔐', title: 'Type Safety', detail: 'Generated TypeScript types from schema. End-to-end type safety from HTTP to DB.' },
              ].map((feat, i) => {
                const fOp = fadeIn(frame, 40 + i * 15, 15);
                return (
                  <div key={i} style={{
                    opacity: fOp,
                    background: `${COLORS.graphql}08`,
                    border: `1px solid ${COLORS.graphql}20`,
                    borderRadius: 10, padding: '12px 14px',
                  }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 16 }}>{feat.icon}</span>
                      <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.graphql }}>{feat.title}</div>
                    </div>
                    <div style={{ fontSize: 11, color: COLORS.textMuted, lineHeight: 1.5 }}>{feat.detail}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Route structure */}
          {frame > 250 && (
            <div style={{
              opacity: fadeIn(frame, 250, 20),
              background: COLORS.bgCard,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 14, padding: '16px 20px',
            }}>
              <RouteTree frame={frame} startFrame={260} />
            </div>
          )}

          {/* DataLoader */}
          {frame > 600 && (
            <div style={{
              opacity: fadeIn(frame, 600, 20),
              background: COLORS.bgCard,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 14, padding: '16px 20px',
            }}>
              <DataLoaderViz frame={frame} startFrame={610} />
            </div>
          )}

          {/* Controller responsibility */}
          {frame > 1000 && (
            <div style={{
              opacity: fadeIn(frame, 1000, 20),
              background: `${COLORS.accent}08`,
              border: `1px solid ${COLORS.accent}20`,
              borderRadius: 12, padding: '14px 18px',
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 8 }}>
                ☝️ Controller Single Responsibility
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                {[
                  { label: 'Controller DOES', items: ['Parse request params', 'Validate HTTP input', 'Set HTTP status codes', 'Delegate to Service'], color: COLORS.green },
                  { label: 'Controller NEVER', items: ['Contains business logic', 'Queries the database', 'Knows about Kafka', 'Manages transactions'], color: COLORS.red },
                ].map((side, i) => {
                  const sOp = fadeIn(frame, 1010 + i * 15, 12);
                  return (
                    <div key={i} style={{ opacity: sOp, flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: side.color, marginBottom: 6 }}>{side.label}</div>
                      {side.items.map((item, j) => (
                        <div key={j} style={{
                          display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4,
                        }}>
                          <span style={{ color: side.color, fontSize: 12 }}>{i === 0 ? '✓' : '✗'}</span>
                          <span style={{ fontSize: 11, color: COLORS.textMuted }}>{item}</span>
                        </div>
                      ))}
                    </div>
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
          GraphQL + REST are thin adapters. Controllers translate HTTP into domain commands. Services don't know HTTP exists.
        </div>
      </div>
    </div>
  );
};
