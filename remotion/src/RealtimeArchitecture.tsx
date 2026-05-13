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
   SLIDE 1 — Redis Pub/Sub Bridge
════════════════════════════════════════════════ */
export const RedisPubSubSlide: React.FC = () => {
	return (
		<Shell>
			<Appear at={5} y={-20}>
				<div style={{ position: 'absolute', top: 40, left: 50 }}>
					<div style={{ fontSize: 12, fontWeight: 900, color: COLORS.accent2, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'Inter', marginBottom: 10 }}>THE SOLUTION: PUB/SUB BRIDGE</div>
					<h2 style={{ fontSize: 36, fontWeight: 900, color: COLORS.ink, fontFamily: 'Inter', margin: '0 0 8px' }}>Bridging Kafka to Redis</h2>
					<p style={{ fontSize: 16, color: COLORS.muted, fontFamily: 'Inter', margin: 0, maxWidth: 800, lineHeight: 1.6 }}>Redis handles 100k+ concurrent connections effortlessly, completely offloading the DB.</p>
				</div>
			</Appear>

			{/* Nodes */}
			<SNode icon="📨" label="Kafka Topics" sub="Persistent Event Log" color={COLORS.warning} top={300} left={100} w={180} delay={15} />
			<Arrow x1={290} y1={350} x2={450} y2={350} color={COLORS.accent} delay={25} label="Consume" labelOffset={-20} />
			
			<SNode icon="⚙️" label="Kafka Listener" sub="Workspace Service" color={COLORS.accent} top={300} left={450} w={180} delay={30} />
			<Arrow x1={640} y1={350} x2={800} y2={350} color={COLORS.danger} delay={45} label="Publish" labelOffset={-20} />

			<SNode icon="🔴" label="Redis Pub/Sub" sub="In-Memory Message Bus" color={COLORS.danger} top={300} left={800} w={180} delay={40} glow />

			{/* Code snippet appearing below */}
			<Appear at={60} y={20}>
				<div style={{ position: 'absolute', top: 480, left: 420, background: 'rgba(0,0,0,0.8)', border: `1px solid ${COLORS.danger}55`, borderRadius: 12, padding: '16px 24px', fontFamily: 'monospace', fontSize: 14, color: COLORS.ink, boxShadow: `0 10px 30px rgba(0,0,0,0.5)` }}>
					<span style={{ color: COLORS.accent2 }}>getRedisPublisher</span>()
					.<span style={{ color: COLORS.accent }}>publish</span>(
					<span style={{ color: COLORS.success }}>'PROJECT_UPDATED:P1'</span>, 
					payload
					);
				</div>
			</Appear>
		</Shell>
	);
};

/* ════════════════════════════════════════════════
   SLIDE 2 — GraphQL Subscriptions
════════════════════════════════════════════════ */
export const GraphQLSubscriptionSlide: React.FC = () => {
	const f = useCurrentFrame();

	return (
		<Shell>
			<Appear at={5} y={-20}>
				<div style={{ position: 'absolute', top: 40, left: 50 }}>
					<div style={{ fontSize: 12, fontWeight: 900, color: COLORS.success, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'Inter', marginBottom: 10 }}>THE SOLUTION: WEBSOCKETS</div>
					<h2 style={{ fontSize: 36, fontWeight: 900, color: COLORS.ink, fontFamily: 'Inter', margin: '0 0 8px' }}>GraphQL Subscriptions</h2>
					<p style={{ fontSize: 16, color: COLORS.muted, fontFamily: 'Inter', margin: 0, maxWidth: 800, lineHeight: 1.6 }}>Pushing the Redis event down to the specific connected client over WebSockets.</p>
				</div>
			</Appear>

			{/* Nodes */}
			<SNode icon="🔴" label="Redis Pub/Sub" color={COLORS.danger} top={300} left={100} w={180} delay={10} glow />
			<Arrow x1={290} y1={350} x2={450} y2={350} color={COLORS.accent} delay={20} label="Message Event" labelOffset={-20} />

			<SNode icon="⚡" label="GraphQL Yoga" sub="API Layer" color={COLORS.accent} top={300} left={450} w={180} delay={25} />
			<Arrow x1={640} y1={350} x2={800} y2={350} color={COLORS.success} delay={40} dashed label="WebSocket PUSH" labelOffset={-20} />

			<SNode icon="👥" label="100k WebSockets" sub="No Database Impact" color={COLORS.success} top={300} left={800} w={180} delay={35} glow />

			{/* Code snippet */}
			<Appear at={50} y={20}>
				<div style={{ position: 'absolute', top: 480, left: 420, background: 'rgba(0,0,0,0.8)', border: `1px solid ${COLORS.accent}55`, borderRadius: 12, padding: '16px 24px', fontFamily: 'monospace', fontSize: 14, color: COLORS.ink, boxShadow: `0 10px 30px rgba(0,0,0,0.5)` }}>
					<span style={{ color: COLORS.accent2 }}>getRedisSubscriber</span>()
					.<span style={{ color: COLORS.accent }}>on</span>(<span style={{ color: COLORS.success }}>'message'</span>, (channel, msg) =&gt; {'{'} <br/>
					&nbsp;&nbsp;pubSub.<span style={{ color: COLORS.accent }}>publish</span>('PROJECT_UPDATES', msg); <br/>
					{'}'});
				</div>
			</Appear>

			{/* Banner */}
			{f >= 70 && (
				<Appear at={70} y={20}>
					<div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 30 }}>
						<div style={{ background: `${COLORS.success}15`, border: `2px solid ${COLORS.success}`, borderRadius: 20, padding: '16px 48px', fontSize: 16, fontWeight: 900, color: COLORS.success, fontFamily: 'Inter', boxShadow: `0 0 50px ${COLORS.success}33`, backdropFilter: 'blur(20px)' }}>
							✓ Zero wasted polling. Event delivered instantly.
						</div>
					</div>
				</Appear>
			)}
		</Shell>
	);
};
