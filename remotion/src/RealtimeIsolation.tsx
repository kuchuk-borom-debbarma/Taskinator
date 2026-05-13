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

const Appear: React.FC<{ at: number; children: React.ReactNode; y?: number; x?: number; style?: React.CSSProperties }> = ({ at, children, y = 20, x = 0, style }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const s = SP(f, at, fps);
	return (
		<div style={{ opacity: s, transform: `translate(${interpolate(s, [0, 1], [x, 0])}px, ${interpolate(s, [0, 1], [y, 0])}px)`, ...style }}>
			{children}
		</div>
	);
};

const SNode: React.FC<{ icon: string; label: string; sub?: string; color: string; top: number; left: number; w: number; delay: number; glow?: boolean; opacity?: number }> = ({ icon, label, sub, color, top, left, w, delay, glow, opacity = 1 }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const s = SP(f, delay, fps);
	return (
		<div style={{ position: 'absolute', top, left, width: w, opacity: s * opacity, transform: `scale(${s}) translateY(${interpolate(s, [0, 1], [10, 0])}px)`, background: 'rgba(15,23,42,0.95)', border: `2px solid ${color}66`, borderRadius: 20, padding: '18px 20px', textAlign: 'center', boxShadow: glow ? `0 0 40px ${color}22` : '0 15px 40px rgba(0,0,0,0.6)', zIndex: 20 }}>
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

/* ════════════════════════════════════════════════
   SLIDE 1 — Offline Efficiency
════════════════════════════════════════════════ */
export const OfflineEfficiencySlide: React.FC = () => {
	const f = useCurrentFrame();

	return (
		<Shell>
			<Appear at={5} y={-20}>
				<div style={{ position: 'absolute', top: 40, left: 50 }}>
					<div style={{ fontSize: 12, fontWeight: 900, color: COLORS.accent, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'Inter', marginBottom: 10 }}>THE ULTIMATE BENEFIT</div>
					<h2 style={{ fontSize: 36, fontWeight: 900, color: COLORS.ink, fontFamily: 'Inter', margin: '0 0 8px' }}>Offline Efficiency</h2>
					<p style={{ fontSize: 16, color: COLORS.muted, fontFamily: 'Inter', margin: 0, maxWidth: 800, lineHeight: 1.6 }}>If the user is not connected, the event is immediately dropped. No API servers are bothered.</p>
				</div>
			</Appear>

			{/* Nodes */}
			<SNode icon="📨" label="Kafka Event" sub="Target: User B" color={COLORS.warning} top={300} left={50} w={150} delay={10} />
			<Arrow x1={200} y1={350} x2={350} y2={350} color={COLORS.warning} delay={20} />

			<SNode icon="🔀" label="Event Router" sub="Listener" color={COLORS.accent} top={300} left={350} w={150} delay={25} />
			
			{/* Lookup */}
			<Arrow x1={425} y1={290} x2={425} y2={180} color={COLORS.danger} delay={35} dashed label="GET user_B" labelPos={0.4} />
			<SNode icon="🔴" label="Redis" sub="Returns: NULL" color={COLORS.danger} top={60} left={350} w={150} delay={30} />
			<Arrow x1={450} y1={180} x2={450} y2={290} color={COLORS.danger} delay={50} dashed />

			{/* Dropped Action */}
			{f >= 70 && (
				<Appear at={70} x={20}>
					<div style={{ position: 'absolute', top: 320, left: 550, background: 'rgba(0,0,0,0.8)', border: `2px solid ${COLORS.danger}`, borderRadius: 12, padding: '16px 24px', fontFamily: 'monospace', fontSize: 18, fontWeight: 900, color: COLORS.danger, boxShadow: `0 10px 30px rgba(0,0,0,0.5)` }}>
						🚫 Event Dropped.
						<div style={{ fontSize: 12, color: COLORS.muted, fontWeight: 'normal', marginTop: 8 }}>0 bytes sent to API layer.</div>
					</div>
				</Appear>
			)}

			<SNode icon="⚙️" label="API Instances" sub="Idle / Asleep" color={COLORS.muted} top={300} left={850} w={150} delay={15} opacity={0.5} />
		</Shell>
	);
};

/* ════════════════════════════════════════════════
   SLIDE 2 — Before/After Comparison
════════════════════════════════════════════════ */
export const BeforeAfterComparisonSlide: React.FC = () => {
	const f = useCurrentFrame();

	return (
		<Shell>
			<Appear at={5} y={-20}>
				<div style={{ position: 'absolute', top: 40, left: 50 }}>
					<div style={{ fontSize: 12, fontWeight: 900, color: COLORS.success, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'Inter', marginBottom: 10 }}>THE VERDICT</div>
					<h2 style={{ fontSize: 36, fontWeight: 900, color: COLORS.ink, fontFamily: 'Inter', margin: '0 0 8px' }}>Broadcast vs. Directed Pub/Sub</h2>
				</div>
			</Appear>

			<div style={{ display: 'flex', gap: 40, marginTop: 140, padding: '0 50px' }}>
				{/* Before Panel */}
				<Appear at={15} y={30} style={{ flex: 1 }}>
					<div style={{ background: 'rgba(15,23,42,0.8)', border: `2px solid ${COLORS.danger}66`, borderRadius: 20, padding: 40, height: 420, boxShadow: `0 20px 40px ${COLORS.danger}22`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
						<div style={{ fontSize: 22, fontWeight: 900, color: COLORS.danger, fontFamily: 'Inter', marginBottom: 30 }}>Naive WebSocket Broadcast</div>
						
						<div style={{ position: 'relative', width: '100%', height: 200, border: `1px solid ${COLORS.danger}33`, borderRadius: 12, overflow: 'hidden' }}>
							{/* Simulated chaos */}
							{Array.from({ length: 40 }).map((_, i) => (
								<div key={i} style={{ 
									position: 'absolute', 
									top: Math.random() * 180, 
									left: (f * (Math.random() * 5 + 2) + i * 20) % 400 - 50,
									width: 30, height: 2, background: COLORS.danger, opacity: Math.random() * 0.5 
								}} />
							))}
							<div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: 48 }}>💥</div>
						</div>

						<div style={{ marginTop: 'auto', textAlign: 'center' }}>
							<div style={{ fontSize: 20, fontWeight: 900, color: COLORS.danger, fontFamily: 'monospace' }}>50 APIs process the event.</div>
							<div style={{ fontSize: 14, color: COLORS.muted }}>49 waste CPU checking lists.</div>
						</div>
					</div>
				</Appear>

				{/* After Panel */}
				<Appear at={30} y={30} style={{ flex: 1 }}>
					<div style={{ background: 'rgba(15,23,42,0.8)', border: `2px solid ${COLORS.success}66`, borderRadius: 20, padding: 40, height: 420, boxShadow: `0 20px 40px ${COLORS.success}22`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
						<div style={{ fontSize: 22, fontWeight: 900, color: COLORS.success, fontFamily: 'Inter', marginBottom: 30 }}>Redis Registry Routing</div>
						
						<div style={{ position: 'relative', width: '100%', height: 200, border: `1px solid ${COLORS.success}33`, borderRadius: 12, overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
							{/* Silence, then one clean ping */}
							<div style={{ fontSize: 48, filter: f % 100 > 80 ? 'drop-shadow(0 0 20px #22c55e)' : 'grayscale(1)', transform: f % 100 > 80 ? 'scale(1.1)' : 'scale(1)', transition: 'all 0.1s' }}>🎯</div>
							{(f % 100 > 80) && (
								<div style={{ position: 'absolute', width: 200, height: 4, background: COLORS.success, left: 200, boxShadow: `0 0 10px ${COLORS.success}` }} />
							)}
						</div>

						<div style={{ marginTop: 'auto', textAlign: 'center' }}>
							<div style={{ fontSize: 20, fontWeight: 900, color: COLORS.success, fontFamily: 'monospace' }}>1 API processes the event.</div>
							<div style={{ fontSize: 14, color: COLORS.muted }}>Or 0 if the user is offline.</div>
						</div>
					</div>
				</Appear>
			</div>
		</Shell>
	);
};
