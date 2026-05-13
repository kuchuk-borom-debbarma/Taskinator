import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
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

const Arrow: React.FC<{ x1: number; y1: number; x2: number; y2: number; color: string; delay: number; dashed?: boolean }> = ({ x1, y1, x2, y2, color, delay, dashed }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const p = spring({ frame: f - delay, fps, config: { damping: 20, stiffness: 70 } });
	const id = `arrow_${x1}_${y1}_${delay}`;
	const midX = x1 + (x2 - x1) * p;
	const midY = y1 + (y2 - y1) * p;

	return (
		<svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none', zIndex: 10 }}>
			<defs>
				<marker id={id} markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
					<path d="M 0 0 L 8 4 L 0 8 z" fill={color} />
				</marker>
			</defs>
			<line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={1} opacity={0.1} strokeDasharray="4 4" />
			<line x1={x1} y1={y1} x2={midX} y2={midY} stroke={color} strokeWidth={3} strokeLinecap="round" markerEnd={p > 0.95 ? `url(#${id})` : undefined} strokeDasharray={dashed ? '10 5' : undefined} style={{ filter: `drop-shadow(0 0 5px ${color}66)` }} />
		</svg>
	);
};

const Appear: React.FC<{ at: number; children: React.ReactNode; y?: number; x?: number }> = ({ at, children, y = 18, x = 0 }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const s = SP(f, at, fps);
	return (
		<div style={{ opacity: s, transform: `translate(${interpolate(s, [0, 1], [x, 0])}px, ${interpolate(s, [0, 1], [y, 0])}px)` }}>
			{children}
		</div>
	);
};

/* ════════════════════════════════════════════════
   SLIDE 1 — Title
════════════════════════════════════════════════ */
export const TitleSlide: React.FC = () => {
	return <TitleCard title="Smart Event Aggregation" />;
};

/* ════════════════════════════════════════════════
   SLIDE 2 — Naive Listener Architecture
════════════════════════════════════════════════ */
export const NaiveListenerSlide: React.FC = () => {
	const f = useCurrentFrame();
	
	const delays = {
		kafka: 5,
		db: 10,
		l1: 15,
		l2: 22,
		l3: 29,
		l4: 36,
		l5: 43,
		a1In: 18, a1Out: 30,
		a2In: 25, a2Out: 37,
		a3In: 32, a3Out: 44,
		a4In: 39, a4Out: 51,
		a5In: 46, a5Out: 58,
	};

	return (
		<Shell>
			<Appear at={5} y={-20}>
				<div style={{ position: 'absolute', top: 40, left: 50 }}>
					<div style={{ fontSize: 12, fontWeight: 900, color: COLORS.danger, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'Inter', marginBottom: 10 }}>THE PERFORMANCE BOTTLENECK</div>
					<h2 style={{ fontSize: 36, fontWeight: 900, color: COLORS.ink, fontFamily: 'Inter', margin: '0 0 8px' }}>Excessive Database Operations</h2>
					<p style={{ fontSize: 16, color: COLORS.muted, fontFamily: 'Inter', margin: 0, maxWidth: 800, lineHeight: 1.6 }}>100 events trigger 500 individual DB writes instead of a single batched operation.</p>
				</div>
			</Appear>

			{/* Kafka Node */}
			<SNode icon="📨" label="Kafka Topic" sub="DOMAIN_EVENTS" color={COLORS.warning} top={260} left={60} w={180} delay={delays.kafka} />

			{/* 5 Listener Nodes */}
			<SNode icon="🎧" label="ChangeProjectMemberCount" color={COLORS.accent}  top={80}  left={480} w={260} delay={delays.l1} />
			<SNode icon="🎧" label="DeleteProjectTask"        color={COLORS.danger}  top={170} left={480} w={260} delay={delays.l2} />
			<SNode icon="🎧" label="PurgeTeamMemberships"     color={COLORS.accent2} top={260} left={480} w={260} delay={delays.l3} />
			<SNode icon="🎧" label="SyncTeamTaskCount"        color={COLORS.success} top={350} left={480} w={260} delay={delays.l4} />
			<SNode icon="🎧" label="UpdateUserProjectCount"   color={COLORS.accent3} top={440} left={480} w={260} delay={delays.l5} />

			{/* DB Node */}
			<SNode icon="🗄️" label="PostgreSQL" color={COLORS.accent3} top={260} left={880} w={180} delay={delays.db} />

			{/* Arrows Kafka -> Listeners */}
			<Arrow x1={240} y1={280} x2={480} y2={110} color={COLORS.accent}  delay={delays.a1In} />
			<Arrow x1={240} y1={290} x2={480} y2={200} color={COLORS.danger}  delay={delays.a2In} />
			<Arrow x1={240} y1={300} x2={480} y2={290} color={COLORS.accent2} delay={delays.a3In} />
			<Arrow x1={240} y1={310} x2={480} y2={380} color={COLORS.success} delay={delays.a4In} />
			<Arrow x1={240} y1={320} x2={480} y2={470} color={COLORS.accent3} delay={delays.a5In} />

			{/* Arrows Listeners -> DB */}
			<Arrow x1={740} y1={110} x2={880} y2={270} color={COLORS.accent}  delay={delays.a1Out} />
			<Arrow x1={740} y1={200} x2={880} y2={285} color={COLORS.danger}  delay={delays.a2Out} />
			<Arrow x1={740} y1={290} x2={880} y2={300} color={COLORS.accent2} delay={delays.a3Out} />
			<Arrow x1={740} y1={380} x2={880} y2={315} color={COLORS.success} delay={delays.a4Out} />
			<Arrow x1={740} y1={470} x2={880} y2={330} color={COLORS.accent3} delay={delays.a5Out} />

			{/* Warning Badge */}
			{f >= 90 && (
				<Appear at={90} y={20}>
					<div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, zIndex: 30 }}>
						<div style={{ background: `${COLORS.danger}15`, border: `2px solid ${COLORS.danger}`, borderRadius: 20, padding: '14px 48px', fontSize: 16, fontWeight: 900, color: COLORS.danger, fontFamily: 'Inter', boxShadow: `0 0 50px ${COLORS.danger}33`, backdropFilter: 'blur(20px)' }}>
							⚠️ N Events × 5 Listeners = DB Connection Pool Exhaustion
						</div>
						<div style={{ background: `rgba(0,0,0,0.8)`, border: `1px solid ${COLORS.warning}55`, borderLeft: `4px solid ${COLORS.warning}`, borderRadius: 12, padding: '12px 24px', fontSize: 14, color: COLORS.ink, fontFamily: 'Inter', boxShadow: `0 10px 30px rgba(0,0,0,0.5)` }}>
							<strong>The Core Problem:</strong> We are missing the opportunity to group, batch, and execute as a single DB call.
						</div>
					</div>
				</Appear>
			)}
		</Shell>
	);
};

/* ════════════════════════════════════════════════
   SLIDE 3 — Fanout Explosion
════════════════════════════════════════════════ */
export const FanoutExplosionSlide: React.FC = () => {
	const f = useCurrentFrame();

	return (
		<Shell>
			<Appear at={5} y={-20}>
				<div style={{ position: 'absolute', top: 40, left: 50 }}>
					<div style={{ fontSize: 12, fontWeight: 900, color: COLORS.danger, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'Inter', marginBottom: 10 }}>UNGROUPED OPERATIONS</div>
					<h2 style={{ fontSize: 36, fontWeight: 900, color: COLORS.ink, fontFamily: 'Inter', margin: '0 0 8px' }}>One Event, Five Independent Writes</h2>
					<p style={{ fontSize: 16, color: COLORS.muted, fontFamily: 'Inter', margin: 0, maxWidth: 800, lineHeight: 1.6 }}>No grouping means massive performance overhead and DB contention.</p>
				</div>
			</Appear>

			{/* Central Event */}
			<SNode icon="💥" label="PROJECT_DELETED" color={COLORS.danger} top={280} left={240} w={220} delay={5} glow />

			{/* Fan layout listeners */}
			<SNode icon="🎧" label="Listener A" color={COLORS.accent}  top={100} left={800} w={200} delay={15} />
			<SNode icon="🎧" label="Listener B" color={COLORS.warning} top={190} left={860} w={200} delay={18} />
			<SNode icon="🎧" label="Listener C" color={COLORS.accent2} top={280} left={880} w={200} delay={21} />
			<SNode icon="🎧" label="Listener D" color={COLORS.success} top={370} left={860} w={200} delay={24} />
			<SNode icon="🎧" label="Listener E" color={COLORS.accent3} top={460} left={800} w={200} delay={27} />

			{/* Rapid fire arrows */}
			<Arrow x1={460} y1={290} x2={800} y2={130} color={COLORS.accent}  delay={16} />
			<Arrow x1={460} y1={300} x2={860} y2={220} color={COLORS.warning} delay={19} />
			<Arrow x1={460} y1={310} x2={880} y2={310} color={COLORS.accent2} delay={22} />
			<Arrow x1={460} y1={320} x2={860} y2={400} color={COLORS.success} delay={25} />
			<Arrow x1={460} y1={330} x2={800} y2={490} color={COLORS.accent3} delay={28} />

			{/* DB Conflict Badges */}
			{f >= 90 && (
				<>
					<div style={{ position: 'absolute', top: 160, left: 700, zIndex: 30 }}><Appear at={90}><div style={{ background: COLORS.danger, color: 'white', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 900, boxShadow: '0 4px 12px rgba(255,0,0,0.5)' }}>❌ DB CONFLICT</div></Appear></div>
					<div style={{ position: 'absolute', top: 250, left: 740, zIndex: 30 }}><Appear at={95}><div style={{ background: COLORS.danger, color: 'white', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 900, boxShadow: '0 4px 12px rgba(255,0,0,0.5)' }}>❌ DB CONFLICT</div></Appear></div>
					<div style={{ position: 'absolute', top: 340, left: 740, zIndex: 30 }}><Appear at={100}><div style={{ background: COLORS.danger, color: 'white', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 900, boxShadow: '0 4px 12px rgba(255,0,0,0.5)' }}>❌ DB CONFLICT</div></Appear></div>
				</>
			)}

			{/* Bottom Warning */}
			{f >= 110 && (
				<Appear at={110} y={20}>
					<div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 30 }}>
						<div style={{ background: `rgba(0,0,0,0.8)`, border: `1px solid ${COLORS.danger}55`, borderLeft: `4px solid ${COLORS.danger}`, borderRadius: 12, padding: '16px 24px', fontSize: 14, color: COLORS.ink, fontFamily: 'Inter', boxShadow: `0 10px 30px rgba(0,0,0,0.5)` }}>
							<strong>The Cost:</strong> Unbatched execution multiplies database load drastically under high throughput.
						</div>
					</div>
				</Appear>
			)}
		</Shell>
	);
};
