import React from 'react';
import {
	AbsoluteFill, useVideoConfig, useCurrentFrame,
	spring, interpolate,
} from 'remotion';
import { COLORS, GRADIENTS } from './components/Nodes';

/* ── Helpers ─────────────────────────────────────────── */
const Appear: React.FC<{ at: number; children: React.ReactNode; y?: number; x?: number }> = ({ at, children, y = 16, x = 0 }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const s = spring({ frame: frame - at, fps, config: { damping: 14, stiffness: 100 } });
	return (
		<div style={{
			opacity: s,
			transform: `translate(${interpolate(s, [0, 1], [x, 0])}px, ${interpolate(s, [0, 1], [y, 0])}px)`,
		}}>
			{children}
		</div>
	);
};

/* ── Step chip at top-left ───────────────────────────── */
const Chip: React.FC<{ text: string; color?: string }> = ({ text, color = COLORS.accent }) => (
	<div style={{
		position: 'absolute', top: 24, left: 28, zIndex: 100,
		background: 'rgba(15,23,42,0.65)', padding: '9px 16px',
		borderRadius: 10, border: `1px solid ${color}35`,
		backdropFilter: 'blur(12px)',
		display: 'flex', alignItems: 'center', gap: 9,
	}}>
		<div style={{ width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 7px ${color}` }} />
		<span style={{ fontSize: 11, fontWeight: 700, color: COLORS.ink, fontFamily: 'Inter', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{text}</span>
	</div>
);

/* ── Pure SVG task chain graph ─────────────────────── */
const TaskChainGraph: React.FC<{ t: Record<string, number> }> = ({ t: timeline }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	const R = 32;           // same radius as TaskGraph in TaskLinkProblem
	const GAP = 28;         // gap between circle edges
	const CX = 110;         // horizontal centre
	const STEP = R * 2 + GAP;
	const nodes = [
		{ id: 'T-1', label: 'Design UI',   cy: R,             highlight: true  },
		{ id: 'T-2', label: 'Build API',   cy: R + STEP,      highlight: false },
		{ id: 'T-3', label: 'Write Tests', cy: R + STEP * 2,  highlight: false },
	];

	const svgH = R + STEP * 2 + R + 8;

	return (
		<svg width={CX * 2} height={svgH} style={{ overflow: 'visible', display: 'block' }}>
			<defs>
				{[0, 1].map(i => (
					<marker key={i} id={`tcg-arr-${i}`} markerWidth="7" markerHeight="7" refX="3.5" refY="6" orient="auto">
						<polygon points="0,0 7,0 3.5,7" fill={COLORS.accent3} opacity={0.9} />
					</marker>
				))}
				<linearGradient id="tcg-hl" x1="0" y1="0" x2="1" y2="0">
					<stop offset="0%" stopColor={COLORS.accent} stopOpacity={0.18} />
					<stop offset="100%" stopColor={COLORS.accent} stopOpacity={0.06} />
				</linearGradient>
			</defs>

			{/* Edges */}
			{[0, 1].map(i => {
				const edgeAt = i === 0 ? timeline.arrow1 : timeline.arrow2;
				if (frame < edgeAt) return null;
				const ep = spring({ frame: frame - edgeAt, fps, config: { damping: 16, stiffness: 110 } });
				const fromY = nodes[i].cy + R;        // bottom of source circle
				const toY   = nodes[i + 1].cy - R;   // top of target circle
				const lineEndY = fromY + (toY - fromY) * ep;
				return (
					<g key={i}>
						{/* Ghost track */}
						<line x1={CX} y1={fromY} x2={CX} y2={toY}
							stroke={COLORS.accent3} strokeWidth={1} opacity={0.12} />
						{/* Animated line */}
						<line
							x1={CX} y1={fromY + 1}
							x2={CX} y2={lineEndY}
							stroke={COLORS.accent3} strokeWidth={2}
							strokeLinecap="round"
							markerEnd={ep > 0.88 ? `url(#tcg-arr-${i})` : undefined}
							style={{ filter: `drop-shadow(0 0 4px ${COLORS.accent3}77)` }}
						/>
						{/* Glow dot at tip */}
						<circle cx={CX} cy={lineEndY} r={3} fill={COLORS.accent3} opacity={ep * 0.8}
							style={{ filter: `drop-shadow(0 0 5px ${COLORS.accent3})` }} />
						{/* BLOCKS label */}
						{ep > 0.5 && (
							<text
								x={CX + 12} y={fromY + (toY - fromY) * 0.48}
								fontSize={8} fontFamily="Inter" fontWeight={800}
								fill={COLORS.muted} opacity={ep}
							>BLOCKS</text>
						)}
					</g>
				);
			})}

			{/* Nodes */}
			{nodes.map((node, i) => {
				const nodeAt = i === 0 ? timeline.node1 : i === 1 ? timeline.node2 : timeline.node3;
				if (frame < nodeAt) return null;
				const np = spring({ frame: frame - nodeAt, fps, config: { damping: 13, stiffness: 130 } });
				const color = node.highlight ? COLORS.accent : COLORS.accent3;
				const words = node.label.split(' ');
				return (
					<g key={node.id} opacity={np}>
						{/* Circle — same style as TaskGraph */}
						<circle
							cx={CX} cy={node.cy} r={R * np}
							fill="rgba(13,18,30,0.95)"
							stroke={color}
							strokeWidth={node.highlight ? 2.5 : 1.8}
							style={{
								filter: node.highlight
									? `drop-shadow(0 0 12px ${color}88)`
									: `drop-shadow(0 0 6px ${color}44)`,
							}}
						/>
						{/* ID label */}
						<text x={CX} y={node.cy - 9}
							textAnchor="middle" fontSize={9} fontWeight={800}
							fill={COLORS.muted} fontFamily="Inter">
							{node.id}
						</text>
						{/* Task name line 1 */}
						<text x={CX} y={node.cy + (words[1] ? 4 : 7)}
							textAnchor="middle" fontSize={11} fontWeight={700}
							fill={color} fontFamily="Inter">
							{words[0]}
						</text>
						{/* Task name line 2 */}
						{words[1] && (
							<text x={CX} y={node.cy + 17}
								textAnchor="middle" fontSize={11} fontWeight={700}
								fill={color} fontFamily="Inter">
								{words[1]}
							</text>
						)}
					</g>
				);
			})}
		</svg>
	);
};

/* ── Closure table row ───────────────────────────────── */
type ClosureRow = { src: string; dst: string; depth: number; isNew?: boolean; pulse?: boolean };

const ClosureTableRow: React.FC<{ row: ClosureRow; at: number }> = ({ row, at }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const s = spring({ frame: frame - at, fps, config: { damping: 13, stiffness: 140 } });
	const depthColors: Record<number, string> = {
		0: COLORS.muted,
		1: COLORS.accent3,
		2: COLORS.accent2,
		3: COLORS.danger,
	};
	const dc = depthColors[row.depth] ?? COLORS.danger;
	const flashPulse = row.pulse ? (0.5 + 0.5 * Math.sin((frame / fps) * Math.PI * 5)) : 0;

	return (
		<div style={{
			display: 'grid', gridTemplateColumns: '1fr 1fr auto',
			alignItems: 'center', gap: 8,
			padding: '5px 14px',
			opacity: s,
			transform: `translateX(${interpolate(s, [0, 1], [-20, 0])}px)`,
			background: row.isNew ? `rgba(0,229,255,${0.06 + flashPulse * 0.04})` : row.depth === 0 ? 'transparent' : 'transparent',
			borderLeft: row.isNew ? `3px solid ${COLORS.accent}` : '3px solid transparent',
			borderBottom: '1px solid rgba(255,255,255,0.04)',
		}}>
			<span style={{ fontSize: 11, fontFamily: 'monospace', color: COLORS.ink }}>{row.src}</span>
			<span style={{ fontSize: 11, fontFamily: 'monospace', color: COLORS.ink }}>{row.dst}</span>
			<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
				<span style={{ fontSize: 10, fontWeight: 800, color: dc, background: `${dc}18`, padding: '2px 8px', borderRadius: 10, whiteSpace: 'nowrap' }}>
					depth {row.depth}
				</span>
				{row.isNew && (
					<span style={{ fontSize: 9, fontWeight: 900, color: COLORS.accent, background: `${COLORS.accent}18`, padding: '2px 7px', borderRadius: 10 }}>NEW</span>
				)}
			</div>
		</div>
	);
};

/* ── SQL display ─────────────────────────────────────── */
const SqlBlock: React.FC<{ at: number; lines: string[]; accentLines?: number[] }> = ({ at, lines, accentLines = [] }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const s = spring({ frame: frame - at, fps, config: { damping: 14 } });
	return (
		<div style={{
			opacity: s, transform: `translateY(${interpolate(s, [0, 1], [16, 0])}px)`,
			background: 'rgba(8,12,22,0.93)',
			border: `1px solid ${COLORS.accent}30`,
			borderTop: `3px solid ${COLORS.accent}`,
			borderRadius: 12, padding: '14px 18px',
			fontFamily: 'monospace', fontSize: 12, lineHeight: 1.85,
			boxShadow: `0 8px 28px rgba(0,0,0,0.5), 0 0 16px ${COLORS.accent}0c`,
		}}>
			{lines.map((ln, i) => (
				<div key={i} style={{
					color: ln.startsWith('--') ? COLORS.muted : accentLines.includes(i) ? COLORS.success : COLORS.ink,
					fontWeight: accentLines.includes(i) ? 700 : 400,
				}}>{ln}</div>
			))}
		</div>
	);
};

/* ════════════════════════════════════════════════════════
   SCENE DATA
   We have 3 tasks: Design UI (D) → Build API (B) → Write Tests (T)
   Link 1: D → B    writes rows: D→D(0), B→B(0), D→B(1)   [self-rows pre-exist, shown once]
   Link 2: B → T    writes rows: B→T(1), D→T(2)           [transitive path from D to T]
   ════════════════════════════════════════════════════════ */

const ALL_ROWS: ClosureRow[] = [
	// Self rows (exist because every node is its own ancestor)
	{ src: 'Design UI',   dst: 'Design UI',   depth: 0 },
	{ src: 'Build API',   dst: 'Build API',   depth: 0 },
	{ src: 'Write Tests', dst: 'Write Tests', depth: 0 },
	// Link 1: Design UI → Build API
	{ src: 'Design UI',  dst: 'Build API',   depth: 1, isNew: true },
	// Link 2: Build API → Write Tests
	{ src: 'Build API',  dst: 'Write Tests', depth: 1, isNew: true },
	// Transitive: Design UI can now reach Write Tests (depth 2)
	{ src: 'Design UI',  dst: 'Write Tests', depth: 2, isNew: true },
];

export const ClosureTableSolution: React.FC = () => {
	const { fps } = useVideoConfig();
	const frame = useCurrentFrame();

	/* ── Timeline ─────────────────────────────────────── */
	const t = {
		headline:     0,
		schema:       fps * 0.6,
		node1:        fps * 1.2,
		node2:        fps * 2.0,
		node3:        fps * 2.8,
		arrow1:       fps * 2.4,
		arrow2:       fps * 3.2,

		// "User links Design UI → Build API"
		link1Event:   fps * 4.0,
		selfRows:     fps * 4.5,  // self rows appear
		link1Row:     fps * 5.5,  // D→B depth 1 row

		// "User links Build API → Write Tests"
		link2Event:   fps * 7.0,
		link2Row:     fps * 7.5,  // B→T depth 1 row
		transitiveRow:fps * 8.8, // D→T depth 2 row (write amplification!)

		// Show the fast read
		readQuery:    fps * 10.5,

		// Banner
		banner:       fps * 11.5,
	};

	const bannerPop = spring({ frame: frame - t.banner, fps, config: { damping: 11, stiffness: 120 } });

	const steps = [
		{ frame: 0,              text: 'The Solution: Closure Table' },
		{ frame: t.node1,        text: 'Three tasks in our project...' },
		{ frame: t.link1Event,   text: 'Link 1: Design UI → Build API' },
		{ frame: t.link2Event,   text: 'Link 2: Build API → Write Tests' },
		{ frame: t.transitiveRow, text: 'Transitive path auto-written!' },
		{ frame: t.readQuery,    text: 'O(1) Read — No recursion!' },
	];
	const step = [...steps].reverse().find(s => frame >= s.frame) || steps[0];

	/* ── Which rows are visible ───────────────────────── */
	const visibleRows: Array<ClosureRow & { showAt: number }> = [];
	if (frame >= t.selfRows)       visibleRows.push({ ...ALL_ROWS[0], showAt: t.selfRows        });
	if (frame >= t.selfRows + 6)   visibleRows.push({ ...ALL_ROWS[1], showAt: t.selfRows + 6   });
	if (frame >= t.selfRows + 12)  visibleRows.push({ ...ALL_ROWS[2], showAt: t.selfRows + 12  });
	if (frame >= t.link1Row)       visibleRows.push({ ...ALL_ROWS[3], pulse: frame < t.link2Event, showAt: t.link1Row });
	if (frame >= t.link2Row)       visibleRows.push({ ...ALL_ROWS[4], pulse: frame < t.transitiveRow, showAt: t.link2Row });
	if (frame >= t.transitiveRow)  visibleRows.push({ ...ALL_ROWS[5], pulse: frame < t.readQuery, showAt: t.transitiveRow });

	/* ── "Event" badge for link insertion ────────────── */
	const EventBadge: React.FC<{ at: number; text: string; sql: string }> = ({ at, text, sql }) => {
		const s = spring({ frame: frame - at, fps, config: { damping: 13, stiffness: 120 } });
		return (
			<div style={{
				opacity: s, transform: `translateY(${interpolate(s, [0, 1], [-12, 0])}px)`,
				background: 'rgba(0,229,255,0.06)',
				border: `1.5px solid ${COLORS.accent}50`,
				borderRadius: 10, padding: '10px 14px',
				marginBottom: 10,
			}}>
				<div style={{ fontSize: 10, fontWeight: 800, color: COLORS.accent, textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'Inter', marginBottom: 5 }}>
					{text}
				</div>
				<div style={{ fontFamily: 'monospace', fontSize: 11, color: COLORS.ink }}>{sql}</div>
			</div>
		);
	};

	return (
		<AbsoluteFill style={{ background: GRADIENTS.bg }}>
			<AbsoluteFill style={{ padding: 24 }}>
				<div style={{
					flex: 1, position: 'relative',
					background: 'rgba(20, 30, 50, 0.35)',
					backdropFilter: 'blur(28px)',
					borderRadius: 20,
					border: '1px solid rgba(255,255,255,0.08)',
					boxShadow: `0 30px 80px rgba(0,0,0,0.55), inset 0 0 60px ${COLORS.accent}04`,
					overflow: 'hidden',
					display: 'flex', flexDirection: 'column',
				}}>

					<Chip text={step.text} color={COLORS.accent} />

					{/* ── Headline ───────────────────── */}
					<div style={{ padding: '22px 36px 0', marginTop: 56 }}>
						<Appear at={t.headline} y={-12}>
							<h2 style={{ color: COLORS.accent, fontFamily: 'Inter', fontSize: 24, margin: 0, fontWeight: 900 }}>
								Solution: Closure Table — pre-compute every path at write time
							</h2>
							<p style={{ color: COLORS.muted, fontFamily: 'Inter', fontSize: 13, margin: '5px 0 0', lineHeight: 1.6 }}>
								Every time a task link is created, we insert rows for <em>all existing ancestor → new descendant</em> combinations.
								Reads become a single indexed lookup. Writes pay a proportional cost.
							</p>
						</Appear>
					</div>

					{/* ── Three-column body ───────────── */}
					<div style={{ display: 'flex', flex: 1, gap: 20, padding: '14px 36px 20px', overflow: 'hidden' }}>

						{/* ── COL 1: Task chain + events ─ */}
						<div style={{ flex: '0 0 330px', display: 'flex', flexDirection: 'column', gap: 14 }}>

							{/* The task chain — SVG graph */}
							<div>
								<div style={{ fontSize: 10, fontWeight: 800, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 1.2, fontFamily: 'Inter', marginBottom: 10 }}>
									Task Dependency Graph
								</div>
								<TaskChainGraph t={t} />
							</div>

							{/* Link events */}
							{frame >= t.link1Event && (
								<div>
									<div style={{ fontSize: 10, fontWeight: 800, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 1.2, fontFamily: 'Inter', marginBottom: 8 }}>
										Link Insertion Events
									</div>
									<EventBadge
										at={t.link1Event}
										text="Event 1 — Link created"
										sql={`INSERT INTO task_link (T-1 → T-2)`}
									/>
									{frame >= t.link2Event && (
										<EventBadge
											at={t.link2Event}
											text="Event 2 — Link created"
											sql={`INSERT INTO task_link (T-2 → T-3)`}
										/>
									)}
								</div>
							)}


						</div>

						{/* ── COL 2: Closure table rows ── */}
						<div style={{ flex: '0 0 340px', display: 'flex', flexDirection: 'column' }}>
							{/* Schema header */}
							{frame >= t.schema && (
								<Appear at={t.schema} y={10}>
									<div style={{
										background: 'rgba(13,18,30,0.95)',
										border: `1px solid ${COLORS.accent}40`,
										borderRadius: 12, overflow: 'hidden',
										boxShadow: `0 6px 20px rgba(0,0,0,0.4), 0 0 14px ${COLORS.accent}10`,
										fontFamily: 'Inter',
									}}>
										{/* Table title */}
										<div style={{
											background: `linear-gradient(90deg, ${COLORS.accent}22, transparent)`,
											borderBottom: `1px solid ${COLORS.accent}30`,
											padding: '9px 14px',
											display: 'flex', alignItems: 'center', gap: 7,
										}}>
											<div style={{ width: 6, height: 6, borderRadius: 2, background: COLORS.accent }} />
											<span style={{ fontWeight: 800, fontSize: 11, color: COLORS.accent, letterSpacing: '1px', textTransform: 'uppercase' }}>
												task_link_closure
											</span>
										</div>
										{/* Column headers */}
										<div style={{
											display: 'grid', gridTemplateColumns: '1fr 1fr auto',
											padding: '6px 14px', gap: 8,
											background: `rgba(0,229,255,0.04)`,
											borderBottom: `1px solid ${COLORS.accent}18`,
										}}>
											{['ancestor', 'descendant', 'depth'].map(h => (
												<span key={h} style={{ fontSize: 9, fontWeight: 800, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.8 }}>{h}</span>
											))}
										</div>
										{/* Rows */}
										<div style={{ minHeight: 240 }}>
											{visibleRows.length === 0 && (
												<div style={{ padding: '16px 14px', fontSize: 11, color: COLORS.muted, fontFamily: 'monospace', fontStyle: 'italic' }}>
													No rows yet...
												</div>
											)}
											{visibleRows.map((row, i) => (
												<ClosureTableRow key={i} row={row} at={row.showAt} />
											))}
										</div>
										{/* Row count */}
										<div style={{
											borderTop: `1px solid rgba(255,255,255,0.05)`,
											padding: '7px 14px',
											display: 'flex', justifyContent: 'flex-end',
										}}>
											<span style={{ fontSize: 10, color: COLORS.muted, fontFamily: 'monospace' }}>
												{visibleRows.length} row{visibleRows.length !== 1 ? 's' : ''}
											</span>
										</div>
									</div>
								</Appear>
							)}
						</div>

						{/* ── COL 3: Read query ───────────── */}
						<div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
							{frame >= t.readQuery && (
								<>
									<Appear at={t.readQuery} y={-10}>
										<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
											<div style={{ width: 26, height: 26, borderRadius: '50%', background: COLORS.success, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13, color: '#000', boxShadow: `0 0 12px ${COLORS.success}88`, flexShrink: 0 }}>✓</div>
											<span style={{ fontSize: 12, fontWeight: 800, color: COLORS.success, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: 'Inter' }}>Single query, any depth</span>
										</div>
									</Appear>

									<SqlBlock
										at={t.readQuery}
										accentLines={[0, 7, 8, 9, 10]}
										lines={[
											'-- All tasks blocked by Design UI',
											'SELECT dst_task_id, depth',
											'FROM   task_link_closure',
											'WHERE  src_task_id = $1  -- T-1',
											'  AND  depth > 0',
											'ORDER BY depth;',
											'',
											'-- Result (instant, O(1) indexed scan):',
											'-- "Build API"   depth 1',
											'-- "Write Tests" depth 2',
											'',
										]}
									/>

									{frame >= t.readQuery + fps && (
										<Appear at={t.readQuery + fps} y={14}>
											<div style={{
												background: 'rgba(0,230,118,0.06)',
												border: `1px solid ${COLORS.success}30`,
												borderRadius: 10, padding: '12px 16px',
												display: 'flex', flexDirection: 'column', gap: 8,
											}}>
												{[
													{ icon: '⚡', text: 'Any depth in a single indexed SELECT' },
													{ icon: '🎯', text: 'Filter by depth = 1 for direct neighbors' },
													{ icon: '🔄', text: 'Reverse: find all blockers of Write Tests' },
												].map((item, i) => (
													<div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
														<span style={{ fontSize: 13 }}>{item.icon}</span>
														<span style={{ fontSize: 11, color: COLORS.muted, fontFamily: 'Inter' }}>{item.text}</span>
													</div>
												))}
											</div>
										</Appear>
									)}
								</>
							)}
						</div>
					</div>

					{/* ── Bottom banner ───────────────── */}
					<div style={{
						position: 'absolute', bottom: 22, left: 50, right: 50,
						opacity: bannerPop,
						transform: `translateY(${interpolate(bannerPop, [0, 1], [36, 0])}px)`,
						display: 'flex', justifyContent: 'center', zIndex: 30,
					}}>
						<div style={{
							background: `rgba(0,229,255,0.1)`,
							border: `2px solid ${COLORS.accent}`,
							color: COLORS.ink, padding: '12px 30px', borderRadius: 12,
							fontSize: 15, fontWeight: 800, fontFamily: 'Inter',
							boxShadow: `0 0 40px ${COLORS.accent}44`, backdropFilter: 'blur(10px)',
						}}>
							✅ &nbsp;O(1) indexed reads — any depth, no recursion, no joins
						</div>
					</div>

				</div>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
