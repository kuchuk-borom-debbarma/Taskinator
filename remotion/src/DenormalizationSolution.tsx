import React from 'react';
import {
	AbsoluteFill, useVideoConfig, useCurrentFrame,
	spring, interpolate, Easing
} from 'remotion';
import { COLORS, GRADIENTS } from './components/Nodes';

/* ── Appear helper ───────────────────────────────────── */
const Appear: React.FC<{ at: number; children: React.ReactNode; x?: number; y?: number }> = ({ at, children, x = 0, y = 20 }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const s = spring({ frame: frame - at, fps, config: { damping: 14, stiffness: 100 } });
	return (
		<div style={{
			opacity: s,
			transform: `translate(${interpolate(s, [0, 1], [x, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })}px, ${interpolate(s, [0, 1], [y, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })}px)`,
		}}>
			{children}
		</div>
	);
};

/* ── Animated horizontal arrow ───────────────────────── */
const FlowArrow: React.FC<{ at: number; label?: string; color?: string }> = ({ at, label, color = COLORS.success }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const p = spring({ frame: frame - at, fps, config: { damping: 16, stiffness: 110 } });
	const w = 70;
	return (
		<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
			{label && (
				<div style={{ opacity: p, fontSize: 10, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'Inter', whiteSpace: 'nowrap' }}>
					{label}
				</div>
			)}
			<svg width={w} height={24} style={{ overflow: 'visible' }}>
				<defs>
					<marker id={`sol-arr-${color.replace('#','')}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
						<path d="M 0 0 L 6 3 L 0 6 z" fill={color} />
					</marker>
				</defs>
				<line x1={0} y1={12} x2={w * p} y2={12} stroke={color} strokeWidth={2.5} strokeLinecap="round"
					markerEnd={p > 0.8 ? `url(#sol-arr-${color.replace('#','')})` : undefined}
					style={{ filter: `drop-shadow(0 0 5px ${color}99)` }} />
			</svg>
		</div>
	);
};

/* ── Schema column row ───────────────────────────────── */
type Col = { name: string; type: string; isPk?: boolean; isFk?: boolean; isDenorm?: boolean };

const SchemaRow: React.FC<{ col: Col; pulse: number }> = ({ col, pulse }) => (
	<div style={{
		display: 'flex', justifyContent: 'space-between', alignItems: 'center',
		padding: '7px 16px',
		borderBottom: '1px solid rgba(255,255,255,0.04)',
		background: col.isDenorm ? `rgba(0,230,118,${0.07 + pulse * 0.06})` : 'transparent',
		borderLeft: col.isDenorm ? `3px solid rgba(0,230,118,${0.55 + pulse * 0.45})` : '3px solid transparent',
	}}>
		<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
			{col.isPk && <span style={{ fontSize: 9, fontWeight: 800, color: COLORS.warning, background: 'rgba(255,214,0,0.12)', padding: '1px 5px', borderRadius: 3 }}>PK</span>}
			{col.isFk && !col.isPk && <span style={{ fontSize: 9, fontWeight: 800, color: COLORS.accent3, background: 'rgba(0,229,255,0.08)', padding: '1px 5px', borderRadius: 3 }}>FK</span>}
			{col.isDenorm && <span style={{ fontSize: 9, fontWeight: 900, color: '#000', background: COLORS.success, padding: '1px 6px', borderRadius: 3, boxShadow: `0 0 8px ${COLORS.success}` }}>★</span>}
			<span style={{ fontSize: 12, color: col.isPk ? COLORS.warning : col.isDenorm ? COLORS.success : col.isFk ? COLORS.accent3 : COLORS.ink, fontWeight: col.isDenorm ? 700 : 400, fontFamily: 'Inter' }}>
				{col.name}
			</span>
		</div>
		<span style={{ fontSize: 11, color: COLORS.muted, fontFamily: 'monospace' }}>{col.type}</span>
	</div>
);

/* ── Before query row (crossed-out style) ────────────── */
const CrossedQuery: React.FC<{ sql: string; at: number }> = ({ sql, at }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const s = spring({ frame: frame - at, fps, config: { damping: 14 } });
	return (
		<div style={{ opacity: s * 0.55, display: 'flex', alignItems: 'center', gap: 10 }}>
			<span style={{ fontSize: 14, color: COLORS.danger }}>✕</span>
			<span style={{ fontSize: 12, fontFamily: 'monospace', color: COLORS.muted, textDecoration: 'line-through' }}>{sql}</span>
		</div>
	);
};

/* ════════════════════════════════════════════════════════ */
export const DenormalizationSolution: React.FC = () => {
	const { fps } = useVideoConfig();
	const frame = useCurrentFrame();

	const steps = [
		{ frame: 0,        text: 'Schema Updated...' },
		{ frame: fps * 1.5,text: 'Denorm Columns Added ★' },
		{ frame: fps * 3,  text: 'Single Query Unlocked...' },
		{ frame: fps * 5,  text: '3 Queries Eliminated...' },
		{ frame: fps * 7,  text: 'Zero Joins. Zero Overhead.' },
	];
	const current = [...steps].reverse().find(s => frame >= s.frame) || steps[0];
	const pulse = 0.5 + 0.5 * Math.sin((frame / fps) * Math.PI * 2.5);

	const showWarning = spring({ frame: frame - fps * 7.5, fps, config: { damping: 12, stiffness: 120 } });

	const projectCols: Col[] = [
		{ name: 'id', type: 'UUID', isPk: true },
		{ name: 'name', type: 'TEXT' },
		{ name: 'fk_user_id', type: 'TEXT', isFk: true },
		{ name: 'members_count', type: 'INTEGER', isDenorm: true },
		{ name: 'tasks_count', type: 'INTEGER', isDenorm: true },
		{ name: 'teams_count', type: 'INTEGER', isDenorm: true },
	];

	return (
		<AbsoluteFill style={{ background: GRADIENTS.bg }}>
			<AbsoluteFill style={{ padding: '20px' }}>
				<div style={{
					flex: 1,
					background: 'rgba(30, 41, 59, 0.2)',
					backdropFilter: 'blur(30px)',
					borderRadius: '20px',
					border: '1px solid rgba(255, 255, 255, 0.1)',
					boxShadow: '0 30px 80px rgba(0, 0, 0, 0.5), inset 0 0 40px rgba(0,230,118,0.04)',
					position: 'relative',
					overflow: 'hidden',
				}}>

					{/* ── Progress chip ───────────── */}
					<div style={{
						position: 'absolute', top: 28, left: 30, zIndex: 100,
						background: 'rgba(15,23,42,0.65)', padding: '10px 18px',
						borderRadius: 12, border: '1px solid rgba(0,230,118,0.25)',
						backdropFilter: 'blur(14px)', boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
						display: 'flex', alignItems: 'center', gap: 10,
					}}>
						<div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.success, boxShadow: `0 0 8px ${COLORS.success}` }} />
						<span style={{ fontSize: 12, fontWeight: 700, color: COLORS.ink, fontFamily: 'Inter', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
							{current.text}
						</span>
					</div>

					{/* ── Headline ────────────────── */}
					<div style={{ position: 'absolute', top: 86, left: 50, right: 50 }}>
						<Appear at={0} y={-15}>
							<h2 style={{ color: COLORS.success, fontFamily: 'Inter', fontSize: 28, margin: 0, fontWeight: 900 }}>
								The Solution: Denormalized Count Columns
							</h2>
							<p style={{ color: COLORS.muted, fontFamily: 'Inter', fontSize: 14, margin: '8px 0 0', lineHeight: 1.6 }}>
								Store counts <em>directly on the parent row</em>. The same request that fired 4 queries now fires exactly <strong style={{ color: COLORS.success }}>one</strong>.
							</p>
						</Appear>
					</div>

					{/* ─────────────────────────────────────────────────────
					    MAIN 3-COLUMN LAYOUT
					───────────────────────────────────────────────────── */}

					{/* Left: Updated schema card */}
					<div style={{ position: 'absolute', top: 185, left: 50, width: 300 }}>
						<Appear at={fps * 0.5} x={-30} y={0}>
							<div style={{
								background: 'rgba(15,23,42,0.85)', borderRadius: 14, overflow: 'hidden',
								border: `1px solid ${COLORS.accent}44`,
								boxShadow: `0 8px 28px rgba(0,0,0,0.5), 0 0 20px ${COLORS.accent}14`,
								fontFamily: 'Inter',
							}}>
								<div style={{
									background: `linear-gradient(90deg, ${COLORS.accent}28, transparent)`,
									borderBottom: `1px solid ${COLORS.accent}44`,
									padding: '11px 16px', fontWeight: 800, fontSize: 13,
									letterSpacing: '1px', color: COLORS.accent, display: 'flex', alignItems: 'center', gap: 8,
								}}>
									<div style={{ width: 7, height: 7, borderRadius: 2, background: COLORS.accent }} />
									project
								</div>
								{projectCols.map((col, i) => <SchemaRow key={i} col={col} pulse={pulse} />)}
							</div>

							{/* Legend */}
							<div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(0,230,118,0.07)', border: `1px solid ${COLORS.success}30`, borderRadius: 10 }}>
								<span style={{ fontSize: 11, color: COLORS.success, fontFamily: 'Inter', fontWeight: 700 }}>
									★ Incrementally maintained on every write. Never computed at read time.
								</span>
							</div>
						</Appear>
					</div>

					{/* Center: Arrow */}
					<div style={{ position: 'absolute', top: 285, left: 370, display: 'flex', alignItems: 'center' }}>
						<FlowArrow at={fps * 2.5} label="Now reads as" color={COLORS.success} />
					</div>

					{/* Right: After query + eliminated queries */}
					<div style={{ position: 'absolute', top: 185, left: 460, right: 50 }}>

						{/* Single query card */}
						<Appear at={fps * 3} x={60} y={0}>
							<div style={{
								background: 'rgba(15,23,42,0.85)',
								border: `1px solid ${COLORS.success}44`, borderTop: `3px solid ${COLORS.success}`,
								borderRadius: 12, padding: '18px 22px',
								boxShadow: `0 8px 28px rgba(0,0,0,0.5), 0 0 20px ${COLORS.success}14`,
								marginBottom: 20,
							}}>
								<div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
									<div style={{ width: 28, height: 28, borderRadius: '50%', background: COLORS.success, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13, color: '#000', boxShadow: `0 0 12px ${COLORS.success}88`, flexShrink: 0 }}>1</div>
									<div style={{ fontSize: 11, fontWeight: 800, color: COLORS.success, textTransform: 'uppercase', letterSpacing: 1 }}>The Only Query</div>
								</div>
								<div style={{ fontFamily: 'monospace', fontSize: 13, lineHeight: 1.8, color: COLORS.ink }}>
									SELECT id, name,<br/>
									<span style={{ color: COLORS.success }}>{'  '}members_count, tasks_count, teams_count</span><br/>
									FROM project<br/>
									WHERE id = ?
								</div>
								<div style={{ marginTop: 12, fontSize: 12, color: COLORS.success, fontFamily: 'Inter', fontWeight: 600 }}>
									✓ &nbsp;Counts read directly from the row. Zero joins.
								</div>
							</div>
						</Appear>

						{/* Eliminated queries */}
						<Appear at={fps * 5} y={0}>
							<div style={{ background: 'rgba(255,23,68,0.06)', border: '1px solid rgba(255,23,68,0.18)', borderRadius: 12, padding: '16px 20px' }}>
								<div style={{ fontSize: 11, fontWeight: 800, color: COLORS.danger, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
									Queries Eliminated:
								</div>
								<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
									<CrossedQuery sql="SELECT COUNT(*) FROM project_member WHERE fk_project_id = ?" at={fps * 5} />
									<CrossedQuery sql="SELECT COUNT(*) FROM project_team WHERE fk_project_id = ?" at={fps * 5.5} />
									<CrossedQuery sql="SELECT COUNT(*) FROM project_task WHERE fk_project_id = ?" at={fps * 6} />
								</div>
							</div>
						</Appear>
					</div>

					{/* ── Success banner ───────────── */}
					<div style={{
						position: 'absolute', bottom: 30, left: 50, right: 50,
						opacity: showWarning,
						transform: `translateY(${interpolate(showWarning, [0, 1], [40, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) })}px)`,
						display: 'flex', justifyContent: 'center', zIndex: 30,
					}}>
						<div style={{
							background: 'rgba(0,230,118,0.12)', border: `2px solid ${COLORS.success}`,
							color: COLORS.ink, padding: '14px 32px', borderRadius: 12,
							fontSize: 17, fontWeight: 800, fontFamily: 'Inter',
							boxShadow: `0 0 40px rgba(0,230,118,0.35)`, backdropFilter: 'blur(10px)',
							letterSpacing: '0.5px',
						}}>
							✅ &nbsp;4 queries → 1 query. 75% reduction in database round-trips.
						</div>
					</div>

				</div>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
