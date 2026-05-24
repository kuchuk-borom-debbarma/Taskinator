import React from "react";
import { useChapterFrame as useCurrentFrame } from "../ChapterFrameContext";
import { COLORS, FONTS, fadeIn, slideUp, scaleIn, pulse, float, ease, progress, clamp } from "../design";

// Animated glowing orb background
const GlowOrb: React.FC<{ x: number; y: number; color: string; size: number; delay: number }> = ({ x, y, color, size, delay }) => {
  const frame = useCurrentFrame();
  const p = pulse(frame + delay * 30);
  const f = float(frame + delay * 20, 15, 0.7);
  return (
    <div style={{
      position: 'absolute',
      left: x + '%',
      top: y + f + '%',
      width: size + 'px',
      height: size + 'px',
      borderRadius: '50%',
      background: `radial-gradient(circle, ${color}40, transparent 70%)`,
      filter: `blur(${40 + p * 20}px)`,
      opacity: 0.6 + p * 0.3,
      transform: `translate(-50%, -50%) scale(${0.9 + p * 0.2})`,
      pointerEvents: 'none',
    }} />
  );
};

// Animated particle
const Particle: React.FC<{ x: number; y: number; frame: number; delay: number; color: string }> = ({ x, y, frame, delay, color }) => {
  const t = ((frame + delay) % 180) / 180;
  const fy = y - t * 40;
  const opacity = t < 0.2 ? t / 0.2 : t > 0.7 ? (1 - t) / 0.3 : 1;
  return (
    <div style={{
      position: 'absolute',
      left: x + '%',
      top: fy + '%',
      width: 3,
      height: 3,
      borderRadius: '50%',
      background: color,
      opacity: opacity * 0.6,
      boxShadow: `0 0 6px ${color}`,
    }} />
  );
};

export const ColdOpenScene: React.FC = () => {
  const frame = useCurrentFrame();

  // Stagger timing
  const logoScale = scaleIn(frame, 15, 30);
  const logoOp = fadeIn(frame, 15, 20);
  const titleOp = fadeIn(frame, 40, 25);
  const titleY = slideUp(frame, 40, 30);
  const subtitleOp = fadeIn(frame, 65, 25);
  const subtitleY = slideUp(frame, 65, 30);
  const taglineOp = fadeIn(frame, 90, 20);
  const chapterBadgeOp = fadeIn(frame, 110, 20);
  const dividerScale = progress(frame, 55, 80, ease.outExpo);
  const overallFade = frame > 1150 ? 1 - progress(frame, 1150, 1200, ease.inOutCubic) : 1;

  const particles = Array.from({ length: 20 }, (_, i) => ({
    x: (i * 17 + 5) % 100,
    y: 20 + (i * 13) % 60,
    delay: i * 9,
    color: i % 3 === 0 ? COLORS.accent : i % 3 === 1 ? COLORS.cyan : COLORS.purple,
  }));

  return (
    <div style={{
      width: '100%', height: '100%',
      background: `radial-gradient(ellipse at 50% 50%, #0f1729 0%, ${COLORS.bg} 70%)`,
      fontFamily: FONTS.sans,
      overflow: 'hidden',
      position: 'relative',
      opacity: overallFade,
    }}>
      {/* Background grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
        opacity: 0.8,
      }} />

      {/* Glow orbs */}
      <GlowOrb x={20} y={30} color={COLORS.accent} size={600} delay={0} />
      <GlowOrb x={80} y={60} color={COLORS.purple} size={500} delay={1} />
      <GlowOrb x={50} y={80} color={COLORS.cyan} size={400} delay={2} />

      {/* Particles */}
      {particles.map((p, i) => (
        <Particle key={i} x={p.x} y={p.y} frame={frame} delay={p.delay} color={p.color} />
      ))}

      {/* Center content */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 0,
      }}>
        {/* Logo badge */}
        <div style={{
          opacity: logoOp,
          transform: `scale(${logoScale})`,
          marginBottom: 32,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'rgba(99,102,241,0.12)',
            border: '1px solid rgba(99,102,241,0.4)',
            borderRadius: 16,
            padding: '10px 24px',
            boxShadow: '0 0 40px rgba(99,102,241,0.2)',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.purple})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 900, color: 'white',
              boxShadow: `0 0 20px ${COLORS.accent}60`,
            }}>T</div>
            <span style={{ color: COLORS.text, fontWeight: 700, fontSize: 18, letterSpacing: 1 }}>Task-In</span>
          </div>
        </div>

        {/* Main title */}
        <div style={{
          opacity: titleOp,
          transform: `translateY(${(1 - titleY) * 30}px)`,
          textAlign: 'center',
        }}>
          <h1 style={{
            margin: 0,
            fontSize: 80,
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: -2,
            color: 'white',
          }}>
            Designing the{' '}
            <span style={{
              background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.cyan}, ${COLORS.purple})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>Backend</span>
          </h1>
          <h1 style={{
            margin: 0,
            fontSize: 80,
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: -2,
            color: 'white',
          }}>of Task-In</h1>
        </div>

        {/* Divider */}
        <div style={{
          width: `${dividerScale * 400}px`,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${COLORS.accent}, ${COLORS.cyan}, ${COLORS.purple}, transparent)`,
          margin: '28px auto',
          boxShadow: `0 0 20px ${COLORS.accent}60`,
        }} />

        {/* Subtitle */}
        <div style={{
          opacity: subtitleOp,
          transform: `translateY(${(1 - subtitleY) * 20}px)`,
          textAlign: 'center',
        }}>
          <p style={{
            margin: 0, fontSize: 26,
            color: COLORS.textMuted, fontWeight: 400,
            letterSpacing: 0.5,
          }}>
            A deep dive into architecture, performance & engineering decisions
          </p>
        </div>

        {/* Tags */}
        <div style={{
          opacity: taglineOp,
          marginTop: 32,
          display: 'flex', gap: 12,
        }}>
          {['10,000 RPS', 'Kafka', 'PostgreSQL', 'Modular Monolith', 'GraphQL'].map((tag, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 999,
              padding: '6px 16px',
              fontSize: 13,
              color: COLORS.textMuted,
              fontWeight: 500,
            }}>{tag}</div>
          ))}
        </div>

        {/* Chapter badge */}
        <div style={{
          opacity: chapterBadgeOp,
          marginTop: 60,
          fontSize: 14,
          color: COLORS.textDim,
          letterSpacing: 3,
          textTransform: 'uppercase',
          fontWeight: 500,
        }}>
          ▶ Let's build it from the ground up
        </div>
      </div>

      {/* Bottom progress bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 3,
        background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.cyan})`,
        width: `${(frame / 1200) * 100}%`,
        boxShadow: `0 0 10px ${COLORS.accent}`,
      }} />
    </div>
  );
};
