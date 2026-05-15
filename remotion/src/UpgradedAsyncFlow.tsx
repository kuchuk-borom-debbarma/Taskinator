import React from 'react';
import { AbsoluteFill, useVideoConfig, useCurrentFrame, spring, interpolate, Sequence, Easing } from 'remotion';
import { COLORS, GRADIENTS } from './components/Nodes';
import { TitleCard } from './components/TitleCard';

const fr = (s: number, fps: number) => fps * s;
const sp = (f: number, delay: number, fps: number) =>
	spring({ frame: f - delay, fps, config: { damping: 14, stiffness: 110 } });

/* ── Glass card shell ── */
const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
	<AbsoluteFill style={{ background: GRADIENTS.bg }}>
		<AbsoluteFill style={{ padding: 20 }}>
			<div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'rgba(30,41,59,0.18)', backdropFilter: 'blur(30px)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 30px 80px rgba(0,0,0,0.55)' }}>
				{children}
			</div>
		</AbsoluteFill>
	</AbsoluteFill>
);

/* ── Header ── */
const Header: React.FC<{ tag: string; tagColor: string; title: string; sub: string; delay?: number }> = ({ tag, tagColor, title, sub, delay = 1.5 }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const s = sp(f, fr(delay, fps), fps);
	return (
		<div style={{ position: 'absolute', top: 26, left: 32, right: 400, opacity: s, transform: `translateY(${interpolate(s, [0, 1], [-12, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) })}px)` }}>
			<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
				<div style={{ width: 7, height: 7, borderRadius: '50%', background: tagColor, boxShadow: `0 0 8px ${tagColor}` }} />
				<span style={{ fontSize: 10, fontWeight: 800, color: tagColor, fontFamily: 'Inter', textTransform: 'uppercase', letterSpacing: 1.5 }}>{tag}</span>
			</div>
			<h2 style={{ fontSize: 24, fontWeight: 900, color: COLORS.ink, fontFamily: 'Inter', margin: '0 0 4px' }}>{title}</h2>
			<p style={{ fontSize: 12, color: COLORS.muted, fontFamily: 'Inter', margin: 0, lineHeight: 1.5 }}>{sub}</p>
		</div>
	);
};

/* ── System node ── */
const SNode: React.FC<{ icon: string; label: string; sub?: string; color: string; top: number; left: number; width?: number; delay: number; glow?: boolean }> = ({ icon, label, sub, color, top, left, width = 150, delay, glow }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const s = sp(f, delay, fps);
	const pulse = glow ? interpolate(Math.sin(f * 0.15), [-1, 1], [0, 1]) : 0;
	return (
		<div style={{ position: 'absolute', top, left, width, opacity: s, transform: `scale(${s})`, background: 'rgba(15,23,42,0.88)', border: `1.5px solid ${color}${glow ? 'cc' : '55'}`, borderRadius: 14, backdropFilter: 'blur(12px)', boxShadow: `0 8px 24px rgba(0,0,0,0.5)${glow ? `, 0 0 ${20 + 14 * pulse}px ${color}55` : ''}`, padding: '14px 16px', textAlign: 'center', zIndex: 30 }}>
			<div style={{ fontSize: 24 }}>{icon}</div>
			<div style={{ fontSize: 11, fontWeight: 800, color, letterSpacing: '1px', fontFamily: 'Inter', marginTop: 5 }}>{label}</div>
			{sub && <div style={{ fontSize: 9, color: COLORS.muted, fontFamily: 'Inter', marginTop: 2 }}>{sub}</div>}
		</div>
	);
};

/* ── Horizontal arrow ── */
const HArrow: React.FC<{ x1: number; x2: number; y: number; color: string; label?: string; labelBelow?: boolean; delay: number; dashed?: boolean; duration?: number }> = ({ x1, x2, y, color, label, labelBelow, delay, dashed, duration }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const rtl = x2 < x1;
	const p  = spring({ frame: f - delay, fps, config: { damping: 16, stiffness: 100 } });
	const lp = spring({ frame: f - delay - 4, fps, config: { damping: 14 } });
	const tip = rtl ? x1 + (x2 - x1) * p : x1 + (x2 - x1) * p;
	const id = `h${x1}${y}${delay}`;
	
	const fadeOut = duration ? interpolate(f, [delay + duration - 10, delay + duration], [1, 0], { extrapolateRight: 'clamp' }) : 1;

	return (
		<div style={{ opacity: fadeOut }}>
			<svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none', zIndex: 10 }}>
				<defs><marker id={id} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M 0 0 L 6 3 L 0 6 z" fill={color} /></marker></defs>
				<line x1={rtl ? x2 : x1} y1={y} x2={rtl ? x1 : x2} y2={y} stroke={color} strokeWidth={1} opacity={0.1} strokeDasharray={dashed ? '5 4' : '4 3'} />
				<line x1={x1} y1={y} x2={tip} y2={y} stroke={color} strokeWidth={2} strokeLinecap="round" markerEnd={p > 0.85 ? `url(#${id})` : undefined} strokeDasharray={dashed ? '8 4' : undefined} style={{ filter: `drop-shadow(0 0 3px ${color}66)` }} />
			</svg>
			{label && <div style={{ position: 'absolute', left: Math.min(x1, x2) + 8, top: labelBelow ? y + 8 : y - 26, opacity: lp, fontSize: 10, fontWeight: 700, color, fontFamily: 'monospace', background: 'rgba(15,23,42,0.88)', border: `1px solid ${color}44`, borderRadius: 6, padding: '3px 8px', whiteSpace: 'nowrap', zIndex: 20 }}>{label}</div>}
		</div>
	);
};

/* ── Vertical arrow ── */
const VArrow: React.FC<{ x: number; y1: number; y2: number; color: string; label?: string; labelLeft?: boolean; delay: number; dashed?: boolean; duration?: number }> = ({ x, y1, y2, color, label, labelLeft, delay, dashed, duration }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const down = y2 > y1;
	const p  = spring({ frame: f - delay, fps, config: { damping: 16, stiffness: 100 } });
	const lp = spring({ frame: f - delay - 4, fps, config: { damping: 14 } });
	const tip = y1 + (y2 - y1) * p;
	const id = `v${x}${y1}${delay}`;
	
	const fadeOut = duration ? interpolate(f, [delay + duration - 10, delay + duration], [1, 0], { extrapolateRight: 'clamp' }) : 1;

	return (
		<div style={{ opacity: fadeOut }}>
			<svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none', zIndex: 10 }}>
				<defs><marker id={id} markerWidth="6" markerHeight="6" refX="3" refY={down ? 5 : 1} orient={down ? '90' : '270'}><path d="M 0 0 L 6 3 L 0 6 z" fill={color} /></marker></defs>
				<line x1={x} y1={y1} x2={x} y2={y2} stroke={color} strokeWidth={1} opacity={0.1} strokeDasharray={dashed ? '5 4' : '4 3'} />
				<line x1={x} y1={y1} x2={x} y2={tip} stroke={color} strokeWidth={2} strokeLinecap="round" markerEnd={p > 0.85 ? `url(#${id})` : undefined} strokeDasharray={dashed ? '8 4' : undefined} style={{ filter: `drop-shadow(0 0 3px ${color}66)` }} />
			</svg>
			{label && <div style={{ position: 'absolute', left: labelLeft ? x - 130 : x + 8, top: (y1 + y2) / 2 - 10, opacity: lp, fontSize: 10, fontWeight: 700, color, fontFamily: 'monospace', background: 'rgba(15,23,42,0.88)', border: `1px solid ${color}44`, borderRadius: 6, padding: '3px 8px', whiteSpace: 'nowrap', zIndex: 20 }}>{label}</div>}
		</div>
	);
};

/* ── Step item (right panel) ── */
const StepItem: React.FC<{ num: number; label: string; sub: string; color: string; badge: string; delay: number }> = ({ num, label, sub, color, badge, delay }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const s = sp(f, delay, fps);
	return (
		<div style={{ opacity: s, transform: `translateX(${interpolate(s, [0, 1], [20, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) })}px)`, display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
			<div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: '#000' }}>{num}</div>
			<div style={{ flex: 1, background: `${color}0d`, border: `1px solid ${color}33`, borderLeft: `3px solid ${color}`, borderRadius: 8, padding: '7px 10px' }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
					<div style={{ fontSize: 11, fontWeight: 700, color, fontFamily: 'Inter' }}>{label}</div>
					<div style={{ fontSize: 8, fontWeight: 900, color: color, background: `${color}22`, border: `1px solid ${color}66`, borderRadius: 4, padding: '1px 5px', letterSpacing: 0.5 }}>{badge}</div>
				</div>
				<div style={{ fontSize: 10, color: COLORS.muted, fontFamily: 'monospace' }}>{sub}</div>
			</div>
		</div>
	);
};

/* ── Banner ── */
const Banner: React.FC<{ text: string; color: string; delay: number }> = ({ text, color, delay }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const s = sp(f, delay, fps);
	return (
		<div style={{ position: 'absolute', bottom: 22, left: 32, right: 32, opacity: s, transform: `translateY(${interpolate(s, [0, 1], [20, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.175, 0.885, 0.32, 1.275) })}px)`, display: 'flex', justifyContent: 'center', zIndex: 30 }}>
			<div style={{ background: `${color}12`, border: `2px solid ${color}`, borderRadius: 12, padding: '11px 28px', fontSize: 13, fontWeight: 800, color, fontFamily: 'Inter', boxShadow: `0 0 28px ${color}44`, backdropFilter: 'blur(10px)' }}>{text}</div>
		</div>
	);
};

/* ════════════════════════════════════════════════════════
   FINAL ARCHITECTURE SLIDE
════════════════════════════════════════════════════════ */
// Node positions for Circular Flow
const N = {
	client:   { left: 32,  top: 180, w: 140, cx: 102 },
	api:      { left: 260, top: 180, w: 150, cx: 335 },
	db:       { left: 520, top: 180, w: 160, cx: 600 },
	relay:    { left: 800, top: 180, w: 150, cx: 875 },
	kafka:    { left: 800, top: 400, w: 150, cx: 875 },
	listener: { left: 520, top: 400, w: 160, cx: 600 },
};

export const UpgradedAsyncFlowSlide: React.FC = () => {
	const { fps } = useVideoConfig();
	const D = (s: number) => fr(s, fps);

	return (
		<Shell>
			<Header 
				tag="Phase 3 · Evolution" 
				tagColor={COLORS.success} 
				title="The Durable Architecture" 
				sub="Combining the Transactional Outbox and Idempotent Consumer patterns to achieve guaranteed Exactly-Once processing without distributed transactions." 
			/>

			{/* Nodes */}
			<SNode icon="📱" label="Client"     color={COLORS.accent}  top={N.client.top}   left={N.client.left}   width={N.client.w}   delay={D(1)} />
			<SNode icon="⚙️" label="API Server" color={COLORS.success} top={N.api.top}      left={N.api.left}      width={N.api.w}      delay={D(1.5)} />
			<SNode icon="🗄️" label="PostgreSQL" sub="Domain + Outbox" color={COLORS.accent3} top={N.db.top}       left={N.db.left}       width={N.db.w}       delay={D(2)} glow />
			
			<SNode icon="📡" label="Relay Worker" sub="SELECT SKIP LOCKED" color={COLORS.accent} top={N.relay.top} left={N.relay.left} width={N.relay.w} delay={D(2.5)} />
			<SNode icon="⚡" label="Kafka Broker" sub="topic: events" color={COLORS.warning} top={N.kafka.top} left={N.kafka.left} width={N.kafka.w} delay={D(3)} />
			<SNode icon="🎧" label="Consumer Pod" sub="Idempotent Update" color={COLORS.accent2} top={N.listener.top} left={N.listener.left} width={N.listener.w} delay={D(3.5)} />

			{/* ── Path 1: Client -> API ── */}
			<HArrow x1={N.client.cx + N.client.w/2} x2={N.api.left} y={200} color={COLORS.accent} label="POST /tasks" delay={D(4)} />
			
			{/* ── Path 2: API -> DB (Dual Write) ── */}
			<HArrow x1={N.api.cx + N.api.w/2} x2={N.db.left} y={190} color={COLORS.success} label="1. INSERT tasks" delay={D(6)} />
			<HArrow x1={N.api.cx + N.api.w/2} x2={N.db.left} y={220} color={COLORS.success} label="2. INSERT outbox" delay={D(7)} />
			
			<HArrow x1={N.api.left} x2={N.client.cx + N.client.w/2} y={240} color={COLORS.accent} label="201 Created" delay={D(8.5)} />

			{/* ── Path 3: DB -> Relay ── */}
			<HArrow x1={N.db.cx + N.db.w/2} x2={N.relay.left} y={210} color={COLORS.accent} label="3. Poll Outbox" delay={D(11)} />

			{/* ── Path 4: Relay -> Kafka -> DB (Delete) ── */}
			<VArrow x={N.relay.cx} y1={N.relay.top + 80} y2={N.kafka.top} color={COLORS.warning} label="4. publish(event)" delay={D(13)} />
			<HArrow x1={N.relay.left} x2={N.db.cx + N.db.w/2} y={240} color={COLORS.accent3} label="5. DELETE outbox" delay={D(15)} dashed />

			{/* ── Path 5: Kafka -> Listener ── */}
			<HArrow x1={N.kafka.left} x2={N.listener.cx + N.listener.w/2} y={430} color={COLORS.warning} label="6. consume(event)" delay={D(18)} />

			{/* ── Path 6: Listener -> DB (Idempotent Update) ── */}
			<VArrow x={N.listener.cx - 20} y1={N.listener.top} y2={N.db.top + 80} color={COLORS.accent2} label="7. INSERT inbox" labelLeft delay={D(20)} />
			<VArrow x={N.listener.cx + 20} y1={N.listener.top} y2={N.db.top + 80} color={COLORS.success} label="8. UPDATE tasks" delay={D(21)} />

			{/* Divider */}
			<div style={{ position: 'absolute', top: 120, bottom: 70, left: 980, width: 1, background: 'rgba(255,255,255,0.06)' }} />

			{/* Right panel */}
			<div style={{ position: 'absolute', top: 130, left: 1000, right: 24 }}>
				<div style={{ fontSize: 9, fontWeight: 800, color: COLORS.muted, letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: 'Inter', marginBottom: 14 }}>Guaranteed Flow</div>
				
				<StepItem num={1} label="Dual Write (Sync)" sub="Atomically write domain state & outbox record" color={COLORS.success} badge="ACID" delay={D(6)} />
				<StepItem num={2} label="Thread Released" sub="Client gets 201 immediately" color={COLORS.accent} badge="FAST" delay={D(8.5)} />
				<StepItem num={3} label="Relay Push" sub="Worker extracts & pushes to broker" color={COLORS.warning} badge="ASYNC" delay={D(13)} />
				<StepItem num={4} label="Idempotent Update" sub="Atomic constraint deduplicates processing" color={COLORS.accent2} badge="EXACTLY ONCE" delay={D(20)} />
			</div>

			<Banner text="✓ The architecture is now resilient to network failures, broker crashes, and consumer restarts." color={COLORS.success} delay={D(25)} />
		</Shell>
	);
};

/* ════════════════════════════════════════════════
   ROOT — Total Duration: ~31s = 930 frames
════════════════════════════════════════════════ */
export const UpgradedAsyncFlow: React.FC = () => {
	const { fps } = useVideoConfig();
	return (
		<AbsoluteFill style={{ background: GRADIENTS.bg }}>
			<Sequence from={0} durationInFrames={fps*3} layout="none">
				<TitleCard title="The Durable Architecture" />
			</Sequence>
			<Sequence from={fps*3} durationInFrames={fps*28} layout="none">
				<UpgradedAsyncFlowSlide />
			</Sequence>
		</AbsoluteFill>
	);
};
