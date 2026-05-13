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

const Appear: React.FC<{ at: number; children: React.ReactNode; y?: number; x?: number }> = ({ at, children, y = 0, x = 0 }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const s = SP(f, at, fps);
	return (
		<div style={{ opacity: s, transform: `translate(${interpolate(s, [0, 1], [x, 0])}px, ${interpolate(s, [0, 1], [y, 0])}px)` }}>
			{children}
		</div>
	);
};

const DbStep: React.FC<{ num: number; label: string; sub: string; color: string; at: number }> = ({ num, label, sub, color, at }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const s = spring({ frame: f - at, fps, config: { damping: 13, stiffness: 110 } });
	return (
		<div style={{ opacity: s, transform: `translateX(${interpolate(s, [0, 1], [30, 0])}px)`, display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
			<div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: '#000', boxShadow: `0 0 10px ${color}88` }}>{num}</div>
			<div style={{ flex: 1, background: `${color}11`, border: `1px solid ${color}33`, borderLeft: `3px solid ${color}`, borderRadius: 8, padding: '10px 14px' }}>
				<div style={{ fontSize: 14, fontWeight: 800, color, fontFamily: 'Inter', marginBottom: 4 }}>{label}</div>
				<div style={{ fontSize: 11, color: COLORS.muted, fontFamily: 'monospace', lineHeight: 1.4 }}>{sub}</div>
			</div>
		</div>
	);
};

/* ════════════════════════════════════════════════
   SLIDE 1 — SKIP LOCKED
════════════════════════════════════════════════ */
export const SkipLockedSlide: React.FC = () => {
	const f = useCurrentFrame();

	return (
		<Shell>
			<Appear at={5} y={-20}>
				<div style={{ position: 'absolute', top: 40, left: 50 }}>
					<div style={{ fontSize: 12, fontWeight: 900, color: COLORS.accent, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'Inter', marginBottom: 10 }}>SAFE CONCURRENT CLAIMING</div>
					<h2 style={{ fontSize: 32, fontWeight: 900, color: COLORS.ink, fontFamily: 'monospace', margin: '0 0 8px' }}>FOR UPDATE SKIP LOCKED</h2>
					<p style={{ fontSize: 16, color: COLORS.muted, fontFamily: 'Inter', margin: 0, maxWidth: 800, lineHeight: 1.6 }}>Multiple aggregator instances, zero duplicate processing.</p>
				</div>
			</Appear>

			{/* Left Half: Timeline */}
			<SNode icon="⚙️" label="Instance A" sub="🔒 Acquires lock" color={COLORS.accent} top={180} left={30} w={180} delay={10} glow />
			<SNode icon="⚙️" label="Instance B" sub="⏩ Skips locked" color={COLORS.warning} top={300} left={30} w={180} delay={18} />
			<SNode icon="⚙️" label="Instance C" sub="⏩ Skips locked" color={COLORS.muted} top={420} left={30} w={180} delay={26} />

			{/* Target row icon */}
			<Appear at={14} x={-20}>
				<div style={{ position: 'absolute', top: 210, left: 280, display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(15,23,42,0.8)', padding: '12px 20px', borderRadius: 12, border: `2px solid ${COLORS.accent}66`, boxShadow: `0 0 30px ${COLORS.accent}33` }}>
					<span style={{ fontSize: 24 }}>🔒</span>
					<span style={{ color: COLORS.ink, fontFamily: 'monospace', fontWeight: 800 }}>outbox_events row #1</span>
				</div>
			</Appear>
			
			<Arrow x1={210} y1={230} x2={280} y2={230} color={COLORS.accent} delay={14} />

			{/* Badge */}
			{f >= 22 && (
				<Appear at={22} y={20}>
					<div style={{ position: 'absolute', top: 350, left: 250, background: `rgba(0,0,0,0.8)`, border: `1px solid ${COLORS.warning}`, borderLeft: `4px solid ${COLORS.warning}`, borderRadius: 12, padding: '12px 20px', fontSize: 13, color: COLORS.ink, fontFamily: 'Inter', width: 280 }}>
						B and C skip this row immediately and claim the next available row.
					</div>
				</Appear>
			)}

			{/* Right Half: SQL Card */}
			<Appear at={30} x={40}>
				<div style={{ position: 'absolute', top: 140, left: 580, width: 600, background: 'rgba(10,15,30,0.9)', border: `2px solid ${COLORS.accent}66`, borderRadius: 16, padding: '24px 32px', boxShadow: `0 20px 50px rgba(0,0,0,0.6)` }}>
					<div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
						<div style={{ width: 12, height: 12, borderRadius: '50%', background: COLORS.danger }} />
						<div style={{ width: 12, height: 12, borderRadius: '50%', background: COLORS.warning }} />
						<div style={{ width: 12, height: 12, borderRadius: '50%', background: COLORS.success }} />
					</div>
					<div style={{ fontFamily: 'monospace', fontSize: 16, lineHeight: 1.8 }}>
						<div style={{ color: COLORS.accent2 }}>SELECT <span style={{ color: COLORS.ink }}>id, kafka_topic, payload</span></div>
						<div style={{ color: COLORS.accent2 }}>FROM <span style={{ color: COLORS.ink }}>outbox_events</span></div>
						<div style={{ color: COLORS.accent2 }}>WHERE <span style={{ color: COLORS.ink }}>status = 'PENDING'</span></div>
						<div style={{ color: COLORS.accent2 }}>ORDER BY <span style={{ color: COLORS.ink }}>created_at ASC</span></div>
						<div style={{ color: COLORS.accent2 }}>LIMIT <span style={{ color: COLORS.warning }}>100</span></div>
						<div style={{ color: COLORS.accent, fontWeight: 900, background: `${COLORS.accent}22`, display: 'inline-block', padding: '0 8px', borderRadius: 4, marginTop: 4 }}>FOR UPDATE SKIP LOCKED;</div>
					</div>
				</div>
			</Appear>

			{/* Bottom Callout */}
			{f >= 50 && (
				<Appear at={50} y={20}>
					<div style={{ position: 'absolute', top: 430, left: 580, right: 60, display: 'flex', justifyContent: 'center' }}>
						<div style={{ background: `${COLORS.success}22`, border: `2px solid ${COLORS.success}`, borderRadius: 12, padding: '16px 32px', fontSize: 16, fontWeight: 900, color: COLORS.success, fontFamily: 'Inter', boxShadow: `0 0 40px ${COLORS.success}33`, backdropFilter: 'blur(10px)' }}>
							Safe for N parallel relay instances
						</div>
					</div>
				</Appear>
			)}
		</Shell>
	);
};

/* ════════════════════════════════════════════════
   SLIDE 2 — IDEMPOTENCY
════════════════════════════════════════════════ */
export const IdempotencySlide: React.FC = () => {
	const f = useCurrentFrame();

	return (
		<Shell>
			<Appear at={5} y={-20}>
				<div style={{ position: 'absolute', top: 40, left: 50 }}>
					<div style={{ fontSize: 12, fontWeight: 900, color: COLORS.success, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'Inter', marginBottom: 10 }}>IDEMPOTENCY GUARANTEE</div>
					<h2 style={{ fontSize: 32, fontWeight: 900, color: COLORS.ink, fontFamily: 'monospace', margin: '0 0 8px' }}>claimEventsAtomic()</h2>
					<p style={{ fontSize: 16, color: COLORS.muted, fontFamily: 'Inter', margin: 0, maxWidth: 800, lineHeight: 1.6 }}>No event processed twice — even with retries and crashes.</p>
				</div>
			</Appear>

			{/* Left Panel: Steps */}
			<div style={{ position: 'absolute', top: 140, left: 50, width: 620 }}>
				<DbStep num={1} label="Open transaction" sub="BEGIN" color={COLORS.accent} at={10} />
				<DbStep num={2} label="Insert into processed_event" sub="INSERT INTO processed_event (event_id, consumer_group) ON CONFLICT DO NOTHING RETURNING event_id" color={COLORS.warning} at={20} />
				<DbStep num={3} label="Filter unprocessed" sub="Only keep events whose IDs were successfully returned (inserted)" color={COLORS.accent2} at={32} />
				<DbStep num={4} label="Process events" sub="Run listener business logic (e.g., updates domain tables)" color={COLORS.accent3} at={44} />
				<DbStep num={5} label="COMMIT" sub="Atomic: domain tables + processed_event commit together" color={COLORS.success} at={56} />
			</div>

			{/* Right Panel: Schema */}
			<Appear at={15} x={40}>
				<div style={{ position: 'absolute', top: 140, left: 720, width: 480, background: 'rgba(15,23,42,0.9)', border: `2px solid ${COLORS.accent3}66`, borderRadius: 16, padding: '24px', boxShadow: `0 20px 50px rgba(0,0,0,0.5)` }}>
					<div style={{ fontSize: 14, fontWeight: 900, color: COLORS.accent3, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>Table: processed_event</div>
					
					<div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontFamily: 'monospace', fontSize: 13 }}>
						<div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 8 }}>
							<span style={{ color: COLORS.ink }}>id</span>
							<span style={{ color: COLORS.warning }}>PK UUID</span>
						</div>
						<div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 8 }}>
							<span style={{ color: COLORS.ink }}>event_id</span>
							<span style={{ color: COLORS.accent }}>FK (outbox_events)</span>
						</div>
						<div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 8 }}>
							<span style={{ color: COLORS.ink }}>consumer_group</span>
							<span style={{ color: COLORS.accent2 }}>TEXT</span>
						</div>
						<div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8 }}>
							<span style={{ color: COLORS.ink }}>processed_at</span>
							<span style={{ color: COLORS.accent3 }}>TIMESTAMPTZ</span>
						</div>
					</div>
					
					<div style={{ marginTop: 20, background: `${COLORS.warning}15`, padding: '10px', borderRadius: 8, fontSize: 12, color: COLORS.muted, fontFamily: 'Inter', borderLeft: `3px solid ${COLORS.warning}` }}>
						<strong>UNIQUE (event_id, consumer_group)</strong> ensures a group can only process an event once.
					</div>
				</div>
			</Appear>

			{/* Bottom Banner */}
			{f >= 75 && (
				<Appear at={75} y={20}>
					<div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 30 }}>
						<div style={{ background: `${COLORS.success}22`, border: `2px solid ${COLORS.success}`, borderRadius: 12, padding: '16px 32px', fontSize: 16, fontWeight: 900, color: COLORS.success, fontFamily: 'Inter', boxShadow: `0 0 40px ${COLORS.success}33`, backdropFilter: 'blur(10px)' }}>
							At-least-once delivery · No duplicates · Crash-safe
						</div>
					</div>
				</Appear>
			)}
		</Shell>
	);
};
