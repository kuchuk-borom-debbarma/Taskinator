import React from 'react';
import { AbsoluteFill, Sequence, useVideoConfig, useCurrentFrame, spring, interpolate, Easing } from 'remotion';
import { COLORS, GRADIENTS } from './components/Nodes';

const t = (s: number, fps: number) => fps * s;

/* ── Thread box ── */
const ThreadBox: React.FC<{ blocked: boolean; label: string; at: number }> = ({ blocked, label, at }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const s = spring({ frame: f - at, fps, config: { damping: 13 } });
	const color = blocked ? COLORS.danger : COLORS.success;
	return (
		<div style={{ opacity: s, width: 110, background: blocked ? 'rgba(255,23,68,0.12)' : 'rgba(0,230,118,0.08)', border: `1.5px solid ${color}55`, borderRadius: 8, padding: '7px 10px', transition: 'background 0.3s' }}>
			<div style={{ fontSize: 9, fontWeight: 800, color, fontFamily: 'monospace', letterSpacing: 0.5 }}>
				{blocked ? '🔒 BLOCKED' : '🟢 FREE'}
			</div>
			<div style={{ fontSize: 9, color: COLORS.muted, fontFamily: 'monospace', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
		</div>
	);
};

/* ── User card ── */
const UserCard: React.FC<{ id: number; status: 'waiting' | 'serving' | 'blocked'; at: number }> = ({ id, status, at }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const s = spring({ frame: f - at, fps, config: { damping: 13, stiffness: 110 } });
	const color = status === 'serving' ? COLORS.success : status === 'blocked' ? COLORS.danger : COLORS.warning;
	const label = status === 'serving' ? '⚡ Serving' : status === 'blocked' ? '⏳ Queued' : '🔄 Waiting';
	return (
		<div style={{ opacity: s, transform: `translateX(${interpolate(s, [0, 1], [-20, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) })}px)`, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(15,23,42,0.8)', border: `1px solid ${color}44`, borderRadius: 10, padding: '8px 12px', marginBottom: 8 }}>
			<div style={{ fontSize: 20 }}>👤</div>
			<div>
				<div style={{ fontSize: 11, fontWeight: 700, color: COLORS.ink, fontFamily: 'Inter' }}>User {id}</div>
				<div style={{ fontSize: 10, color, fontFamily: 'Inter', fontWeight: 600 }}>{label}</div>
			</div>
		</div>
	);
};

/* ── Pulsing arrow ── */
const PulsingArrow: React.FC<{ x1: number; x2: number; y: number; color: string; at: number; label?: string }> = ({ x1, x2, y, color, at, label }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const p = spring({ frame: f - at, fps, config: { damping: 16, stiffness: 100 } });
	const lp = spring({ frame: f - at - 4, fps, config: { damping: 14 } });
	const tip = x1 + (x2 - x1) * p;
	const id = `pa${y}${at}`;
	return (
		<>
			<svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none', zIndex: 10 }}>
				<defs><marker id={id} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M 0 0 L 6 3 L 0 6 z" fill={color} /></marker></defs>
				<line x1={x1} y1={y} x2={x2} y2={y} stroke={color} strokeWidth={1} opacity={0.08} strokeDasharray="4 3" />
				<line x1={x1} y1={y} x2={tip} y2={y} stroke={color} strokeWidth={2} strokeLinecap="round" markerEnd={p > 0.85 ? `url(#${id})` : undefined} style={{ filter: `drop-shadow(0 0 4px ${color}88)` }} />
			</svg>
			{label && <div style={{ position: 'absolute', left: x1 + 10, top: y - 22, opacity: lp, fontSize: 10, fontWeight: 700, color, fontFamily: 'monospace', background: 'rgba(15,23,42,0.85)', border: `1px solid ${color}44`, borderRadius: 6, padding: '3px 8px', whiteSpace: 'nowrap', zIndex: 20 }}>{label}</div>}
		</>
	);
};

/* ══════════════════════════════════════════════════════════
   SLIDE A — Thread Pool Saturation
   Shows: users → server (threads fill red) → DB overwhelmed
══════════════════════════════════════════════════════════ */
export const BlockingSlideA: React.FC = () => {
	const { fps } = useVideoConfig();
	const f = useCurrentFrame();

	const headerS  = spring({ frame: f - 3,       fps, config: { damping: 14 } });
	const showWarn = spring({ frame: f - t(10, fps), fps, config: { damping: 12 } });
	const dbPulse  = interpolate(Math.sin(f * 0.15), [-1, 1], [0, 1]);

	// 0→4 blocked threads growing over time
	const blocked = f < t(2, fps) ? 0 : f < t(4, fps) ? 1 : f < t(6, fps) ? 2 : f < t(8, fps) ? 3 : 4;

	const threads = [
		{ label: 'INSERT project_task …', blocked: blocked >= 1, at: t(1.8, fps) },
		{ label: 'UPDATE tasks_count …',  blocked: blocked >= 2, at: t(3.8, fps) },
		{ label: 'INSERT task_link …',    blocked: blocked >= 3, at: t(5.8, fps) },
		{ label: 'Waiting for lock …',    blocked: blocked >= 4, at: t(7.8, fps) },
	];

	// User rows: appear one-by-one
	const users = [
		{ id: 1, status: 'serving' as const, arrowY: 195, at: t(1, fps) },
		{ id: 2, status: 'serving' as const, arrowY: 245, at: t(3, fps) },
		{ id: 3, status: 'serving' as const, arrowY: 295, at: t(5, fps) },
		{ id: 4, status: 'blocked' as const, arrowY: 345, at: t(7, fps) },
	];

	return (
		<AbsoluteFill style={{ background: GRADIENTS.bg }}>
			<AbsoluteFill style={{ padding: 20 }}>
				<div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'rgba(30,41,59,0.18)', backdropFilter: 'blur(30px)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 30px 80px rgba(0,0,0,0.55)' }}>

					{/* ── HEADER ── */}
					<div style={{ position: 'absolute', top: 26, left: 32, right: 32, opacity: headerS, transform: `translateY(${interpolate(headerS,[0,1],[-12,0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) })}px)` }}>
						<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
							<div style={{ width: 7, height: 7, borderRadius: '50%', background: COLORS.danger, boxShadow: `0 0 8px ${COLORS.danger}` }} />
							<span style={{ fontSize: 10, fontWeight: 800, color: COLORS.danger, fontFamily: 'Inter', textTransform: 'uppercase', letterSpacing: 1.5 }}>The Problem</span>
						</div>
						<h2 style={{ fontSize: 26, fontWeight: 900, color: COLORS.ink, fontFamily: 'Inter', margin: '0 0 4px' }}>Synchronous I/O Blocks Threads</h2>
						<p style={{ fontSize: 12, color: COLORS.muted, fontFamily: 'Inter', margin: 0, lineHeight: 1.5, maxWidth: 600 }}>
							Every request holds a thread while waiting for the database. When requests pile up, threads exhaust — new users wait.
						</p>
					</div>

					{/* ══ LEFT ZONE — flow diagram (0 → 760px) ══ */}

					{/* User cards column */}
					{users.map(u => (
						<Sequence key={u.id} from={u.at} layout="none">
							<div style={{ position: 'absolute', top: u.arrowY - 24, left: 32 }}>
								<UserCard id={u.id} status={u.status} at={0} />
							</div>
						</Sequence>
					))}

					{/* Arrows: user → server */}
					{users.map(u => (
						<Sequence key={u.id} from={u.at + 4} layout="none">
							<PulsingArrow
								x1={190} x2={380}
								y={u.arrowY}
								color={u.status === 'blocked' ? COLORS.danger : COLORS.accent}
								at={0}
								label={u.status === 'blocked' ? 'POST /tasks — QUEUED' : 'POST /tasks'}
							/>
						</Sequence>
					))}

					{/* API Server node */}
					<div style={{ position: 'absolute', top: 235, left: 380, width: 190 }}>
						<div style={{ background: 'rgba(15,23,42,0.9)', border: `1.5px solid ${COLORS.success}55`, borderRadius: 14, padding: '18px 20px', textAlign: 'center', backdropFilter: 'blur(12px)', boxShadow: '0 8px 28px rgba(0,0,0,0.5)' }}>
							<div style={{ fontSize: 28 }}>⚙️</div>
							<div style={{ fontSize: 12, fontWeight: 800, color: COLORS.success, fontFamily: 'Inter', marginTop: 6, letterSpacing: 1 }}>API Server</div>
							<div style={{ fontSize: 10, color: COLORS.muted, fontFamily: 'Inter', marginTop: 2 }}>All threads busy</div>
						</div>
					</div>

					{/* Arrows: server → DB */}
					<Sequence from={t(1.5, fps)} layout="none">
						<PulsingArrow x1={572} x2={750} y={255} color={COLORS.warning} at={0} label="Query 1 — waiting…" />
					</Sequence>
					<Sequence from={t(3.5, fps)} layout="none">
						<PulsingArrow x1={572} x2={750} y={278} color={COLORS.warning} at={0} label="Query 2 — waiting…" />
					</Sequence>
					<Sequence from={t(5.5, fps)} layout="none">
						<PulsingArrow x1={572} x2={750} y={301} color={COLORS.warning} at={0} label="Query 3 — waiting…" />
					</Sequence>

					{/* DB node */}
					<div style={{ position: 'absolute', top: 220, left: 750, width: 170 }}>
						<div style={{ background: 'rgba(15,23,42,0.9)', border: `2px solid ${COLORS.danger}`, borderRadius: 14, padding: '16px 18px', textAlign: 'center', backdropFilter: 'blur(12px)', boxShadow: `0 0 ${24 + 16 * dbPulse}px rgba(255,23,68,${0.25 + 0.35 * dbPulse}), 0 8px 28px rgba(0,0,0,0.5)` }}>
							<div style={{ fontSize: 28 }}>🗄️</div>
							<div style={{ fontSize: 12, fontWeight: 800, color: COLORS.danger, fontFamily: 'Inter', marginTop: 6, letterSpacing: 1 }}>PostgreSQL</div>
							<div style={{ fontSize: 11, color: COLORS.danger, fontFamily: 'Inter', fontWeight: 700, marginTop: 4 }}>🔥 HOTSPOT</div>
						</div>
					</div>

					{/* Vertical divider */}
					<div style={{ position: 'absolute', top: 120, bottom: 75, left: 950, width: 1, background: 'rgba(255,255,255,0.07)' }} />

					{/* ══ RIGHT ZONE — thread pool panel (960px →) ══ */}
					<div style={{ position: 'absolute', top: 130, left: 966, right: 24 }}>
						<div style={{ fontSize: 9, fontWeight: 800, color: COLORS.muted, letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: 'Inter', marginBottom: 14 }}>Thread Pool</div>
						{threads.map((th, i) => (
							<ThreadBox key={i} blocked={th.blocked} label={th.label} at={th.at} />
						))}

						{/* Lock contention badge — plain div, no Sequence */}
						<div style={{
							marginTop: 16,
							opacity: spring({ frame: f - t(8, fps), fps, config: { damping: 13 } }),
							background: 'rgba(255,23,68,0.1)', border: `1px solid ${COLORS.danger}55`,
							borderRadius: 10, padding: '12px 14px',
						}}>
							<div style={{ fontSize: 11, fontWeight: 800, color: COLORS.danger, fontFamily: 'Inter', marginBottom: 4 }}>⚠️ Pool Saturated</div>
							<div style={{ fontSize: 10, color: COLORS.muted, fontFamily: 'Inter', lineHeight: 1.6 }}>
								All {blocked} threads blocked on I/O.<br />New requests must queue or be rejected.
							</div>
						</div>
					</div>

					{/* ── Warning banner ── */}
					<div style={{ position: 'absolute', bottom: 22, left: 32, right: 32, opacity: showWarn, transform: `translateY(${interpolate(showWarn,[0,1],[20,0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.175, 0.885, 0.32, 1.275) })}px)`, display: 'flex', justifyContent: 'center', zIndex: 30 }}>
						<div style={{ background: 'rgba(255,23,68,0.1)', border: `2px solid ${COLORS.danger}`, borderRadius: 12, padding: '11px 28px', fontSize: 13, fontWeight: 800, color: COLORS.danger, fontFamily: 'Inter', boxShadow: '0 0 32px rgba(255,23,68,0.3)', backdropFilter: 'blur(10px)' }}>
							⚠️ &nbsp;Every blocked thread = one user waiting · Thread pool is the ceiling
						</div>
					</div>

				</div>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};

/* ══════════════════════════════════════════════════════════
   SLIDE B — At Scale: The Real Impact
   Shows metrics degrading: latency, errors, throughput
══════════════════════════════════════════════════════════ */
/* const MetricCard: React.FC<{ label: string; value: string; sub: string; color: string; at: number }> = ({ label, value, sub, color, at }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const s = spring({ frame: f - at, fps, config: { damping: 13 } });
	return (
		<div style={{ opacity: s, transform: `translateY(${interpolate(s, [0, 1], [20, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) })}px)`, flex: 1, background: `${color}0d`, border: `1.5px solid ${color}44`, borderTop: `3px solid ${color}`, borderRadius: 14, padding: '20px 18px' }}>
			<div style={{ fontSize: 10, fontWeight: 800, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'Inter', marginBottom: 10 }}>{label}</div>
			<div style={{ fontSize: 32, fontWeight: 900, color, fontFamily: 'Inter', lineHeight: 1 }}>{value}</div>
			<div style={{ fontSize: 11, color: COLORS.muted, fontFamily: 'Inter', marginTop: 8, lineHeight: 1.5 }}>{sub}</div>
		</div>
	);
}; */

export const BlockingSlideB: React.FC = () => {
	const { fps } = useVideoConfig();
	const f = useCurrentFrame();

	const headerS   = spring({ frame: f - 3,        fps, config: { damping: 14 } });
	const metricsS  = spring({ frame: f - t(2, fps), fps, config: { damping: 13 } });
	const flowS     = spring({ frame: f - t(5, fps), fps, config: { damping: 13 } });
	const bannerS   = spring({ frame: f - t(9, fps), fps, config: { damping: 12 } });

	const progress   = Math.min(1, Math.max(0, (f - t(3, fps)) / (fps * 5)));
	const latency    = Math.round(interpolate(progress, [0, 1], [120, 3400]));
	const errorRate  = Math.round(interpolate(progress, [0, 1], [0.1, 18.7]) * 10) / 10;
	const throughput = Math.round(interpolate(progress, [0, 1], [9800, 1200]));

	const steps = ['User Request', 'Thread Acquired', 'DB Query (blocking)', 'Wait for response', 'Thread Released'];

	return (
		<AbsoluteFill style={{ background: GRADIENTS.bg }}>
			<AbsoluteFill style={{ padding: 20 }}>
				<div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'rgba(30,41,59,0.18)', backdropFilter: 'blur(30px)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 30px 80px rgba(0,0,0,0.55)' }}>

					{/* ── Header ── */}
					<div style={{ position: 'absolute', top: 26, left: 32, right: 32, opacity: headerS, transform: `translateY(${interpolate(headerS,[0,1],[-12,0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) })}px)` }}>
						<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
							<div style={{ width: 7, height: 7, borderRadius: '50%', background: COLORS.danger, boxShadow: `0 0 8px ${COLORS.danger}` }} />
							<span style={{ fontSize: 10, fontWeight: 800, color: COLORS.danger, fontFamily: 'Inter', textTransform: 'uppercase', letterSpacing: 1.5 }}>At Scale — The Real Impact</span>
						</div>
						<h2 style={{ fontSize: 26, fontWeight: 900, color: COLORS.ink, fontFamily: 'Inter', margin: '0 0 4px' }}>10,000 RPS Hits — Everything Degrades</h2>
						<p style={{ fontSize: 12, color: COLORS.muted, fontFamily: 'Inter', margin: 0, lineHeight: 1.5 }}>
							Under high concurrency, each synchronous write holds a DB connection open. The database becomes the single point of contention.
						</p>
					</div>

					{/* ── Metric cards row ── */}
					<div style={{ position: 'absolute', top: 148, left: 32, right: 32, display: 'flex', gap: 16, opacity: metricsS, transform: `translateY(${interpolate(metricsS,[0,1],[20,0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) })}px)` }}>
						{[
							{ label: 'P99 Latency',  value: `${latency}ms`,              sub: `↑ from 120ms baseline`,          color: latency > 800 ? COLORS.danger : COLORS.warning },
							{ label: 'Error Rate',   value: `${errorRate}%`,              sub: `↑ from 0.1% baseline`,           color: errorRate > 5 ? COLORS.danger : COLORS.warning },
							{ label: 'Throughput',   value: throughput.toLocaleString(),  sub: `↓ from 9,800 RPS target`,        color: throughput < 3000 ? COLORS.danger : COLORS.warning },
						].map((m, i) => (
							<div key={i} style={{ flex: 1, background: `${m.color}0d`, border: `1.5px solid ${m.color}44`, borderTop: `3px solid ${m.color}`, borderRadius: 14, padding: '18px 18px' }}>
								<div style={{ fontSize: 10, fontWeight: 800, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'Inter', marginBottom: 10 }}>{m.label}</div>
								<div style={{ fontSize: 34, fontWeight: 900, color: m.color, fontFamily: 'Inter', lineHeight: 1 }}>{m.value}</div>
								<div style={{ fontSize: 11, color: COLORS.muted, fontFamily: 'Inter', marginTop: 8 }}>{m.sub}</div>
							</div>
						))}
					</div>

					{/* ── "Why this happens" step flow ── */}
					<div style={{ position: 'absolute', top: 360, left: 32, right: 32, opacity: flowS, transform: `translateY(${interpolate(flowS,[0,1],[16,0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) })}px)` }}>
						<div style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '18px 24px' }}>
							<div style={{ fontSize: 10, fontWeight: 800, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'Inter', marginBottom: 14 }}>Why This Happens</div>
							<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0 }}>
								{steps.map((step, i) => (
									<React.Fragment key={i}>
										<div style={{ background: i === 2 || i === 3 ? 'rgba(255,23,68,0.12)' : 'rgba(0,229,255,0.08)', border: `1px solid ${i === 2 || i === 3 ? COLORS.danger : COLORS.accent}44`, borderRadius: 8, padding: '8px 14px', fontSize: 11, fontWeight: 700, color: i === 2 || i === 3 ? COLORS.danger : COLORS.accent, fontFamily: 'Inter', textAlign: 'center', whiteSpace: 'nowrap' }}>{step}</div>
										{i < steps.length - 1 && <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.2)', margin: '0 6px' }}>→</div>}
									</React.Fragment>
								))}
							</div>
							<div style={{ textAlign: 'center', marginTop: 12, fontSize: 11, color: COLORS.danger, fontFamily: 'Inter', fontWeight: 600 }}>
								⚠️ &nbsp;The thread is held <em>idle</em> during the entire DB wait — it can serve no one else
							</div>
						</div>
					</div>

					{/* ── Banner ── */}
					<div style={{ position: 'absolute', bottom: 22, left: 32, right: 32, opacity: bannerS, transform: `translateY(${interpolate(bannerS,[0,1],[20,0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.175, 0.885, 0.32, 1.275) })}px)`, display: 'flex', justifyContent: 'center', zIndex: 30 }}>
						<div style={{ background: 'rgba(255,23,68,0.1)', border: `2px solid ${COLORS.danger}`, borderRadius: 12, padding: '11px 28px', fontSize: 13, fontWeight: 800, color: COLORS.danger, fontFamily: 'Inter', boxShadow: '0 0 32px rgba(255,23,68,0.3)', backdropFilter: 'blur(10px)' }}>
							🔥 &nbsp;The database is a hotspot — synchronous I/O is the bottleneck
						</div>
					</div>

				</div>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};

