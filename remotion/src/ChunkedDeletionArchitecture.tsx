import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { COLORS, GRADIENTS } from './components/Nodes';

/* ── Helpers ── */
const SP = (f: number, d: number, fps: number) => spring({ frame: f - d, fps, config: { damping: 16, stiffness: 80 } });

/* ── Shell ── */
const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
	<AbsoluteFill style={{ background: GRADIENTS.bg }}>
		<AbsoluteFill style={{ padding: 30 }}>
			<div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'rgba(15,23,42,0.3)', backdropFilter: 'blur(50px)', borderRadius: 30, border: '1.5px solid rgba(255,255,255,0.08)', boxShadow: '0 50px 120px rgba(0,0,0,0.7)' }}>
				{children}
			</div>
		</AbsoluteFill>
	</AbsoluteFill>
);

/* ── Components ── */
const SNode: React.FC<{ icon: string; label: string; sub?: string; color: string; top: number; left: number; w: number; delay: number; glow?: boolean }> = ({ icon, label, sub, color, top, left, w, delay, glow }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const s = SP(f, delay, fps);
	return (
		<div style={{ position: 'absolute', top, left, width: w, opacity: s, transform: `scale(${s}) translateY(${interpolate(s, [0, 1], [10, 0])}px)`, background: 'rgba(15,23,42,0.95)', border: `2px solid ${color}66`, borderRadius: 20, padding: '18px 20px', textAlign: 'center', boxShadow: glow ? `0 0 40px ${color}22` : '0 15px 40px rgba(0,0,0,0.6)', zIndex: 20 }}>
			<div style={{ fontSize: 32 }}>{icon}</div>
			<div style={{ fontSize: 13, fontWeight: 900, color, letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'Inter', marginTop: 8 }}>{label}</div>
			{sub && <div style={{ fontSize: 10, color: COLORS.muted, fontFamily: 'Inter', marginTop: 4, fontWeight: 600, opacity: 0.8 }}>{sub}</div>}
		</div>
	);
};

const Arrow: React.FC<{ x1: number; y1: number; x2: number; y2: number; color: string; label?: string; delay: number; dashed?: boolean; labelOffset?: number; labelPos?: number }> = ({ x1, y1, x2, y2, color, label, delay, dashed, labelOffset = 0, labelPos = 0.5 }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const p = spring({ frame: f - delay, fps, config: { damping: 20, stiffness: 70 } });
	const id = `arrow_${x1}_${y1}_${delay}`;
	const midX = x1 + (x2 - x1) * p;
	const midY = y1 + (y2 - y1) * p;
	
	const lx = x1 + (x2 - x1) * labelPos;
	const ly = y1 + (y2 - y1) * labelPos;
	const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;

	return (
		<>
			<svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none', zIndex: 10 }}>
				<defs>
					<marker id={id} markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
						<path d="M 0 0 L 8 4 L 0 8 z" fill={color} />
					</marker>
				</defs>
				<line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={1} opacity={0.1} strokeDasharray="4 4" />
				<line x1={x1} y1={y1} x2={midX} y2={midY} stroke={color} strokeWidth={3} strokeLinecap="round" markerEnd={p > 0.95 ? `url(#${id})` : undefined} strokeDasharray={dashed ? '10 5' : undefined} style={{ filter: `drop-shadow(0 0 5px ${color}66)` }} />
			</svg>
			{label && (
				<div style={{ 
					position: 'absolute', 
					left: lx, 
					top: ly + labelOffset, 
					opacity: p, 
					transform: `translate(-50%, -50%) rotate(${angle}deg)`, 
					transformOrigin: 'center',
					zIndex: 25 
				}}>
					<div style={{ transform: `rotate(${-angle}deg)`, background: 'rgba(15,23,42,0.95)', border: `1.5px solid ${color}55`, borderRadius: 8, padding: '4px 12px', fontSize: 11, fontWeight: 800, color, fontFamily: 'monospace', whiteSpace: 'nowrap', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}>
						{label}
					</div>
				</div>
			)}
		</>
	);
};

const Appear: React.FC<{ at: number; children: React.ReactNode; y?: number; x?: number; style?: React.CSSProperties }> = ({ at, children, y = 20, x = 0, style }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const s = SP(f, at, fps);
	return (
		<div style={{ opacity: s, transform: `translate(${interpolate(s, [0, 1], [x, 0])}px, ${interpolate(s, [0, 1], [y, 0])}px)`, ...style }}>
			{children}
		</div>
	);
};

/* ════════════════════════════════════════════════
   SLIDE 1 — Self-Signaling Architecture
════════════════════════════════════════════════ */
export const SelfSignalingLoopSlide: React.FC = () => {
	const f = useCurrentFrame();

	return (
		<Shell>
			<Appear at={5} y={-20}>
				<div style={{ position: 'absolute', top: 40, left: 50 }}>
					<div style={{ fontSize: 12, fontWeight: 900, color: COLORS.success, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'Inter', marginBottom: 10 }}>THE SOLUTION</div>
					<h2 style={{ fontSize: 36, fontWeight: 900, color: COLORS.ink, fontFamily: 'Inter', margin: '0 0 8px' }}>Self-Signaling Chunk Loop</h2>
					<p style={{ fontSize: 16, color: COLORS.muted, fontFamily: 'Inter', margin: 0, maxWidth: 800, lineHeight: 1.6 }}>Delete rows in small batches, publish a "continue" event, commit, and repeat.</p>
				</div>
			</Appear>

			{/* Outbox Transaction Boundary */}
			<Appear at={20}>
				<div style={{ position: 'absolute', top: 160, left: 340, width: 500, height: 420, border: `2px dashed ${COLORS.accent3}88`, borderRadius: 30, background: 'rgba(15,23,42,0.4)', zIndex: 1 }} />
				<div style={{ position: 'absolute', top: 175, left: 360, fontSize: 12, fontWeight: 900, color: COLORS.accent3, fontFamily: 'monospace', zIndex: 2 }}>BEGIN TRANSACTION</div>
				<div style={{ position: 'absolute', bottom: 155, left: 360, fontSize: 12, fontWeight: 900, color: COLORS.accent3, fontFamily: 'monospace', zIndex: 2 }}>COMMIT</div>
			</Appear>

			{/* Left Side: Kafka Topic */}
			<SNode icon="📨" label="Kafka Topic" sub="PROJECT_DELETED" color={COLORS.warning} top={310} left={60} w={180} delay={10} />

			{/* Step 1: Consume */}
			<Arrow x1={240} y1={350} x2={400} y2={250} color={COLORS.warning} delay={25} label="1. Consume" labelOffset={-20} />

			{/* Inside Transaction */}
			<SNode icon="🗑️" label="DELETE LIMIT 500" sub="Partial delete" color={COLORS.danger} top={210} left={460} w={240} delay={35} glow />
			
			{/* Arrow down to check */}
			<Arrow x1={580} y1={330} x2={580} y2={370} color={COLORS.accent} delay={45} />

			<SNode icon="📝" label="INSERT outbox_event" sub="Self-signal 'continue'" color={COLORS.accent} top={390} left={460} w={240} delay={50} glow />

			{/* Right Side: Outbox Relay */}
			<SNode icon="⚙️" label="Outbox Relay" color={COLORS.accent2} top={410} left={920} w={180} delay={65} />

			{/* Outbox to Relay */}
			<Arrow x1={700} y1={450} x2={920} y2={450} color={COLORS.accent2} delay={75} dashed label="2. Async Relay" labelOffset={-20} />

			{/* Relay back to Kafka (The Loop) */}
			<Arrow x1={1010} y1={410} x2={1010} y2={100} color={COLORS.accent2} delay={85} dashed />
			<Arrow x1={1010} y1={100} x2={150} y2={100} color={COLORS.accent2} delay={85} dashed />
			<Arrow x1={150} y1={100} x2={150} y2={310} color={COLORS.accent2} delay={85} dashed label="3. Re-publish" labelOffset={-20} />

			{/* Properties Banner */}
			{f >= 100 && (
				<Appear at={100} y={20}>
					<div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 30 }}>
						<div style={{ background: `${COLORS.success}15`, border: `2px solid ${COLORS.success}`, borderRadius: 20, padding: '16px 48px', fontSize: 16, fontWeight: 900, color: COLORS.success, fontFamily: 'Inter', boxShadow: `0 0 50px ${COLORS.success}33`, backdropFilter: 'blur(20px)' }}>
							✓ Table only locked for 500 rows at a time
						</div>
					</div>
				</Appear>
			)}
		</Shell>
	);
};
