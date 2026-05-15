import React from 'react';
import {
	AbsoluteFill, useVideoConfig, useCurrentFrame,
	spring, interpolate, Easing
} from 'remotion';
import { COLORS, GRADIENTS } from './components/Nodes';

/* ── helpers ─────────────────────────────────────────── */
const Appear: React.FC<{ at: number; children: React.ReactNode; y?: number; x?: number }> = ({ at, children, y = 18, x = 0 }) => {
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

/* ── Graph rendered with plain SVG (no Sequence inside svg) ─ */
const TASKS = [
	{ id: 'T-1', label: 'Design UI',    cx: 85,  cy: 50  },
	{ id: 'T-2', label: 'Build API',    cx: 270, cy: 50  },
	{ id: 'T-3', label: 'Write Tests',  cx: 85,  cy: 148 },
	{ id: 'T-4', label: 'Deploy',       cx: 270, cy: 148 },
	{ id: 'T-5', label: 'Monitor',      cx: 430, cy: 99  },
];
const EDGES = [
	{ from: 0, to: 1, depth: 1 },
	{ from: 0, to: 2, depth: 1 },
	{ from: 1, to: 3, depth: 1 },
	{ from: 2, to: 3, depth: 1 },
	{ from: 3, to: 4, depth: 1 },
];

const TaskGraph: React.FC<{ showEdgesAt: number }> = ({ showEdgesAt }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	return (
		<svg width={520} height={200} style={{ overflow: 'visible', display: 'block' }}>
			<defs>
				<marker id="g-arr" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
					<path d="M 0 0 L 7 3.5 L 0 7 z" fill={COLORS.accent3} opacity={0.9} />
				</marker>
				<marker id="g-arr-d" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
					<path d="M 0 0 L 7 3.5 L 0 7 z" fill={COLORS.warning} opacity={0.9} />
				</marker>
			</defs>

			{/* Draw edges */}
			{EDGES.map((e, i) => {
				const a = TASKS[e.from]; const b = TASKS[e.to];
				const edgeFrame = showEdgesAt + i * 12;
				const ep = spring({ frame: frame - edgeFrame, fps, config: { damping: 18, stiffness: 110 } });
				if (frame < edgeFrame) return null;
				// offset from circle perimeter
				const dx = b.cx - a.cx; const dy = b.cy - a.cy;
				const len = Math.hypot(dx, dy);
				const ux = dx / len; const uy = dy / len;
				const r = 38;
				const sx = a.cx + ux * r; const sy = a.cy + uy * r;
				const ex2 = b.cx - ux * r; const ey2 = b.cy - uy * r;
				const mx = (sx + ex2) / 2; const my = (sy + ey2) / 2;
				const cx2 = mx - uy * 20; const cy2 = my + ux * 20;
				const pathD = `M ${sx} ${sy} Q ${cx2} ${cy2}, ${ex2} ${ey2}`;
				const pathLen = len * 1.1;
				return (
					<path
						key={i}
						d={pathD}
						fill="none"
						stroke={COLORS.accent3}
						strokeWidth={2}
						strokeDasharray={`${pathLen} ${pathLen}`}
						strokeDashoffset={pathLen * (1 - ep)}
						strokeLinecap="round"
						markerEnd={ep > 0.85 ? 'url(#g-arr)' : undefined}
						style={{ filter: `drop-shadow(0 0 4px ${COLORS.accent3}66)` }}
					/>
				);
			})}

			{/* Draw task nodes */}
			{TASKS.map((t, i) => {
				const nodeAt = i * 10;
				const np = spring({ frame: frame - nodeAt, fps, config: { damping: 13, stiffness: 130 } });
				if (frame < nodeAt) return null;
				const isSource = i === 0;
				const color = isSource ? COLORS.accent : COLORS.accent3;
				return (
					<g key={t.id} transform={`translate(${t.cx}, ${t.cy}) scale(${np})`} style={{ transformOrigin: `${t.cx}px ${t.cy}px` }}>
						<circle r={38} fill="rgba(13,18,30,0.95)" stroke={color} strokeWidth={isSource ? 2.5 : 1.8}
							style={{ filter: isSource ? `drop-shadow(0 0 10px ${color}88)` : `drop-shadow(0 0 5px ${color}44)` }} />
						<text textAnchor="middle" y={-6} fontSize={9} fontWeight={800} fill={COLORS.muted} fontFamily="Inter">
							{t.id}
						</text>
						<text textAnchor="middle" y={9} fontSize={11} fontWeight={700} fill={color} fontFamily="Inter">
							{t.label.split(' ')[0]}
						</text>
						<text textAnchor="middle" y={22} fontSize={11} fontWeight={700} fill={color} fontFamily="Inter">
							{t.label.split(' ')[1] || ''}
						</text>
					</g>
				);
			})}

			{/* Depth label annotations */}
			{frame >= showEdgesAt + 60 && (
				<>
					<text x={178} y={34} textAnchor="middle" fontSize={9} fontWeight={800} fill={COLORS.accent3} fontFamily="Inter" opacity={0.8}>depth 1</text>
					<text x={370} y={170} textAnchor="middle" fontSize={9} fontWeight={800} fill={COLORS.warning} fontFamily="Inter" opacity={0.8}>depth 2+</text>
				</>
			)}
		</svg>
	);
};

/* ── SQL line component ───────────────────────────────── */
const SqlLine: React.FC<{ text: string; color?: string; indent?: number }> = ({ text, color = COLORS.ink, indent = 0 }) => (
	<div style={{
		fontFamily: 'monospace', fontSize: 12, lineHeight: 1.9, color,
		paddingLeft: indent * 16,
	}}>
		{text}
	</div>
);

/* ════════════════════════════════════════════════════════ */
export const TaskLinkProblem: React.FC = () => {
	const { fps } = useVideoConfig();
	const frame = useCurrentFrame();

	const showGraph   = fps * 0.5;
	const showEdges   = fps * 2.0;
	const showSql     = fps * 5.0;
	const showCost    = fps * 8.5;
	const showBanner  = fps * 10.5;

	const bannerPop = spring({ frame: frame - showBanner, fps, config: { damping: 11, stiffness: 120 } });

	const steps = [
		{ frame: 0,         text: 'task_link — The Naive Approach' },
		{ frame: fps * 2.0, text: 'Building the dependency graph...' },
		{ frame: fps * 5.0, text: 'Query to find all reachable tasks...' },
		{ frame: fps * 8.5, text: 'Cost grows with depth' },
		{ frame: fps * 10.5,text: 'Recursive Explosion!' },
	];
	const step = [...steps].reverse().find(s => frame >= s.frame) || steps[0];

	return (
		<AbsoluteFill style={{ background: GRADIENTS.bg }}>
			<AbsoluteFill style={{ padding: 24 }}>
				<div style={{
					flex: 1, position: 'relative',
					background: 'rgba(20, 30, 50, 0.35)',
					backdropFilter: 'blur(28px)',
					borderRadius: 20,
					border: '1px solid rgba(255,255,255,0.08)',
					boxShadow: '0 30px 80px rgba(0,0,0,0.55), inset 0 0 60px rgba(255,23,68,0.04)',
					overflow: 'hidden',
					display: 'flex', flexDirection: 'column',
				}}>

					{/* ── Progress chip ───────────────── */}
					<div style={{
						position: 'absolute', top: 24, left: 28, zIndex: 100,
						background: 'rgba(15,23,42,0.65)', padding: '9px 16px',
						borderRadius: 10, border: '1px solid rgba(255,23,68,0.3)',
						backdropFilter: 'blur(12px)',
						display: 'flex', alignItems: 'center', gap: 9,
					}}>
						<div style={{ width: 7, height: 7, borderRadius: '50%', background: COLORS.danger, boxShadow: `0 0 7px ${COLORS.danger}` }} />
						<span style={{ fontSize: 11, fontWeight: 700, color: COLORS.ink, fontFamily: 'Inter', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{step.text}</span>
					</div>

					{/* ── Headline ────────────────────── */}
					<div style={{ padding: '22px 36px 0', marginTop: 56 }}>
						<Appear at={0} y={-12}>
							<h2 style={{ color: COLORS.danger, fontFamily: 'Inter', fontSize: 25, margin: 0, fontWeight: 900 }}>
								Problem: Traversing task links requires recursive queries
							</h2>
							<p style={{ color: COLORS.muted, fontFamily: 'Inter', fontSize: 13, margin: '6px 0 0', lineHeight: 1.6 }}>
								With a flat <code style={{ color: COLORS.warning, background: 'rgba(255,214,0,0.08)', padding: '1px 6px', borderRadius: 4, fontSize: 12 }}>task_link</code> table that stores only direct edges,
								finding <em>all</em> tasks reachable from a root requires a recursive CTE — cost is O(depth).
							</p>
						</Appear>
					</div>

					{/* ── Two-column body ─────────────── */}
					<div style={{ display: 'flex', flex: 1, padding: '16px 36px 72px', gap: 36, alignItems: 'flex-start', overflow: 'hidden' }}>

						{/* LEFT: task graph */}
						<div style={{ flex: '0 0 auto', width: 540 }}>
							{/* table schema card */}
							<Appear at={fps * 0.3} y={12}>
								<div style={{
									background: 'rgba(13,18,30,0.92)',
									border: `1px solid ${COLORS.warning}40`,
									borderRadius: 10, overflow: 'hidden',
									marginBottom: 18,
									display: 'inline-flex', flexDirection: 'column',
									minWidth: 320,
								}}>
									<div style={{
										background: `linear-gradient(90deg, ${COLORS.warning}28, transparent)`,
										borderBottom: `1px solid ${COLORS.warning}35`,
										padding: '8px 14px',
										display: 'flex', alignItems: 'center', gap: 7,
									}}>
										<div style={{ width: 6, height: 6, borderRadius: 2, background: COLORS.warning }} />
										<span style={{ fontWeight: 800, fontSize: 11, color: COLORS.warning, letterSpacing: '1px', textTransform: 'uppercase' }}>task_link</span>
									</div>
									<div style={{ display: 'flex' }}>
										{[
											{ label: 'PK', name: 'id', type: 'UUID' },
											{ label: 'FK', name: 'source_task_id', type: 'UUID' },
											{ label: 'FK', name: 'target_task_id', type: 'UUID' },
											{ label: '',   name: 'label', type: 'TEXT' },
										].map((col, i) => (
											<div key={i} style={{
												padding: '6px 14px',
												borderRight: i < 3 ? '1px solid rgba(255,255,255,0.05)' : 'none',
												display: 'flex', flexDirection: 'column', gap: 3,
											}}>
												<div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
													{col.label && <span style={{ fontSize: 8, fontWeight: 800, color: col.label === 'PK' ? COLORS.warning : COLORS.accent3, background: col.label === 'PK' ? 'rgba(255,214,0,0.1)' : 'rgba(0,230,118,0.1)', padding: '1px 4px', borderRadius: 3 }}>{col.label}</span>}
													<span style={{ fontSize: 11, color: COLORS.ink, fontFamily: 'Inter' }}>{col.name}</span>
												</div>
												<span style={{ fontSize: 10, color: COLORS.muted, fontFamily: 'monospace' }}>{col.type}</span>
											</div>
										))}
									</div>
								</div>
							</Appear>

							{/* The graph */}
							{frame >= showGraph && (
								<Appear at={showGraph} y={15}>
									<TaskGraph showEdgesAt={showEdges} />
								</Appear>
							)}
						</div>

						{/* RIGHT: CTE query + cost */}
						<div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>

							{/* CTE block */}
							{frame >= showSql && (
								<Appear at={showSql} x={40} y={0}>
									<div style={{
										background: 'rgba(8,12,22,0.93)',
										border: '1px solid rgba(255,23,68,0.25)',
										borderTop: `3px solid ${COLORS.danger}`,
										borderRadius: 12, padding: '16px 20px',
										boxShadow: `0 8px 28px rgba(0,0,0,0.5), 0 0 20px rgba(255,23,68,0.08)`,
									}}>
										<div style={{ fontSize: 10, fontWeight: 800, color: COLORS.danger, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10, fontFamily: 'Inter' }}>
											Query: All tasks reachable from "Design UI"
										</div>
										<SqlLine text="WITH RECURSIVE reachable AS (" color={COLORS.danger} />
										<SqlLine text="  SELECT target_task_id, 1 AS depth" indent={0} />
										<SqlLine text="  FROM   task_link" />
										<SqlLine text="  WHERE  source_task_id = 'T-1'" color={COLORS.accent} />
										<SqlLine text="  UNION ALL" color={COLORS.warning} />
										<SqlLine text="  SELECT tl.target_task_id, r.depth + 1" />
										<SqlLine text="  FROM   task_link tl" />
										<SqlLine text="  JOIN   reachable r" color={COLORS.warning} />
										<SqlLine text="    ON   r.target_task_id = tl.source_task_id" color={COLORS.warning} />
										<SqlLine text=")" color={COLORS.danger} />
										<SqlLine text="SELECT * FROM reachable;" color={COLORS.accent3} />
									</div>
								</Appear>
							)}

							{/* Cost table */}
							{frame >= showCost && (
								<Appear at={showCost} y={16}>
									<div style={{
										background: 'rgba(255,23,68,0.06)',
										border: '1px solid rgba(255,23,68,0.2)',
										borderRadius: 10, padding: '14px 18px',
									}}>
										<div style={{ fontSize: 10, fontWeight: 800, color: COLORS.danger, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12, fontFamily: 'Inter' }}>
											Cost grows with each hop
										</div>
										{[
											{ hops: '1 hop',  icon: '🟢', cost: '1 scan of task_link' },
											{ hops: '2 hops', icon: '🟡', cost: '1 self-join' },
											{ hops: '3 hops', icon: '🔴', cost: 'Another self-join' },
											{ hops: 'N hops', icon: '💥', cost: 'N recursive iterations — unbounded' },
										].map((row, i) => (
											<div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
												<span style={{ fontSize: 13, flexShrink: 0 }}>{row.icon}</span>
												<span style={{ fontSize: 11, fontFamily: 'monospace', color: COLORS.muted }}>
													<span style={{ color: COLORS.ink, fontWeight: 700 }}>{row.hops}: </span>
													{row.cost}
												</span>
											</div>
										))}
									</div>
								</Appear>
							)}
						</div>
					</div>

					{/* ── Warning banner ──────────────── */}
					<div style={{
						position: 'absolute', bottom: 22, left: 50, right: 50,
						opacity: bannerPop,
						transform: `translateY(${interpolate(bannerPop, [0, 1], [36, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.175, 0.885, 0.32, 1.275) })}px)`,
						display: 'flex', justifyContent: 'center', zIndex: 30,
					}}>
						<div style={{
							background: 'rgba(255,23,68,0.16)', border: `2px solid ${COLORS.danger}`,
							color: COLORS.ink, padding: '12px 30px', borderRadius: 12,
							fontSize: 15, fontWeight: 800, fontFamily: 'Inter',
							boxShadow: `0 0 40px rgba(255,23,68,0.4)`, backdropFilter: 'blur(10px)',
						}}>
							⚠️ &nbsp;Recursive CTE — O(depth) scans. Every extra hop multiplies the query cost.
						</div>
					</div>

				</div>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
