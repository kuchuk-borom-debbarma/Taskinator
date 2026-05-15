import React from 'react';
import {
	AbsoluteFill, Sequence, useVideoConfig, useCurrentFrame,
	spring
} from 'remotion';
import { COLORS, GRADIENTS } from './components/Nodes';
import { TitleCard } from './components/TitleCard';
// import { TypographyIntro } from './components/TypographyIntro';
import { QueryProblem } from './QueryProblem';
import { DenormalizationSolution } from './DenormalizationSolution';
import { DenormalizationDrawback } from './DenormalizationDrawback';
import { TaskLinkProblem } from './TaskLinkProblem';
import { ClosureTableSolution } from './ClosureTableSolution';
import { ClosureTableDrawback } from './ClosureTableDrawback';

/* ════════════════════════════════════════════════════════
   DESIGN TOKENS
════════════════════════════════════════════════════════ */

type ColDef = {
	name: string;
	type: string;
	isPk?: boolean;
	isFk?: boolean;
};

/* ════════════════════════════════════════════════════════
   SCHEMA DATA
════════════════════════════════════════════════════════ */

const SCHEMA: Record<string, ColDef[]> = {
	project: [
		{ name: 'id',          type: 'UUID',      isPk: true },
		{ name: 'name',        type: 'TEXT' },
		{ name: 'description', type: 'TEXT' },
		{ name: 'fk_user_id',  type: 'TEXT',      isFk: true },
		{ name: 'version',     type: 'INTEGER' },
		{ name: 'created_at',  type: 'TIMESTAMPTZ' },
	],
	project_member: [
		{ name: 'id',             type: 'UUID',    isPk: true },
		{ name: 'fk_project_id',  type: 'UUID',    isFk: true },
		{ name: 'fk_user_id',     type: 'TEXT',    isFk: true },
		{ name: 'version',        type: 'INTEGER' },
		{ name: 'created_at',     type: 'TIMESTAMPTZ' },
	],
	project_team: [
		{ name: 'id',            type: 'UUID',  isPk: true },
		{ name: 'name',          type: 'TEXT' },
		{ name: 'fk_project_id', type: 'UUID',  isFk: true },
		{ name: 'fk_user_id',    type: 'TEXT',  isFk: true },
		{ name: 'version',       type: 'INTEGER' },
		{ name: 'created_at',    type: 'TIMESTAMPTZ' },
	],
	project_team_member: [
		{ name: 'id',            type: 'UUID',  isPk: true },
		{ name: 'fk_project_id', type: 'UUID',  isFk: true },
		{ name: 'fk_team_id',    type: 'UUID',  isFk: true },
		{ name: 'fk_user_id',    type: 'TEXT',  isFk: true },
		{ name: 'version',       type: 'INTEGER' },
		{ name: 'created_at',    type: 'TIMESTAMPTZ' },
	],
	project_task: [
		{ name: 'id',           type: 'UUID',  isPk: true },
		{ name: 'fk_project_id',type: 'UUID',  isFk: true },
		{ name: 'fk_team_id',   type: 'UUID',  isFk: true },
		{ name: 'fk_member_id', type: 'TEXT',  isFk: true },
		{ name: 'title',        type: 'TEXT' },
		{ name: 'status',       type: 'TEXT' },
		{ name: 'priority',     type: 'INTEGER' },
		{ name: 'version',      type: 'INTEGER' },
		{ name: 'created_at',   type: 'TIMESTAMPTZ' },
	],
	task_link: [
		{ name: 'id',             type: 'UUID', isPk: true },
		{ name: 'fk_project_id',  type: 'UUID', isFk: true },
		{ name: 'source_task_id', type: 'UUID', isFk: true },
		{ name: 'target_task_id', type: 'UUID', isFk: true },
		{ name: 'label',          type: 'TEXT' },
		{ name: 'created_by',     type: 'TEXT' },
		{ name: 'created_at',     type: 'TIMESTAMPTZ' },
	],
};

/* ════════════════════════════════════════════════════════
   TABLE CARD
════════════════════════════════════════════════════════ */

const EntityCard: React.FC<{
	name: string;
	cols: ColDef[];
	color: string;
	showAt: number;
}> = ({ name, cols, color, showAt }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const s = spring({ frame: frame - showAt, fps, config: { damping: 14, stiffness: 120 } });

	return (
		<div style={{
			opacity: s,
			transform: `scale(${s})`,
			background: 'rgba(13, 18, 30, 0.92)',
			borderRadius: 14,
			overflow: 'hidden',
			border: `1px solid ${color}40`,
			backdropFilter: 'blur(16px)',
			boxShadow: `0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px ${color}18, 0 0 28px ${color}14`,
			fontFamily: 'Inter, system-ui, sans-serif',
			minWidth: 230,
		}}>
			{/* Table name header */}
			<div style={{
				background: `linear-gradient(100deg, ${color}28 0%, ${color}08 100%)`,
				borderBottom: `1px solid ${color}35`,
				padding: '11px 16px',
				display: 'flex', alignItems: 'center', gap: 10,
			}}>
				<div style={{ width: 8, height: 8, borderRadius: 2, background: color, boxShadow: `0 0 8px ${color}` }} />
				<span style={{ fontWeight: 800, fontSize: 13, color, letterSpacing: '1.2px', textTransform: 'uppercase' }}>
					{name}
				</span>
			</div>

			{/* Columns */}
			{cols.map((col, i) => (
				<div key={i} style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					padding: '6px 16px',
					borderBottom: i < cols.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
					gap: 20,
				}}>
					<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
						{col.isPk && (
							<span style={{ fontSize: 9, fontWeight: 800, color: COLORS.warning, letterSpacing: 0.5, background: 'rgba(255,214,0,0.1)', padding: '1px 5px', borderRadius: 3 }}>PK</span>
						)}
						{col.isFk && !col.isPk && (
							<span style={{ fontSize: 9, fontWeight: 800, color: COLORS.accent3, letterSpacing: 0.5, background: 'rgba(0,230,118,0.1)', padding: '1px 5px', borderRadius: 3 }}>FK</span>
						)}
						<span style={{ fontSize: 12, color: col.isPk ? COLORS.warning : col.isFk ? COLORS.accent3 : COLORS.ink, fontWeight: col.isPk || col.isFk ? 600 : 400 }}>
							{col.name}
						</span>
					</div>
					<span style={{ fontSize: 11, color: COLORS.muted, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
						{col.type}
					</span>
				</div>
			))}
		</div>
	);
};

/* ════════════════════════════════════════════════════════
   ANIMATED FK LINK (SVG)
════════════════════════════════════════════════════════ */

const FkLine: React.FC<{
	from: { x: number; y: number };
	to: { x: number; y: number };
	color?: string;
	showAt: number;
}> = ({ from, to, color = COLORS.accent, showAt }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const progress = spring({ frame: frame - showAt, fps, config: { damping: 20, stiffness: 120 } });

	const dx = to.x - from.x;
	const dy = to.y - from.y;
	// const len = Math.sqrt(dx * dx + dy * dy);

	// Animated endpoint
	const cx = from.x + dx * progress;
	const cy = from.y + dy * progress;

	const markerId = `arrow-${color.replace('#', '')}`;

	return (
		<svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5, overflow: 'visible' }}>
			<defs>
				<marker id={markerId} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
					<path d="M 0 0 L 6 3 L 0 6 z" fill={color} opacity={0.9} />
				</marker>
			</defs>
			{/* Ghost track */}
			<line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={color} strokeWidth={1} opacity={0.1} />
			{/* Animated line */}
			<line
				x1={from.x} y1={from.y}
				x2={cx} y2={cy}
				stroke={color} strokeWidth={1.5}
				strokeLinecap="round"
				markerEnd={progress > 0.85 ? `url(#${markerId})` : undefined}
				style={{ filter: `drop-shadow(0 0 3px ${color}66)` }}
			/>
			{/* Glow dot at tip */}
			<circle cx={cx} cy={cy} r={3} fill={color} opacity={progress} style={{ filter: `drop-shadow(0 0 5px ${color})` }} />
		</svg>
	);
};

/* ════════════════════════════════════════════════════════
   PROGRESS INDICATOR
════════════════════════════════════════════════════════ */

const ProgressIndicator: React.FC<{ segmentFrame: number; fps: number }> = ({ segmentFrame, fps }) => {
	const steps = [
		{ frame: 0,        text: 'Introducing Entities...' },
		{ frame: fps * 1,  text: 'Project Members...' },
		{ frame: fps * 2,  text: 'Teams & Team Members...' },
		{ frame: fps * 4,  text: 'Tasks...' },
		{ frame: fps * 6,  text: 'Task Links...' },
		{ frame: fps * 8,  text: 'FK Relationships...' },
	];
	const current = [...steps].reverse().find(s => segmentFrame >= s.frame) || steps[0];

	return (
		<div style={{
			position: 'absolute', top: 30, left: 30, zIndex: 100,
			background: 'rgba(15, 23, 42, 0.65)', padding: '10px 18px',
			borderRadius: 12, border: '1px solid rgba(0, 229, 255, 0.2)',
			backdropFilter: 'blur(14px)', boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
			display: 'flex', alignItems: 'center', gap: 10,
		}}>
			<div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.accent, boxShadow: `0 0 8px ${COLORS.accent}` }} />
			<span style={{ fontSize: 12, fontWeight: 700, color: COLORS.ink, fontFamily: 'Inter', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
				{current.text}
			</span>
		</div>
	);
};

/* ════════════════════════════════════════════════════════
   SCHEMA SCENE (main canvas)
════════════════════════════════════════════════════════ */

const SchemaScene: React.FC = () => {
	const { fps } = useVideoConfig();
	const frame = useCurrentFrame();
	const segmentFrame = frame;

	// Card dimensions
	// Header: 36px, each row: 26px (6px top + 6px bottom padding + ~14px text)
	const ROW_H = 26;
	const HEADER_H = 36;
	const cardH = (table: string) => HEADER_H + SCHEMA[table as keyof typeof SCHEMA].length * ROW_H;
	const CARD_W = 250;

	// Layout: glass panel is ~1240px wide (1280 - 2×20px padding)
	// Row 1: 4 cards × 250 = 1000px content. Gap = (1240 - 1000) / 5 ≈ 48px.
	// Using 30px margin + 50px gaps between cards.
	const pos = {
		project:             { x:  30, y:  80 },
		project_member:      { x: 330, y:  80 },
		project_team:        { x: 630, y:  80 },
		project_team_member: { x: 930, y:  80 },
		project_task:        { x: 260, y: 390 },
		task_link:           { x: 660, y: 390 },
	};

	const mid = (key: keyof typeof pos, side: 'r' | 'b' | 'l' | 't') => {
		const p = pos[key];
		const h = cardH(key);
		switch (side) {
			case 'r': return { x: p.x + CARD_W,      y: p.y + h / 2 };
			case 'l': return { x: p.x,                y: p.y + h / 2 };
			case 'b': return { x: p.x + CARD_W / 2,  y: p.y + h     };
			case 't': return { x: p.x + CARD_W / 2,  y: p.y         };
		}
	};

	return (
		<AbsoluteFill style={{ padding: '20px' }}>
			<div style={{
				flex: 1,
				background: 'rgba(30, 41, 59, 0.18)',
				backdropFilter: 'blur(30px)',
				borderRadius: '20px',
				border: '1px solid rgba(255, 255, 255, 0.08)',
				boxShadow: '0 30px 80px rgba(0,0,0,0.55), inset 0 0 60px rgba(0,229,255,0.04)',
				position: 'relative',
				overflow: 'hidden',
			}}>
				<ProgressIndicator segmentFrame={segmentFrame} fps={fps} />

				{/* ── Tables ───────────────────────────────── */}
				<div style={{ position: 'absolute', left: pos.project.x, top: pos.project.y }}>
					<EntityCard name="project" cols={SCHEMA.project} color={COLORS.accent} showAt={0} />
				</div>
				<div style={{ position: 'absolute', left: pos.project_member.x, top: pos.project_member.y }}>
					<EntityCard name="project_member" cols={SCHEMA.project_member} color={COLORS.accent2} showAt={fps * 1} />
				</div>
				<div style={{ position: 'absolute', left: pos.project_team.x, top: pos.project_team.y }}>
					<EntityCard name="project_team" cols={SCHEMA.project_team} color={COLORS.accent} showAt={fps * 2} />
				</div>
				<div style={{ position: 'absolute', left: pos.project_team_member.x, top: pos.project_team_member.y }}>
					<EntityCard name="project_team_member" cols={SCHEMA.project_team_member} color={COLORS.accent3} showAt={fps * 3} />
				</div>
				<div style={{ position: 'absolute', left: pos.project_task.x, top: pos.project_task.y }}>
					<EntityCard name="project_task" cols={SCHEMA.project_task} color={COLORS.success} showAt={fps * 4} />
				</div>
				<div style={{ position: 'absolute', left: pos.task_link.x, top: pos.task_link.y }}>
					<EntityCard name="task_link" cols={SCHEMA.task_link} color={COLORS.warning} showAt={fps * 6} />
				</div>

				{/* ── FK Lines — only clean neighbor connections ── */}
				{/* project → project_member */}
				<Sequence from={fps * 8} layout="none">
					<FkLine from={mid('project', 'r')} to={mid('project_member', 'l')} color={COLORS.accent} showAt={0} />
				</Sequence>
				{/* project_team → project_team_member */}
				<Sequence from={fps * 8.5} layout="none">
					<FkLine from={mid('project_team', 'r')} to={mid('project_team_member', 'l')} color={COLORS.accent3} showAt={0} />
				</Sequence>
				{/* project_task → task_link */}
				<Sequence from={fps * 9} layout="none">
					<FkLine from={mid('project_task', 'r')} to={mid('task_link', 'l')} color={COLORS.warning} showAt={0} />
				</Sequence>
			</div>
		</AbsoluteFill>
	);
};


/* ════════════════════════════════════════════════════════
   ROOT COMPOSITION
════════════════════════════════════════════════════════ */

export const SchemaDesign: React.FC = () => {
	const { fps } = useVideoConfig();

	return (
		<AbsoluteFill style={{ background: GRADIENTS.bg }}>
			{/* 1. Title */}
			<Sequence from={0} durationInFrames={fps * 3} layout="none">
				<TitleCard title="Schema Design" />
			</Sequence>

			{/* 2. Schema entities scene */}
			<Sequence from={fps * 3} durationInFrames={fps * 18} layout="none">
				<SchemaScene />
			</Sequence>

			{/* 3. The problem (N+1 queries) */}
			<Sequence from={fps * 21} durationInFrames={fps * 15} layout="none">
				<QueryProblem />
			</Sequence>

			{/* 4. Solution (denormalized columns) */}
			<Sequence from={fps * 36} durationInFrames={fps * 16} layout="none">
				<DenormalizationSolution />
			</Sequence>

			{/* 5. Drawback (write amplification) */}
			<Sequence from={fps * 52} durationInFrames={fps * 16} layout="none">
				<DenormalizationDrawback />
			</Sequence>

			{/* 6. Task link — the recursive query problem */}
			<Sequence from={fps * 68} durationInFrames={fps * 14} layout="none">
				<TaskLinkProblem />
			</Sequence>

			{/* 7. Closure table — O(1) reads (the solution) */}
			<Sequence from={fps * 82} durationInFrames={fps * 14} layout="none">
				<ClosureTableSolution />
			</Sequence>

			{/* 8. Closure table — write amplification (the drawback) */}
			<Sequence from={fps * 96} layout="none">
				<ClosureTableDrawback />
			</Sequence>
		</AbsoluteFill>
	);
};
