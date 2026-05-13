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
   SLIDE 1 — Multi-Instance Isolation
════════════════════════════════════════════════ */
export const MultiInstanceIsolationSlide: React.FC = () => {
	return (
		<Shell>
			<Appear at={5} y={-20}>
				<div style={{ position: 'absolute', top: 40, left: 50 }}>
					<div style={{ fontSize: 12, fontWeight: 900, color: COLORS.accent, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'Inter', marginBottom: 10 }}>HORIZONTAL SCALING</div>
					<h2 style={{ fontSize: 36, fontWeight: 900, color: COLORS.ink, fontFamily: 'Inter', margin: '0 0 8px' }}>Multi-Instance Isolation</h2>
					<p style={{ fontSize: 16, color: COLORS.muted, fontFamily: 'Inter', margin: 0, maxWidth: 800, lineHeight: 1.6 }}>How do 100,000 clients spread across 50 different API servers get the same event instantly?</p>
				</div>
			</Appear>

			{/* Center Redis */}
			<SNode icon="🔴" label="Redis" sub="Shared Pub/Sub" color={COLORS.danger} top={350} left={500} w={180} delay={10} glow />

			{/* Top Layer: Kafka -> API 1 -> Client A */}
			<SNode icon="📨" label="Kafka" color={COLORS.warning} top={200} left={80} w={140} delay={15} />
			<Arrow x1={220} y1={250} x2={340} y2={250} color={COLORS.accent} delay={25} />
			<SNode icon="⚙️" label="API Server 1" sub="Instance A" color={COLORS.accent} top={200} left={340} w={140} delay={20} />
			
			{/* API 1 publishes to Redis */}
			<Arrow x1={480} y1={250} x2={550} y2={350} color={COLORS.danger} delay={35} label="Publish" labelOffset={-20} />
			
			<Arrow x1={480} y1={220} x2={800} y2={220} color={COLORS.success} delay={55} dashed />
			<SNode icon="📱" label="Client A" color={COLORS.success} top={170} left={800} w={140} delay={45} />

			{/* Bottom Layer: Redis -> API 2 -> Client B */}
			<SNode icon="⚙️" label="API Server 2" sub="Instance B" color={COLORS.accent} top={500} left={340} w={140} delay={25} />
			
			{/* Redis broadcasts to API 2 */}
			<Arrow x1={550} y1={440} x2={480} y2={550} color={COLORS.danger} delay={45} label="Broadcast" labelOffset={20} />
			
			<Arrow x1={480} y1={550} x2={800} y2={550} color={COLORS.success} delay={55} dashed />
			<SNode icon="💻" label="Client B" color={COLORS.success} top={500} left={800} w={140} delay={50} />

			{/* Explanation */}
			<Appear at={65} x={0}>
				<div style={{ position: 'absolute', top: 320, left: 750, width: 350, background: 'rgba(0,0,0,0.8)', border: `1px solid ${COLORS.accent}55`, borderRadius: 12, padding: '16px', boxShadow: `0 10px 30px rgba(0,0,0,0.5)` }}>
					<div style={{ fontSize: 13, color: COLORS.ink, fontFamily: 'Inter', lineHeight: 1.6 }}>
						<strong style={{ color: COLORS.accent }}>API 1</strong> gets the Kafka event, but Client B is isolated on <strong style={{ color: COLORS.accent }}>API 2</strong>.
						<br/><br/>
						By publishing to Redis, the event fans out to <strong>all 50 API instances</strong> simultaneously. Redis is the hyper-fast backbone enabling infinite horizontal scale.
					</div>
				</div>
			</Appear>
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
					<h2 style={{ fontSize: 36, fontWeight: 900, color: COLORS.ink, fontFamily: 'Inter', margin: '0 0 8px' }}>Polling vs. Push</h2>
				</div>
			</Appear>

			<div style={{ display: 'flex', gap: 40, marginTop: 140, padding: '0 50px' }}>
				{/* Before Panel */}
				<Appear at={15} y={30} style={{ flex: 1 }}>
					<div style={{ background: 'rgba(15,23,42,0.8)', border: `2px solid ${COLORS.danger}66`, borderRadius: 20, padding: 40, height: 420, boxShadow: `0 20px 40px ${COLORS.danger}22`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
						<div style={{ fontSize: 22, fontWeight: 900, color: COLORS.danger, fontFamily: 'Inter', marginBottom: 30 }}>Before: HTTP Polling</div>
						
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
							<div style={{ fontSize: 32, fontWeight: 900, color: COLORS.danger, fontFamily: 'monospace' }}>98% Waste</div>
							<div style={{ fontSize: 14, color: COLORS.muted }}>High latency, DB overload</div>
						</div>
					</div>
				</Appear>

				{/* After Panel */}
				<Appear at={30} y={30} style={{ flex: 1 }}>
					<div style={{ background: 'rgba(15,23,42,0.8)', border: `2px solid ${COLORS.success}66`, borderRadius: 20, padding: 40, height: 420, boxShadow: `0 20px 40px ${COLORS.success}22`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
						<div style={{ fontSize: 22, fontWeight: 900, color: COLORS.success, fontFamily: 'Inter', marginBottom: 30 }}>After: GraphQL Subscriptions</div>
						
						<div style={{ position: 'relative', width: '100%', height: 200, border: `1px solid ${COLORS.success}33`, borderRadius: 12, overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
							{/* Silence, then one clean ping */}
							<div style={{ fontSize: 48, filter: f % 100 > 80 ? 'drop-shadow(0 0 20px #22c55e)' : 'grayscale(1)', transform: f % 100 > 80 ? 'scale(1.1)' : 'scale(1)', transition: 'all 0.1s' }}>⚡</div>
							{(f % 100 > 80) && (
								<div style={{ position: 'absolute', width: 200, height: 2, background: COLORS.success, left: 200, boxShadow: `0 0 10px ${COLORS.success}` }} />
							)}
						</div>

						<div style={{ marginTop: 'auto', textAlign: 'center' }}>
							<div style={{ fontSize: 32, fontWeight: 900, color: COLORS.success, fontFamily: 'monospace' }}>0% Waste</div>
							<div style={{ fontSize: 14, color: COLORS.muted }}>Instant delivery, idle servers</div>
						</div>
					</div>
				</Appear>
			</div>
		</Shell>
	);
};
