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

/* ════════════════════════════════════════════════
   SLIDE 1 — Evolution 4: Redis Registry 
════════════════════════════════════════════════ */
export const RedisRegistrySlide: React.FC = () => {
	return (
		<Shell>
			<Appear at={5} y={-20}>
				<div style={{ position: 'absolute', top: 40, left: 50 }}>
					<div style={{ fontSize: 12, fontWeight: 900, color: COLORS.success, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'Inter', marginBottom: 10 }}>EVOLUTION 4: THE FINAL SOLUTION</div>
					<h2 style={{ fontSize: 36, fontWeight: 900, color: COLORS.ink, fontFamily: 'Inter', margin: '0 0 8px' }}>Redis Connection Registry</h2>
					<p style={{ fontSize: 16, color: COLORS.muted, fontFamily: 'Inter', margin: 0, maxWidth: 800, lineHeight: 1.6 }}>When a user connects, the API instance registers exactly where they are connected.</p>
				</div>
			</Appear>

			{/* Nodes */}
			<SNode icon="📱" label="User A" color={COLORS.success} top={300} left={100} w={150} delay={15} />
			<Arrow x1={250} y1={350} x2={450} y2={350} color={COLORS.success} delay={25} label="WebSocket Connect" labelOffset={-20} />
			
			<SNode icon="⚙️" label="API Server 5" color={COLORS.accent} top={300} left={450} w={180} delay={30} />
			<Arrow x1={640} y1={350} x2={800} y2={350} color={COLORS.accent2} delay={45} label="SET user:A => server_5" labelOffset={-20} />

			<SNode icon="🔴" label="Redis" sub="Key-Value Store" color={COLORS.danger} top={300} left={800} w={180} delay={40} glow />

			{/* DB entry visualization */}
			<Appear at={60} y={20}>
				<div style={{ position: 'absolute', top: 450, left: 800, width: 180, background: 'rgba(0,0,0,0.8)', border: `1px solid ${COLORS.danger}55`, borderRadius: 12, padding: '16px', fontFamily: 'monospace', fontSize: 14, color: COLORS.ink, boxShadow: `0 10px 30px rgba(0,0,0,0.5)` }}>
					<div style={{ color: COLORS.muted, fontSize: 10, marginBottom: 8 }}>Redis KV:</div>
					<div><span style={{ color: COLORS.success }}>user_A</span> : <span style={{ color: COLORS.accent }}>server_5</span></div>
				</div>
			</Appear>
		</Shell>
	);
};

/* ════════════════════════════════════════════════
   SLIDE 2 — Targeted Delivery
════════════════════════════════════════════════ */
export const TargetedDeliverySlide: React.FC = () => {
	const f = useCurrentFrame();

	return (
		<Shell>
			<Appear at={5} y={-20}>
				<div style={{ position: 'absolute', top: 40, left: 50 }}>
					<div style={{ fontSize: 12, fontWeight: 900, color: COLORS.success, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'Inter', marginBottom: 10 }}>EVOLUTION 4: THE FINAL SOLUTION</div>
					<h2 style={{ fontSize: 36, fontWeight: 900, color: COLORS.ink, fontFamily: 'Inter', margin: '0 0 8px' }}>Targeted Delivery</h2>
					<p style={{ fontSize: 16, color: COLORS.muted, fontFamily: 'Inter', margin: 0, maxWidth: 800, lineHeight: 1.6 }}>Events are routed exclusively to the required server. No blind broadcasting.</p>
				</div>
			</Appear>

			{/* Nodes */}
			<SNode icon="📨" label="Kafka Event" sub="Target: User A" color={COLORS.warning} top={300} left={50} w={150} delay={10} glow />
			<Arrow x1={200} y1={350} x2={350} y2={350} color={COLORS.warning} delay={20} />

			<SNode icon="🔀" label="Event Router" sub="Listener" color={COLORS.accent} top={300} left={350} w={150} delay={25} />
			
			{/* Lookup */}
			<Arrow x1={425} y1={290} x2={425} y2={180} color={COLORS.danger} delay={35} dashed label="GET user_A" labelPos={0.4} />
			<SNode icon="🔴" label="Redis" sub="Returns: Server 5" color={COLORS.danger} top={60} left={350} w={150} delay={30} />
			<Arrow x1={450} y1={180} x2={450} y2={290} color={COLORS.success} delay={50} dashed />

			{/* Deliver */}
			<Arrow x1={500} y1={350} x2={700} y2={350} color={COLORS.accent2} delay={65} label="Publish to Server 5" />
			<SNode icon="⚙️" label="API Server 5" color={COLORS.accent} top={300} left={700} w={150} delay={60} />
			
			<Arrow x1={850} y1={350} x2={1000} y2={350} color={COLORS.success} delay={80} dashed />
			<SNode icon="📱" label="User A" color={COLORS.success} top={300} left={1000} w={130} delay={75} />

			{/* Banner */}
			{f >= 95 && (
				<Appear at={95} y={20}>
					<div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 30 }}>
						<div style={{ background: `${COLORS.success}15`, border: `2px solid ${COLORS.success}`, borderRadius: 20, padding: '16px 48px', fontSize: 16, fontWeight: 900, color: COLORS.success, fontFamily: 'Inter', boxShadow: `0 0 50px ${COLORS.success}33`, backdropFilter: 'blur(20px)' }}>
							✓ Event bypasses servers 1-49 entirely. Zero wasted bandwidth.
						</div>
					</div>
				</Appear>
			)}
		</Shell>
	);
};
