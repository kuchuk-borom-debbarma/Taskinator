import React from 'react';
import {
	AbsoluteFill, Sequence, useVideoConfig, useCurrentFrame,
	spring, interpolate
} from 'remotion';
import { COLORS, GRADIENTS } from './components/Nodes';

/* ── Shared design tokens ────────────────────────────── */
const glassBg: React.CSSProperties = {
	flex: 1,
	background: 'rgba(30, 41, 59, 0.2)',
	backdropFilter: 'blur(30px)',
	borderRadius: '20px',
	border: '1px solid rgba(255, 255, 255, 0.1)',
	boxShadow: '0 30px 80px rgba(0, 0, 0, 0.5), inset 0 0 40px rgba(0, 230, 118, 0.04)',
	position: 'relative',
	overflow: 'hidden',
};

/* ── Progress chip (top-left) ────────────────────────── */
const StepChip: React.FC<{ steps: { frame: number; text: string }[]; segmentFrame: number; fps: number }> = ({ steps, segmentFrame, fps }) => {
	const current = [...steps].reverse().find(s => segmentFrame >= s.frame) || steps[0];
	return (
		<div style={{
			position: 'absolute', top: 30, left: 30, zIndex: 100,
			background: 'rgba(15, 23, 42, 0.6)', padding: '10px 18px',
			borderRadius: '12px', border: '1px solid rgba(0, 230, 118, 0.25)',
			backdropFilter: 'blur(12px)', boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
			display: 'flex', alignItems: 'center', gap: '10px',
		}}>
			<div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.success, boxShadow: `0 0 8px ${COLORS.success}` }} />
			<span style={{ fontSize: 13, fontWeight: 700, color: COLORS.ink, fontFamily: 'Inter', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
				{current.text}
			</span>
		</div>
	);
};

/* ── Compact table card ──────────────────────────────── */
type Col = { name: string; type: string; isPk?: boolean; isFk?: boolean; isDenorm?: boolean };
const TableCard: React.FC<{ title: string; cols: Col[]; accentColor: string }> = ({ title, cols, accentColor }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const pulse = 0.5 + 0.5 * Math.sin((frame / fps) * Math.PI * 2.5);

	return (
		<div style={{
			background: 'rgba(15, 23, 42, 0.85)', borderRadius: 14, overflow: 'hidden',
			border: `1px solid ${accentColor}55`, backdropFilter: 'blur(12px)',
			boxShadow: `0 8px 28px rgba(0,0,0,0.5), 0 0 24px ${accentColor}18`,
			fontFamily: 'Inter', minWidth: 220,
		}}>
			<div style={{
				background: `linear-gradient(90deg, ${accentColor}2a, transparent)`,
				borderBottom: `1px solid ${accentColor}44`,
				padding: '10px 16px', fontWeight: 800, fontSize: 14,
				letterSpacing: '1px', color: accentColor,
			}}>{title}</div>
			{cols.map((col, i) => (
				<div key={i} style={{
					display: 'flex', justifyContent: 'space-between', alignItems: 'center',
					padding: '7px 16px',
					borderBottom: i < cols.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
					background: col.isDenorm ? `rgba(0,230,118,${0.07 + pulse * 0.06})` : 'transparent',
					borderLeft: col.isDenorm ? `3px solid rgba(0,230,118,${0.55 + pulse * 0.45})` : '3px solid transparent',
					boxShadow: col.isDenorm ? `inset 0 0 16px rgba(0,230,118,${0.04 + pulse * 0.04})` : 'none',
				}}>
					<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
						{col.isPk && <span style={{ fontSize: 9, fontWeight: 800, color: COLORS.warning, background: 'rgba(255,214,0,0.12)', padding: '1px 5px', borderRadius: 3 }}>PK</span>}
						{col.isFk && !col.isPk && <span style={{ fontSize: 9, fontWeight: 800, color: COLORS.accent3, background: 'rgba(0,230,118,0.1)', padding: '1px 5px', borderRadius: 3 }}>FK</span>}
						{col.isDenorm && (
							<span style={{ fontSize: 9, fontWeight: 900, color: '#000', background: COLORS.success, padding: '1px 6px', borderRadius: 3, boxShadow: `0 0 8px ${COLORS.success}` }}>★</span>
						)}
						<span style={{
							fontSize: 12, fontWeight: col.isPk || col.isFk || col.isDenorm ? 700 : 400,
							color: col.isPk ? COLORS.warning : col.isDenorm ? COLORS.success : col.isFk ? COLORS.accent3 : COLORS.ink,
						}}>
							{col.name}
						</span>
					</div>
					<span style={{ fontSize: 11, color: COLORS.muted, fontFamily: 'monospace' }}>{col.type}</span>
				</div>
			))}
		</div>
	);
};

/* ── Query comparison block ──────────────────────────── */
const QueryCard: React.FC<{ label: string; queries: { text: string; color: string }[]; borderColor: string }> = ({ label, queries, borderColor }) => (
	<div style={{
		background: 'rgba(15, 23, 42, 0.8)', border: `1px solid ${borderColor}44`,
		borderTop: `3px solid ${borderColor}`, borderRadius: 12, padding: '16px 20px',
		backdropFilter: 'blur(10px)', flex: 1,
	}}>
		<div style={{ fontSize: 11, fontWeight: 800, color: borderColor, letterSpacing: 1.5, marginBottom: 12, textTransform: 'uppercase' }}>{label}</div>
		{queries.map((q, i) => (
			<div key={i} style={{
				fontFamily: 'monospace', fontSize: 12, color: q.color,
				padding: '5px 0', borderBottom: i < queries.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
				lineHeight: 1.5,
			}}>{q.text}</div>
		))}
	</div>
);

/* ── Animated wrapper ────────────────────────────────── */
const Appear: React.FC<{ at: number; children: React.ReactNode; x?: number; y?: number }> = ({ at, children, x = 0, y = 20 }) => {
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

/* ── Schema data ─────────────────────────────────────── */
const projectCols: Col[] = [
	{ name: 'id', type: 'UUID', isPk: true },
	{ name: 'name', type: 'TEXT' },
	{ name: 'fk_user_id', type: 'TEXT', isFk: true },
	{ name: 'members_count', type: 'INTEGER', isDenorm: true },
	{ name: 'tasks_count', type: 'INTEGER', isDenorm: true },
	{ name: 'teams_count', type: 'INTEGER', isDenorm: true },
];

const teamCols: Col[] = [
	{ name: 'id', type: 'UUID', isPk: true },
	{ name: 'name', type: 'TEXT' },
	{ name: 'fk_project_id', type: 'UUID', isFk: true },
	{ name: 'members_count', type: 'INTEGER', isDenorm: true },
	{ name: 'tasks_count', type: 'INTEGER', isDenorm: true },
];

/* ════════════════════════════════════════════════════════ */
export const DenormalizationSolution: React.FC = () => {
	const { fps, width } = useVideoConfig();
	const frame = useCurrentFrame();
	const segmentFrame = frame;

	const steps = [
		{ frame: 0,        text: 'Adding Count Columns...' },
		{ frame: fps * 2,  text: 'Showing Updated Schema...' },
		{ frame: fps * 4,  text: 'Comparing Queries...' },
		{ frame: fps * 7,  text: 'Zero Joins. Zero Overhead.' },
	];

	return (
		<AbsoluteFill style={{ background: GRADIENTS.bg }}>
			<AbsoluteFill style={{ padding: '20px' }}>
				<div style={glassBg}>
					<StepChip steps={steps} segmentFrame={segmentFrame} fps={fps} />

					{/* Headline */}
					<div style={{ position: 'absolute', top: 90, left: 50, right: 50 }}>
						<Appear at={0} y={-15}>
							<h2 style={{ color: COLORS.success, fontFamily: 'Inter', fontSize: 28, margin: 0, fontWeight: 900 }}>
								Solution: Denormalized Count Columns
							</h2>
							<p style={{ color: COLORS.muted, fontFamily: 'Inter', fontSize: 14, margin: '8px 0 0', lineHeight: 1.6 }}>
								Store aggregate counts <em>directly on the parent row</em>. Read time requires no joins — counts are always pre-computed.
							</p>
						</Appear>
					</div>

					{/* Tables */}
					<div style={{ position: 'absolute', top: 175, left: 50 }}>
						<Appear at={fps * 1} x={-30} y={0}>
							<TableCard title="project" cols={projectCols} accentColor={COLORS.accent} />
						</Appear>
					</div>

					<div style={{ position: 'absolute', top: 175, left: 310 }}>
						<Appear at={fps * 1.5} x={-30} y={0}>
							<TableCard title="project_team" cols={teamCols} accentColor={COLORS.accent2} />
						</Appear>
					</div>

					{/* Legend */}
					<div style={{ position: 'absolute', top: 180, left: 570 }}>
						<Appear at={fps * 2} x={30} y={0}>
							<div style={{
								background: 'rgba(0,230,118,0.08)', border: `1px solid ${COLORS.success}44`,
								borderLeft: `4px solid ${COLORS.success}`,
								borderRadius: 12, padding: '16px 20px', maxWidth: 270,
							}}>
								<div style={{ fontSize: 12, fontWeight: 800, color: COLORS.success, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
									★ Denormalized Columns
								</div>
								<div style={{ fontSize: 13, color: COLORS.ink, fontFamily: 'Inter', lineHeight: 1.7 }}>
									These values are <strong style={{ color: COLORS.success }}>incrementally maintained</strong> on every write.
									No GROUP BY. No COUNT(*). No joins at read time.
								</div>
							</div>
						</Appear>
					</div>

					{/* Query comparison */}
					<div style={{ position: 'absolute', top: 450, left: 50, right: 50 }}>
						<Sequence from={fps * 4}>
							<Appear at={0} y={30}>
								<div style={{ display: 'flex', gap: 20, alignItems: 'stretch' }}>
									<QueryCard
										label="Before — 4 Round Trips"
										borderColor={COLORS.danger}
										queries={[
											{ text: 'SELECT * FROM project WHERE id = ?', color: COLORS.ink },
											{ text: 'SELECT COUNT(*) FROM project_member...', color: COLORS.warning },
											{ text: 'SELECT COUNT(*) FROM project_team...', color: COLORS.warning },
											{ text: 'SELECT COUNT(*) FROM project_task...', color: COLORS.warning },
										]}
									/>
									<div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
										<span style={{ fontSize: 28, color: COLORS.success }}>→</span>
									</div>
									<QueryCard
										label="After — 1 Query"
										borderColor={COLORS.success}
										queries={[
											{ text: 'SELECT id, name,', color: COLORS.ink },
											{ text: '  members_count, tasks_count, teams_count', color: COLORS.success },
											{ text: 'FROM project WHERE id = ?', color: COLORS.ink },
											{ text: '✓  No joins. Counts pre-stored.', color: COLORS.success },
										]}
									/>
								</div>
							</Appear>
						</Sequence>
					</div>
				</div>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
