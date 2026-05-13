import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Sequence } from 'remotion';
import { COLORS, GRADIENTS } from './components/Nodes';
import { TitleCard } from './components/TitleCard';

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
   SLIDE 0 — Title
════════════════════════════════════════════════ */
export const TitleSlide: React.FC = () => {
	return <TitleCard title="The Complete Architecture" />;
};

/* ════════════════════════════════════════════════
   SLIDE 1 — System Overview
════════════════════════════════════════════════ */
export const SystemOverviewSlide: React.FC = () => {
	const f = useCurrentFrame();

	return (
		<Shell>
			<Appear at={5} y={-20}>
				<div style={{ position: 'absolute', top: 40, left: 50 }}>
					<div style={{ fontSize: 12, fontWeight: 900, color: COLORS.accent, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'Inter', marginBottom: 10 }}>BIG PICTURE</div>
					<h2 style={{ fontSize: 36, fontWeight: 900, color: COLORS.ink, fontFamily: 'Inter', margin: '0 0 8px' }}>Taskinator Unified System</h2>
					<p style={{ fontSize: 16, color: COLORS.muted, fontFamily: 'Inter', margin: 0, maxWidth: 800, lineHeight: 1.6 }}>All components working together to deliver high-throughput, low-latency task orchestration.</p>
				</div>
			</Appear>

			{/* Scale down to fit everything */}
			<div style={{ transform: `scale(${interpolate(f, [10, 40], [1.1, 0.85], { extrapolateRight: 'clamp' })})`, transformOrigin: 'center top', width: '100%', height: '100%', position: 'absolute', top: 120 }}>
				{/* Client Layer */}
				<SNode icon="📱" label="Clients" sub="Web / Mobile" color={COLORS.ink} top={200} left={50} w={150} delay={15} />

				{/* API Layer */}
				<SNode icon="⚙️" label="API Layer" sub="50 Instances" color={COLORS.accent} top={200} left={350} w={160} delay={20} />
				<Arrow x1={200} y1={250} x2={350} y2={250} color={COLORS.muted} delay={25} />

				{/* Data Layer */}
				<SNode icon="🗄️" label="PostgreSQL" sub="Primary Data" color={COLORS.danger} top={50} left={650} w={160} delay={30} />
				<Arrow x1={510} y1={230} x2={650} y2={100} color={COLORS.danger} delay={35} dashed />

				{/* Outbox / Relay */}
				<SNode icon="📦" label="Outbox Relay" sub="CDC" color={COLORS.warning} top={200} left={650} w={160} delay={40} />
				<Arrow x1={510} y1={250} x2={650} y2={250} color={COLORS.warning} delay={45} />

				{/* Message Bus */}
				<SNode icon="📨" label="Kafka Cluster" sub="Event Bus" color={COLORS.warning} top={200} left={950} w={180} delay={50} glow />
				<Arrow x1={810} y1={250} x2={950} y2={250} color={COLORS.warning} delay={55} />

				{/* Worker Layer */}
				<SNode icon="🧠" label="Smart Aggregator" sub="Batching" color={COLORS.accent2} top={400} left={700} w={180} delay={60} />
				<Arrow x1={1040} y1={300} x2={880} y2={450} color={COLORS.warning} delay={65} dashed />
				<Arrow x1={880} y1={450} x2={1040} y2={300} color={COLORS.accent2} delay={70} dashed label="Publish Grouped" />

				<SNode icon="🗑️" label="Chunk Deletion" sub="Worker" color={COLORS.muted} top={550} left={700} w={180} delay={75} />
				<Arrow x1={1040} y1={300} x2={880} y2={600} color={COLORS.warning} delay={80} dashed />

				{/* Realtime Routing */}
				<SNode icon="🔀" label="Event Router" sub="WebSocket Push" color={COLORS.success} top={400} left={350} w={160} delay={85} />
				<Arrow x1={950} y1={280} x2={510} y2={450} color={COLORS.warning} delay={90} dashed />
				
				<SNode icon="🔴" label="Redis" sub="Registry" color={COLORS.danger} top={550} left={350} w={160} delay={95} />
				<Arrow x1={430} y1={500} x2={430} y2={550} color={COLORS.danger} delay={100} dashed />
				<Arrow x1={430} y1={400} x2={430} y2={300} color={COLORS.success} delay={105} />
			</div>
		</Shell>
	);
};

/* ════════════════════════════════════════════════
   SLIDE 2 — Full Event Trace
════════════════════════════════════════════════ */
export const FullFlowSlide: React.FC = () => {
	const f = useCurrentFrame();

	return (
		<Shell>
			<Appear at={5} y={-20}>
				<div style={{ position: 'absolute', top: 40, left: 50 }}>
					<div style={{ fontSize: 12, fontWeight: 900, color: COLORS.accent, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'Inter', marginBottom: 10 }}>THE TRACE</div>
					<h2 style={{ fontSize: 36, fontWeight: 900, color: COLORS.ink, fontFamily: 'Inter', margin: '0 0 8px' }}>Lifecycle of an Update</h2>
					<p style={{ fontSize: 16, color: COLORS.muted, fontFamily: 'Inter', margin: 0, maxWidth: 800, lineHeight: 1.6 }}>Tracing a single task update entirely through the unified architecture.</p>
				</div>
			</Appear>

			<div style={{ transform: 'scale(0.85)', transformOrigin: 'center top', width: '100%', height: '100%', position: 'absolute', top: 120 }}>
				{/* Static Architecture Background (already visible) */}
				<SNode icon="📱" label="Clients" sub="Web / Mobile" color={COLORS.ink} top={200} left={50} w={150} delay={0} opacity={0.6} />
				<SNode icon="⚙️" label="API Layer" sub="50 Instances" color={COLORS.accent} top={200} left={350} w={160} delay={0} opacity={0.6} />
				<SNode icon="🗄️" label="PostgreSQL" sub="Primary Data" color={COLORS.danger} top={50} left={650} w={160} delay={0} opacity={0.6} />
				<SNode icon="📦" label="Outbox Relay" sub="CDC" color={COLORS.warning} top={200} left={650} w={160} delay={0} opacity={0.6} />
				<SNode icon="📨" label="Kafka Cluster" sub="Event Bus" color={COLORS.warning} top={200} left={950} w={180} delay={0} opacity={0.6} />
				<SNode icon="🧠" label="Smart Aggregator" sub="Batching" color={COLORS.accent2} top={400} left={700} w={180} delay={0} opacity={0.6} />
				<SNode icon="🔀" label="Event Router" sub="WebSocket Push" color={COLORS.success} top={400} left={350} w={160} delay={0} opacity={0.6} />
				<SNode icon="🔴" label="Redis" sub="Registry" color={COLORS.danger} top={550} left={350} w={160} delay={0} opacity={0.6} />

				{/* 1. Client to API */}
				<Arrow x1={200} y1={250} x2={350} y2={250} color={COLORS.ink} delay={20} label="1. POST /update" labelOffset={-20} />
				{f > 30 && f < 50 && <div style={{ position: 'absolute', top: 200, left: 350, width: 160, height: 95, borderRadius: 20, boxShadow: `0 0 50px ${COLORS.ink}`, pointerEvents: 'none' }} />}

				{/* 2. API to DB/Outbox */}
				<Arrow x1={510} y1={230} x2={650} y2={100} color={COLORS.danger} delay={60} label="2. Atomic Write" labelOffset={-30} />
				<Arrow x1={510} y1={250} x2={650} y2={250} color={COLORS.warning} delay={60} />
				{f > 70 && f < 90 && <div style={{ position: 'absolute', top: 50, left: 650, width: 160, height: 95, borderRadius: 20, boxShadow: `0 0 50px ${COLORS.danger}`, pointerEvents: 'none' }} />}

				{/* 3. Relay to Kafka */}
				<Arrow x1={810} y1={250} x2={950} y2={250} color={COLORS.warning} delay={100} label="3. Publish RAW" labelOffset={-20} />
				{f > 110 && f < 130 && <div style={{ position: 'absolute', top: 200, left: 950, width: 180, height: 95, borderRadius: 20, boxShadow: `0 0 50px ${COLORS.warning}`, pointerEvents: 'none' }} />}

				{/* 4. Aggregator */}
				<Arrow x1={1040} y1={300} x2={880} y2={450} color={COLORS.warning} delay={140} dashed label="4. Consume" />
				{f > 150 && f < 200 && <div style={{ position: 'absolute', top: 400, left: 700, width: 180, height: 95, borderRadius: 20, boxShadow: `0 0 50px ${COLORS.accent2}`, pointerEvents: 'none' }} />}
				<Arrow x1={880} y1={450} x2={1040} y2={300} color={COLORS.accent2} delay={190} dashed label="5. Republish GROUPED" labelOffset={20} />
				{f > 200 && f < 220 && <div style={{ position: 'absolute', top: 200, left: 950, width: 180, height: 95, borderRadius: 20, boxShadow: `0 0 50px ${COLORS.accent2}`, pointerEvents: 'none' }} />}

				{/* 5. Router */}
				<Arrow x1={950} y1={280} x2={510} y2={450} color={COLORS.accent2} delay={230} dashed label="6. Consume GROUPED" />
				{f > 240 && f < 310 && <div style={{ position: 'absolute', top: 400, left: 350, width: 160, height: 95, borderRadius: 20, boxShadow: `0 0 50px ${COLORS.success}`, pointerEvents: 'none' }} />}
				
				{/* 6. Redis */}
				<Arrow x1={430} y1={500} x2={430} y2={550} color={COLORS.danger} delay={260} dashed label="7. Where is Client?" labelOffset={-20} />
				<Arrow x1={400} y1={550} x2={400} y2={500} color={COLORS.success} delay={280} dashed />
				
				{/* 7. Push to API -> WebSocket */}
				<Arrow x1={430} y1={400} x2={430} y2={300} color={COLORS.success} delay={310} label="8. Target Server 5" labelOffset={20} />
				{f > 320 && f < 340 && <div style={{ position: 'absolute', top: 200, left: 350, width: 160, height: 95, borderRadius: 20, boxShadow: `0 0 50px ${COLORS.success}`, pointerEvents: 'none' }} />}
				
				<Arrow x1={350} y1={280} x2={200} y2={280} color={COLORS.success} delay={340} dashed label="9. Push WebSocket" labelOffset={-20} />
				{f > 350 && <div style={{ position: 'absolute', top: 200, left: 50, width: 150, height: 95, borderRadius: 20, boxShadow: `0 0 50px ${COLORS.success}`, pointerEvents: 'none' }} />}

				{/* Banner */}
				{f >= 380 && (
					<Appear at={380} y={20}>
						<div style={{ position: 'absolute', bottom: -50, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 30 }}>
							<div style={{ background: `${COLORS.success}15`, border: `2px solid ${COLORS.success}`, borderRadius: 20, padding: '16px 48px', fontSize: 20, fontWeight: 900, color: COLORS.success, fontFamily: 'Inter', boxShadow: `0 0 50px ${COLORS.success}33`, backdropFilter: 'blur(20px)' }}>
								✓ End-to-end delivery with 0% dropped data and 100% horizontal scalability.
							</div>
						</div>
					</Appear>
				)}
			</div>
		</Shell>
	);
};

/* ════════════════════════════════════════════════
   MAIN COMPOSITION
════════════════════════════════════════════════ */
export const FinalArchitecture: React.FC = () => {
	const { fps } = useVideoConfig();
	
	return (
		<AbsoluteFill style={{ background: GRADIENTS.bg }}>
			<Sequence from={0}            durationInFrames={fps * 3}>   <TitleSlide />          </Sequence>
			<Sequence from={fps * 3}      durationInFrames={fps * 10}>  <SystemOverviewSlide /> </Sequence>
			<Sequence from={fps * 13}>                                  <FullFlowSlide />       </Sequence>
		</AbsoluteFill>
	);
};
