import React from 'react';
import {
	AbsoluteFill, useVideoConfig, useCurrentFrame,
	spring, interpolate, Easing
} from 'remotion';
import { COLORS, GRADIENTS } from './components/Nodes';

/* ── Shared helpers ──────────────────────────────────── */

const glassBg: React.CSSProperties = {
	flex: 1,
	background: 'rgba(30, 41, 59, 0.2)',
	backdropFilter: 'blur(30px)',
	borderRadius: '20px',
	border: '1px solid rgba(255, 255, 255, 0.1)',
	boxShadow: '0 30px 80px rgba(0, 0, 0, 0.5), inset 0 0 40px rgba(255, 23, 68, 0.04)',
	position: 'relative',
	overflow: 'hidden',
};

const Appear: React.FC<{ at: number; children: React.ReactNode; y?: number; x?: number }> = ({ at, children, y = 16, x = 0 }) => {
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

/* ── Step badge (consistent with DenormalizationDrawback) ─ */
const StepBadge: React.FC<{ num: number; text: string; color?: string }> = ({ num, text, color = COLORS.danger }) => (
	<div style={{
		display: 'flex', alignItems: 'center', gap: 14,
		background: 'rgba(15, 23, 42, 0.7)', border: `1px solid ${color}44`,
		borderRadius: 12, padding: '13px 20px', backdropFilter: 'blur(10px)',
		boxShadow: `0 4px 20px rgba(0,0,0,0.4), 0 0 16px ${color}22`,
	}}>
		<div style={{
			width: 32, height: 32, borderRadius: '50%', background: color,
			display: 'flex', alignItems: 'center', justifyContent: 'center',
			fontWeight: 900, fontSize: 16, color: '#000', flexShrink: 0,
			boxShadow: `0 0 10px ${color}88`,
		}}>{num}</div>
		<span style={{ fontSize: 13, color: COLORS.ink, fontFamily: 'monospace', lineHeight: 1.4 }}>{text}</span>
	</div>
);

/* ── Closure row that can flash ──────────────────────── */
type ClosureRow = { ancestor: string; descendant: string; depth: number; isFlashing?: boolean };

const ClosureCard: React.FC<{
	rows: ClosureRow[]; flashStep: number;
	accentColor: string; flashColor?: string;
}> = ({ rows, flashStep, accentColor, flashColor = COLORS.danger }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const pulse = 0.5 + 0.5 * Math.sin((frame / fps) * Math.PI * 5);

	const depthColors: Record<number, string> = {
		0: COLORS.muted,
		1: COLORS.accent3,
		2: COLORS.accent2,
		3: COLORS.danger,
	};

	return (
		<div style={{
			background: 'rgba(15, 23, 42, 0.88)',
			borderRadius: 14, overflow: 'hidden',
			border: flashStep > 0 ? `2px solid ${flashColor}` : `1px solid ${accentColor}55`,
			backdropFilter: 'blur(12px)',
			boxShadow: flashStep > 0
				? `0 0 ${16 + pulse * 28}px ${flashColor}88, 0 8px 28px rgba(0,0,0,0.5)`
				: `0 8px 28px rgba(0,0,0,0.5), 0 0 20px ${accentColor}18`,
			fontFamily: 'Inter', minWidth: 310,
		}}>
			{/* Header */}
			<div style={{
				background: flashStep > 0
					? `linear-gradient(90deg, ${flashColor}44, ${accentColor}22)`
					: `linear-gradient(90deg, ${accentColor}2a, transparent)`,
				borderBottom: `1px solid ${flashStep > 0 ? flashColor : accentColor}44`,
				padding: '10px 16px',
				display: 'flex', alignItems: 'center', gap: 8,
			}}>
				<div style={{ width: 6, height: 6, borderRadius: 2, background: flashStep > 0 ? flashColor : accentColor }} />
				<span style={{ fontWeight: 800, fontSize: 12, color: flashStep > 0 ? flashColor : accentColor, letterSpacing: '1px', textTransform: 'uppercase' }}>
					task_link_closure
				</span>
			</div>
			{/* Column headers */}
			<div style={{
				display: 'grid', gridTemplateColumns: '1fr 1fr auto',
				padding: '5px 16px', gap: 8,
				background: 'rgba(0,229,255,0.04)',
				borderBottom: '1px solid rgba(255,255,255,0.06)',
			}}>
				{['ancestor', 'descendant', 'depth'].map(h => (
					<span key={h} style={{ fontSize: 9, fontWeight: 800, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.8 }}>{h}</span>
				))}
			</div>
			{/* Rows */}
			{rows.map((row, i) => {
				const dc = depthColors[row.depth] ?? COLORS.warning;
				return (
					<div key={i} style={{
						display: 'grid', gridTemplateColumns: '1fr 1fr auto',
						padding: '6px 16px', gap: 8,
						borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
						background: row.isFlashing ? `rgba(255,23,68,${0.12 + pulse * 0.08})` : 'transparent',
						borderLeft: row.isFlashing ? `4px solid ${COLORS.danger}` : '4px solid transparent',
					}}>
						<span style={{ fontSize: 11, fontFamily: 'monospace', color: row.isFlashing ? COLORS.danger : COLORS.ink, fontWeight: row.isFlashing ? 700 : 400 }}>
							{row.ancestor}
						</span>
						<span style={{ fontSize: 11, fontFamily: 'monospace', color: row.isFlashing ? COLORS.danger : COLORS.ink, fontWeight: row.isFlashing ? 700 : 400 }}>
							{row.descendant}
						</span>
						<span style={{ fontSize: 10, fontWeight: 800, color: dc, background: `${dc}18`, padding: '2px 8px', borderRadius: 10, whiteSpace: 'nowrap' }}>
							depth {row.depth}
						</span>
					</div>
				);
			})}
		</div>
	);
};

/* ── Arrow (from DenormalizationDrawback style) ──────── */
const Arrow: React.FC<{ x1: number; y1: number; x2: number; y2: number; color?: string }> = ({ x1, y1, x2, y2, color = COLORS.warning }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const progress = spring({ frame, fps, config: { damping: 16, stiffness: 120 } });
	const cx = (x1 + x2) / 2;
	const cy = Math.min(y1, y2) - 30;
	const path = `M ${x1} ${y1} Q ${cx} ${cy}, ${x2} ${y2}`;
	const len = Math.hypot(x2 - x1, y2 - y1) * 1.3;
	return (
		<svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 50 }}>
			<defs>
				<marker id={`ctd-arrowhead-${color.replace('#', '')}`} markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
					<polygon points="0 0, 8 3, 0 6" fill={color} opacity={0.9} />
				</marker>
			</defs>
			<path d={path} fill="none" stroke={color} strokeWidth={2.5}
				strokeDasharray={len} strokeDashoffset={len * (1 - progress)}
				strokeLinecap="round"
				markerEnd={`url(#ctd-arrowhead-${color.replace('#', '')})`}
				style={{ filter: `drop-shadow(0 0 6px ${color}88)` }}
			/>
		</svg>
	);
};

/* ════════════════════════════════════════════════════════ */
export const ClosureTableDrawback: React.FC = () => {
	const { fps } = useVideoConfig();
	const frame = useCurrentFrame();

	/*
	  Scenario:
	  Existing closure (from prev slide): Design UI→Build API, Build API→Write Tests (all rows filled)
	  Now: user inserts ONE more link — "Write Tests" → "Deploy"

	  Rows that must be written:
	    Step 1 — The direct edge: Write Tests → Deploy (depth 1)
	    Step 2 — Walk ancestors of "Write Tests": {Build API, Design UI}
	              Build API  → Deploy  (depth 2)
	    Step 3 — Walk ancestors of "Write Tests": {Design UI}
	              Design UI  → Deploy  (depth 3)

	  Total: 3 extra rows for just 1 link insert.
	  And if "Deploy" had its own descendants it would multiply further.
	*/

	const step1 = frame >= fps * 2.5;
	const step2 = frame >= fps * 5.0;
	const step3 = frame >= fps * 7.5;


	const steps = [
		{ frame: 0,         text: 'Existing graph with rows...' },
		{ frame: fps * 2.5, text: 'Step 1: Direct edge row...' },
		{ frame: fps * 5.0, text: 'Step 2: Walk ancestors — Build API...' },
		{ frame: fps * 7.5, text: 'Step 3: Walk ancestors — Design UI...' },
		{ frame: fps * 9.5, text: 'Write Amplification!' },
	];
	const currentStep = [...steps].reverse().find(s => frame >= s.frame) || steps[0];

	const showTables = spring({ frame: frame - fps * 0.5, fps });
	const showBadge1 = spring({ frame: frame - fps * 2.5, fps, config: { damping: 14 } });
	const showBadge2 = spring({ frame: frame - fps * 5.0, fps, config: { damping: 14 } });
	const showBadge3 = spring({ frame: frame - fps * 7.5, fps, config: { damping: 14 } });
	const warningPop = spring({ frame: frame - fps * 9.5, fps, config: { damping: 12, stiffness: 120 } });

	// Pre-existing rows (depth 0 self-rows + link 1 + link 2 rows)
	const existingRows: ClosureRow[] = [
		{ ancestor: 'Design UI',   descendant: 'Design UI',   depth: 0 },
		{ ancestor: 'Build API',   descendant: 'Build API',   depth: 0 },
		{ ancestor: 'Write Tests', descendant: 'Write Tests', depth: 0 },
		{ ancestor: 'Design UI',   descendant: 'Build API',   depth: 1 },
		{ ancestor: 'Build API',   descendant: 'Write Tests', depth: 1 },
		{ ancestor: 'Design UI',   descendant: 'Write Tests', depth: 2 },
	];

	// New rows written per step
	const newRow1: ClosureRow   = { ancestor: 'Write Tests', descendant: 'Deploy', depth: 1, isFlashing: step1 && !step2 };
	const newRow2: ClosureRow   = { ancestor: 'Build API',   descendant: 'Deploy', depth: 2, isFlashing: step2 && !step3 };
	const newRow3: ClosureRow   = { ancestor: 'Design UI',   descendant: 'Deploy', depth: 3, isFlashing: step3 };

	const visibleRows: ClosureRow[] = [
		...existingRows,
		...(step1 ? [newRow1] : []),
		...(step2 ? [newRow2] : []),
		...(step3 ? [newRow3] : []),
	];

	const flashStep = step3 ? 3 : step2 ? 2 : step1 ? 1 : 0;

	return (
		<AbsoluteFill style={{ background: GRADIENTS.bg }}>
			<AbsoluteFill style={{ padding: '20px' }}>
				<div style={glassBg}>

					{/* ── Progress chip ───────────────── */}
					<div style={{
						position: 'absolute', top: 28, left: 30, zIndex: 100,
						background: 'rgba(15, 23, 42, 0.6)', padding: '10px 18px',
						borderRadius: '12px', border: '1px solid rgba(255, 23, 68, 0.3)',
						backdropFilter: 'blur(12px)', boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
						display: 'flex', alignItems: 'center', gap: '10px',
					}}>
						<div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.danger, boxShadow: `0 0 8px ${COLORS.danger}` }} />
						<span style={{ fontSize: 13, fontWeight: 700, color: COLORS.ink, fontFamily: 'Inter', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
							{currentStep.text}
						</span>
					</div>

					{/* ── Headline ────────────────────── */}
					<div style={{ position: 'absolute', top: 90, left: 50, right: 50 }}>
						<Appear at={0} y={-15}>
							<h2 style={{ color: COLORS.danger, fontFamily: 'Inter', fontSize: 28, margin: 0, fontWeight: 900 }}>
								The Drawback: Write Amplification
							</h2>
							<p style={{ color: COLORS.muted, fontFamily: 'Inter', fontSize: 14, margin: '8px 0 0', lineHeight: 1.6 }}>
								Adding <em>one</em> link — <code style={{ color: COLORS.warning, background: 'rgba(255,214,0,0.08)', padding: '1px 6px', borderRadius: 4 }}>Write Tests → Deploy</code> —
								requires walking every ancestor of the source and writing a row for each.
								Cost is <strong style={{ color: COLORS.danger }}>(A+1) × (D+1)</strong> rows per insert.
							</p>
						</Appear>
					</div>

					{/* ── Left: Closure Table ─────────── */}
					<div style={{
						position: 'absolute', top: 210, left: 50,
						opacity: showTables, transform: `scale(${showTables})`, transformOrigin: 'top left',
					}}>
						<ClosureCard
							rows={visibleRows}
							flashStep={flashStep}
							accentColor={COLORS.accent}
							flashColor={COLORS.danger}
						/>
					</div>

					{/* ── Right: Step badges ──────────── */}
					<div style={{
						position: 'absolute', top: 86, right: 30, zIndex: 100,
						display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 520,
					}}>
						<div style={{ opacity: showBadge1, transform: `translateX(${interpolate(showBadge1, [0, 1], [60, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) })}px)` }}>
							<StepBadge
								num={1}
								text={`INSERT: Write Tests → Deploy  (depth 1)  ← direct edge`}
								color={COLORS.danger}
							/>
						</div>
						<div style={{ opacity: showBadge2, transform: `translateX(${interpolate(showBadge2, [0, 1], [60, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) })}px)` }}>
							<StepBadge
								num={2}
								text={`ancestor Build API → Deploy  (depth 2)  ← Walk ancestors`}
								color={COLORS.warning}
							/>
						</div>
						<div style={{ opacity: showBadge3, transform: `translateX(${interpolate(showBadge3, [0, 1], [60, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) })}px)` }}>
							<StepBadge
								num={3}
								text={`ancestor Design UI → Deploy  (depth 3)  ← Walk deeper`}
								color={COLORS.warning}
							/>
						</div>
					</div>

					{/* ── Animated arrows (table → badges) */}
					{step1 && (
						<div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
							<Arrow x1={370} y1={350} x2={760} y2={175} color={COLORS.danger} />
						</div>
					)}
					{step2 && (
						<div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
							<Arrow x1={370} y1={390} x2={760} y2={240} color={COLORS.warning} />
						</div>
					)}

					{/* ── Formula box ─────────────────── */}
					{step3 && (
						<Appear at={fps * 7.5} y={20}>
							<div style={{
								position: 'absolute', bottom: 120, left: 50,
								background: 'rgba(255,214,0,0.08)',
								border: `1.5px solid ${COLORS.warning}55`,
								borderRadius: 12, padding: '14px 22px',
								textAlign: 'center', minWidth: 310,
							}}>
								<div style={{ fontSize: 10, fontWeight: 800, color: COLORS.warning, textTransform: 'uppercase', letterSpacing: 1.2, fontFamily: 'Inter', marginBottom: 8 }}>
									Rows written per link insert
								</div>
								<div style={{ fontSize: 20, fontFamily: 'monospace', fontWeight: 800, color: COLORS.ink }}>
									<span style={{ color: COLORS.accent }}>(A + 1)</span>
									{' × '}
									<span style={{ color: COLORS.success }}>(D + 1)</span>
									{' = '}
									<span style={{ color: COLORS.danger }}>3 rows</span>
								</div>
								<div style={{ fontSize: 11, color: COLORS.muted, fontFamily: 'Inter', marginTop: 6 }}>
									A = 2 ancestors of "Write Tests" &nbsp;·&nbsp; D = 0 descendants of "Deploy"
								</div>
							</div>
						</Appear>
					)}

					{/* ── Warning banner ──────────────── */}
					<div style={{
						position: 'absolute', bottom: 32, left: 50, right: 50,
						opacity: warningPop,
						transform: `translateY(${interpolate(warningPop, [0, 1], [40, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.175, 0.885, 0.32, 1.275) })}px)`,
						display: 'flex', justifyContent: 'center', zIndex: 30,
					}}>
						<div style={{
							background: 'rgba(255,23,68,0.18)', border: `2px solid ${COLORS.danger}`,
							color: COLORS.ink, padding: '14px 32px', borderRadius: 12,
							fontSize: 18, fontWeight: 800, fontFamily: 'Inter',
							boxShadow: `0 0 40px rgba(255,23,68,0.45)`, backdropFilter: 'blur(10px)',
							letterSpacing: '0.5px',
						}}>
							⚠️ &nbsp;1 link insert cascades into 3 closure rows — Write Amplification
						</div>
					</div>

				</div>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
