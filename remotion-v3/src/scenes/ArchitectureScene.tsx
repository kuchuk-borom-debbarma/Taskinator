import React from "react";
import { useChapterFrame as useCurrentFrame } from "../ChapterFrameContext";
import { COLORS, FONTS, fadeIn, slideUp, scaleIn, float, ease, progress, stagger } from "../design";

const CHAPTER_LABEL = "Chapter 1 — Architecture";
const SUBTITLE = "Why Modular Monolith over Microservices?";

// Animated module box
const ModuleBox: React.FC<{
  label: string; color: string; icon: string; delay: number; x: number; y: number;
  description: string; frame: number;
}> = ({ label, color, icon, delay, x, y, description, frame }) => {
  const op = stagger(0, frame, delay, 0, 25);
  const sc = scaleIn(frame, delay, 25);
  const f = float(frame + delay, 5, 0.8);

  return (
    <div style={{
      position: 'absolute',
      left: x + '%', top: y + f + '%',
      transform: `translate(-50%, -50%) scale(${sc})`,
      opacity: op,
      width: 180,
    }}>
      <div style={{
        background: `linear-gradient(135deg, ${color}20, ${color}08)`,
        border: `1.5px solid ${color}50`,
        borderRadius: 16,
        padding: '20px 16px',
        textAlign: 'center',
        boxShadow: `0 0 30px ${color}20, inset 0 1px 0 ${color}20`,
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>{icon}</div>
        <div style={{ color: color, fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{label}</div>
        <div style={{ color: COLORS.textDim, fontSize: 11, lineHeight: 1.4 }}>{description}</div>
      </div>
    </div>
  );
};

// Animated connection arrow between modules
const Connection: React.FC<{
  x1: number; y1: number; x2: number; y2: number; color: string; frame: number; startFrame: number; label?: string;
}> = ({ x1, y1, x2, y2, color, frame, startFrame, label }) => {
  const t = progress(frame, startFrame, startFrame + 30, ease.outCubic);
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  return (
    <div style={{
      position: 'absolute',
      left: x1 + '%', top: y1 + '%',
      width: len * t + 'px',
      height: 2,
      background: `linear-gradient(90deg, ${color}80, ${color}30)`,
      transform: `rotate(${angle}deg)`,
      transformOrigin: '0 50%',
      opacity: t,
      boxShadow: `0 0 8px ${color}40`,
    }}>
      {label && t > 0.8 && (
        <div style={{
          position: 'absolute', top: -18, left: '40%',
          fontSize: 11, color: COLORS.textDim,
          background: COLORS.bgCard, padding: '2px 8px', borderRadius: 999,
          border: `1px solid ${COLORS.border}`,
          whiteSpace: 'nowrap',
        }}>{label}</div>
      )}
    </div>
  );
};

// Comparison card
const ComparisonCard: React.FC<{
  title: string; items: string[]; color: string; frame: number; startFrame: number;
  isGood: boolean;
}> = ({ title, items, color, frame, startFrame, isGood }) => {
  const op = fadeIn(frame, startFrame, 20);
  const y = slideUp(frame, startFrame, 25);
  return (
    <div style={{
      opacity: op,
      transform: `translateY(${(1 - y) * 30}px)`,
      background: `linear-gradient(135deg, ${color}12, ${color}04)`,
      border: `1px solid ${color}30`,
      borderRadius: 16,
      padding: '24px 28px',
      flex: 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 20 }}>{isGood ? '✅' : '⚠️'}</span>
        <div style={{ color: color, fontWeight: 700, fontSize: 17 }}>{title}</div>
      </div>
      {items.map((item, i) => {
        const itemOp = fadeIn(frame, startFrame + 8 + i * 6, 15);
        return (
          <div key={i} style={{
            display: 'flex', gap: 10, alignItems: 'flex-start',
            opacity: itemOp, marginBottom: 10,
          }}>
            <span style={{ color: color, marginTop: 2, flexShrink: 0 }}>›</span>
            <span style={{ color: COLORS.textMuted, fontSize: 14, lineHeight: 1.5 }}>{item}</span>
          </div>
        );
      })}
    </div>
  );
};

export const ArchitectureScene: React.FC = () => {
  const frame = useCurrentFrame();
  const overallFade = frame > 1450 ? 1 - progress(frame, 1450, 1500, ease.inOutCubic) : 1;
  const introFade = fadeIn(frame, 0, 30);

  const modules = [
    { label: 'Project', color: COLORS.accent, icon: '📁', delay: 30, x: 50, y: 32, description: 'Project & member management' },
    { label: 'Task', color: COLORS.green, icon: '✅', delay: 55, x: 25, y: 60, description: 'Hierarchical task engine' },
    { label: 'Team', color: COLORS.orange, icon: '👥', delay: 80, x: 75, y: 60, description: 'Team collaboration layer' },
    { label: 'Auth', color: COLORS.purple, icon: '🔐', delay: 105, x: 50, y: 80, description: 'JWT auth & identity' },
  ];

  const showConnections = frame > 120;

  return (
    <div style={{
      width: '100%', height: '100%',
      background: `radial-gradient(ellipse at 30% 40%, #0e1628 0%, ${COLORS.bg} 70%)`,
      fontFamily: FONTS.sans,
      overflow: 'hidden',
      position: 'relative',
      opacity: overallFade,
    }}>
      {/* Background grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px',
      }} />

      <div style={{ display: 'flex', height: '100%' }}>
        {/* Left: Diagram area */}
        <div style={{
          width: '50%', position: 'relative',
          opacity: introFade,
        }}>
          {/* Title */}
          <div style={{
            position: 'absolute', top: 40, left: 60,
            opacity: fadeIn(frame, 5, 20),
          }}>
            <div style={{ fontSize: 13, color: COLORS.accent, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
              {CHAPTER_LABEL}
            </div>
            <div style={{ fontSize: 38, fontWeight: 800, color: COLORS.text, lineHeight: 1.1, letterSpacing: -1 }}>
              Modular Monolith
            </div>
            <div style={{ fontSize: 16, color: COLORS.textMuted, marginTop: 8 }}>
              {SUBTITLE}
            </div>
          </div>

          {/* Module diagram */}
          <div style={{ position: 'absolute', inset: 0, top: 130 }}>
            {/* Center hub label */}
            {frame > 20 && (
              <div style={{
                position: 'absolute',
                left: '50%', top: '32%',
                transform: 'translate(-50%, -60px)',
                opacity: fadeIn(frame, 20, 15),
                background: 'rgba(99,102,241,0.1)',
                border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: 999,
                padding: '4px 14px',
                fontSize: 12, color: COLORS.accent, fontWeight: 600,
                letterSpacing: 1,
              }}>Single Process</div>
            )}

            {modules.map((m, i) => (
              <ModuleBox key={i} {...m} frame={frame} />
            ))}

            {/* Connection lines - SVG */}
            {showConnections && (
              <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                {[
                  { x1: '50%', y1: '43%', x2: '25%', y2: '68%', color: COLORS.accent },
                  { x1: '50%', y1: '43%', x2: '75%', y2: '68%', color: COLORS.accent },
                  { x1: '25%', y1: '72%', x2: '50%', y2: '88%', color: COLORS.green },
                  { x1: '75%', y1: '72%', x2: '50%', y2: '88%', color: COLORS.orange },
                ].map((line, i) => {
                  const t = progress(frame, 120 + i * 15, 150 + i * 15, ease.outCubic);
                  return (
                    <line key={i}
                      x1={line.x1} y1={line.y1}
                      x2={line.x2} y2={line.y2}
                      stroke={line.color}
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                      opacity={0.5 * t}
                    />
                  );
                })}
              </svg>
            )}
          </div>
        </div>

        {/* Right: Comparison + reasoning */}
        <div style={{
          width: '50%',
          padding: '60px 60px 40px 30px',
          display: 'flex', flexDirection: 'column', gap: 20,
        }}>
          <div style={{ opacity: fadeIn(frame, 15, 20), marginBottom: 8 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.text, marginBottom: 4 }}>
              Architecture Decision
            </div>
            <div style={{ fontSize: 14, color: COLORS.textMuted }}>
              Why not microservices from day one?
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <ComparisonCard
              title="Modular Monolith ✓"
              color={COLORS.green}
              frame={frame}
              startFrame={20}
              isGood={true}
              items={[
                "Clear module boundaries in code",
                "Zero network overhead between domains",
                "Simple ops — single deployable",
                "Extract services when pressure appears",
                "Domain model not yet stabilized",
              ]}
            />
            <ComparisonCard
              title="Microservices ✗"
              color={COLORS.red}
              frame={frame}
              startFrame={50}
              isGood={false}
              items={[
                "Distributed overhead before validation",
                "Complex service mesh & discovery",
                "Network latency between every call",
                "Premature optimization trap",
              ]}
            />
          </div>

          {/* Service → Query pattern */}
          {frame > 200 && (
            <div style={{
              opacity: fadeIn(frame, 200, 25),
              transform: `translateY(${(1 - slideUp(frame, 200, 25)) * 20}px)`,
              background: COLORS.bgCard,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 16,
              padding: '20px 24px',
            }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, marginBottom: 12 }}>
                Service → Query Pattern (enforced per module)
              </div>
              <div style={{ display: 'flex', gap: 0, alignItems: 'center' }}>
                {[
                  { label: 'GraphQL\nResolver', color: COLORS.graphql },
                  { label: '→', color: COLORS.textDim, small: true },
                  { label: 'Service\nInterface', color: COLORS.accent },
                  { label: '→', color: COLORS.textDim, small: true },
                  { label: 'Service\nImpl', color: COLORS.cyan },
                  { label: '→', color: COLORS.textDim, small: true },
                  { label: 'Query\nObjects', color: COLORS.green },
                  { label: '→', color: COLORS.textDim, small: true },
                  { label: 'PostgreSQL', color: COLORS.postgres },
                ].map((step, i) => {
                  const sop = fadeIn(frame, 210 + i * 10, 15);
                  if (step.small) return (
                    <div key={i} style={{ color: step.color, fontSize: 20, padding: '0 4px', opacity: sop }}>→</div>
                  );
                  return (
                    <div key={i} style={{
                      opacity: sop,
                      background: `${step.color}15`,
                      border: `1px solid ${step.color}30`,
                      borderRadius: 8,
                      padding: '8px 12px',
                      fontSize: 11, fontWeight: 600,
                      color: step.color,
                      textAlign: 'center',
                      whiteSpace: 'pre-line',
                      lineHeight: 1.3,
                    }}>{step.label}</div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Key insight callout */}
          {frame > 300 && (
            <div style={{
              opacity: fadeIn(frame, 300, 20),
              background: `linear-gradient(135deg, ${COLORS.accent}15, ${COLORS.purple}08)`,
              border: `1px solid ${COLORS.accent}30`,
              borderRadius: 12, padding: '14px 20px',
              display: 'flex', gap: 12, alignItems: 'flex-start',
            }}>
              <div style={{ fontSize: 20, flexShrink: 0 }}>💡</div>
              <div style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.6 }}>
                <strong style={{ color: COLORS.text }}>The key insight:</strong>{" "}
                Adopting microservices before the domain model stabilizes is a premature optimization.
                Real traffic data should dictate <em>where</em> pressure actually is — then extract.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Subtitle bar */}
      <div style={{
        position: 'absolute', bottom: 20, left: '50%',
        transform: 'translateX(-50%)',
        opacity: fadeIn(frame, 30, 20),
      }}>
        <div style={{
          background: 'rgba(0,0,0,0.6)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 999, padding: '8px 24px',
          fontSize: 15, color: COLORS.text,
          textAlign: 'center', maxWidth: 900,
          backdropFilter: 'blur(12px)',
        }}>
          The core domains — Projects, Teams, Tasks, Auth — are well-defined enough to enforce clear boundaries in code.
          Starting here keeps operations simple while preserving the option to extract services later.
        </div>
      </div>
    </div>
  );
};
