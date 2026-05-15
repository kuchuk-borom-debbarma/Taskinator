import React from 'react';
import {
	AbsoluteFill, Sequence, useVideoConfig, useCurrentFrame,
	spring, interpolate, Easing
} from 'remotion';
import { COLORS, GRADIENTS } from './components/Nodes';

/* ── Shared ──────────────────────────────────────────── */
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

const StepChip: React.FC<{ steps: { frame: number; text: string }[]; segmentFrame: number; fps: number }> = ({ steps, segmentFrame, fps }) => {
	const current = [...steps].reverse().find(s => segmentFrame >= s.frame) || steps[0];
	return (
		<div style={{
			position: 'absolute', top: 30, left: 30, zIndex: 100,
			background: 'rgba(15, 23, 42, 0.6)', padding: '10px 18px',
			borderRadius: '12px', border: '1px solid rgba(255, 23, 68, 0.3)',
			backdropFilter: 'blur(12px)', boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
			display: 'flex', alignItems: 'center', gap: '10px',
		}}>
			<div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.danger, boxShadow: `0 0 8px ${COLORS.danger}` }} />
			<span style={{ fontSize: 13, fontWeight: 700, color: COLORS.ink, fontFamily: 'Inter', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
				{current.text}
			</span>
		</div>
	);
};

const Appear: React.FC<{ at: number; children: React.ReactNode; x?: number; y?: number; scale?: boolean }> = ({ at, children, x = 0, y = 0, scale = false }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const s = spring({ frame: frame - at, fps, config: { damping: 14, stiffness: 100 } });
	return (
		<div style={{
			opacity: s,
			transform: `translate(${interpolate(s, [0, 1], [x, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })}px, ${interpolate(s, [0, 1], [y, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })}px) ${scale ? `scale(${s})` : ''}`,
		}}>
			{children}
		</div>
	);
};

/* ── Table card with flash state ─────────────────────── */
type Col = { name: string; type: string; highlightRow?: boolean };

const TableCard: React.FC<{
	title: string; cols: Col[]; accentColor: string;
	flashColor?: string; isFlashing?: boolean;
}> = ({ title, cols, accentColor, flashColor = COLORS.danger, isFlashing = false }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const pulse = isFlashing ? 0.5 + 0.5 * Math.sin((frame / fps) * Math.PI * 5) : 0;

	return (
		<div style={{
			background: 'rgba(15, 23, 42, 0.85)',
			borderRadius: 14, overflow: 'hidden',
			border: isFlashing ? `2px solid ${flashColor}` : `1px solid ${accentColor}55`,
			backdropFilter: 'blur(12px)',
			boxShadow: isFlashing
				? `0 0 ${16 + pulse * 28}px ${flashColor}88, 0 8px 28px rgba(0,0,0,0.5)`
				: `0 8px 28px rgba(0,0,0,0.5), 0 0 20px ${accentColor}18`,
			fontFamily: 'Inter', minWidth: 240,
		}}>
			<div style={{
				background: isFlashing
					? `linear-gradient(90deg, ${flashColor}44, ${accentColor}22)`
					: `linear-gradient(90deg, ${accentColor}2a, transparent)`,
				borderBottom: `1px solid ${isFlashing ? flashColor : accentColor}44`,
				padding: '11px 16px', fontWeight: 800, fontSize: 14,
				letterSpacing: '1px', color: isFlashing ? flashColor : accentColor,
			}}>{title}</div>
			{cols.map((col, i) => (
				<div key={i} style={{
					display: 'flex', justifyContent: 'space-between',
					padding: '8px 16px',
					borderBottom: i < cols.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
					background: col.highlightRow ? `rgba(255,23,68,0.2)` : 'transparent',
					borderLeft: col.highlightRow ? `4px solid ${COLORS.danger}` : '4px solid transparent',
				}}>
					<span style={{
						fontSize: 12, color: col.highlightRow ? COLORS.danger : COLORS.ink,
						fontWeight: col.highlightRow ? 700 : 400,
					}}>{col.name}</span>
					<span style={{ fontSize: 11, color: COLORS.muted, fontFamily: 'monospace' }}>{col.type}</span>
				</div>
			))}
		</div>
	);
};

/* ── Step badge ──────────────────────────────────────── */
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
		}}>{num}</div>
		<span style={{ fontSize: 14, color: COLORS.ink, fontFamily: 'monospace', lineHeight: 1.4 }}>{text}</span>
	</div>
);

/* ── SVG arrow between two absolute points ───────────── */
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
				<marker id={`arrowhead-${color.replace('#','')}`} markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
					<polygon points="0 0, 8 3, 0 6" fill={color} opacity={0.9} />
				</marker>
			</defs>
			<path d={path} fill="none" stroke={color} strokeWidth={2.5}
				strokeDasharray={len} strokeDashoffset={len * (1 - progress)}
				strokeLinecap="round"
				markerEnd={`url(#arrowhead-${color.replace('#','')})`}
				style={{ filter: `drop-shadow(0 0 6px ${color}88)` }}
			/>
		</svg>
	);
};

/* ════════════════════════════════════════════════════════ */
export const DenormalizationDrawback: React.FC = () => {
	const { fps } = useVideoConfig();
	const frame = useCurrentFrame();
	const segmentFrame = frame;

	const steps = [
		{ frame: 0,        text: 'Showing Tables...' },
		{ frame: fps * 2.5,text: 'Step 1: Delete Member...' },
		{ frame: fps * 5,  text: 'Step 2: Update Project Count...' },
		{ frame: fps * 7.5,text: 'Step 3: Update Team Count...' },
		{ frame: fps * 9.5,text: 'Write Amplification!' },
	];

	const step1 = frame >= fps * 2.5;
	const step2 = frame >= fps * 5;
	const step3 = frame >= fps * 7.5;

	const showTables = spring({ frame: frame - fps * 0.5, fps });
	const showBadge1 = spring({ frame: frame - fps * 2.5, fps, config: { damping: 14 } });
	const showBadge2 = spring({ frame: frame - fps * 5, fps, config: { damping: 14 } });
	const showBadge3 = spring({ frame: frame - fps * 7.5, fps, config: { damping: 14 } });
	const showWarning = spring({ frame: frame - fps * 9.5, fps, config: { damping: 12, stiffness: 120 } });

	/* Table data */
	const pmCols: Col[] = [
		{ name: 'id',            type: 'UUID',  highlightRow: step1 },
		{ name: 'fk_project_id', type: 'UUID' },
		{ name: 'fk_user_id',    type: 'TEXT' },
	];
	const pjCols: Col[] = [
		{ name: 'id',            type: 'UUID' },
		{ name: 'name',          type: 'TEXT' },
		{ name: 'members_count ★', type: 'INTEGER', highlightRow: step2 },
		{ name: 'tasks_count ★', type: 'INTEGER' },
		{ name: 'teams_count ★', type: 'INTEGER' },
	];
	const tmCols: Col[] = [
		{ name: 'id',              type: 'UUID' },
		{ name: 'fk_project_id',   type: 'UUID' },
		{ name: 'members_count ★', type: 'INTEGER', highlightRow: step3 },
		{ name: 'tasks_count ★',   type: 'INTEGER' },
	];

	return (
		<AbsoluteFill style={{ background: GRADIENTS.bg }}>
			<AbsoluteFill style={{ padding: '20px' }}>
				<div style={glassBg}>
					{/* StepChip deliberately omitted — badges in top-right serve as progress indicator */}

					{/* Headline */}
					<div style={{ position: 'absolute', top: 90, left: 50, right: 50 }}>
						<Appear at={0} y={-15}>
							<h2 style={{ color: COLORS.danger, fontFamily: 'Inter', fontSize: 28, margin: 0, fontWeight: 900 }}>
								The Drawback: Write Amplification
							</h2>
							<p style={{ color: COLORS.muted, fontFamily: 'Inter', fontSize: 14, margin: '8px 0 0', lineHeight: 1.6 }}>
								Every mutation must update counts in <em>multiple tables</em>. A single DELETE cascades into additional UPDATEs.
							</p>
						</Appear>
					</div>

					{/* Tables — absolute positions */}
					<div style={{ position: 'absolute', top: 220, left: 50, opacity: showTables, transform: `scale(${showTables})`, transformOrigin: 'top left' }}>
						<TableCard title="project_member" cols={pmCols} accentColor={COLORS.accent} flashColor={COLORS.danger} isFlashing={step1 && !step2} />
					</div>

					<div style={{ position: 'absolute', top: 220, left: 340, opacity: showTables, transform: `scale(${showTables})`, transformOrigin: 'top left' }}>
						<TableCard title="project" cols={pjCols} accentColor={COLORS.accent} flashColor={COLORS.warning} isFlashing={step2 && !step3} />
					</div>

					<div style={{ position: 'absolute', top: 220, left: 640, opacity: showTables, transform: `scale(${showTables})`, transformOrigin: 'top left' }}>
						<TableCard title="project_team" cols={tmCols} accentColor={COLORS.accent2} flashColor={COLORS.warning} isFlashing={step3} />
					</div>

					{/* Animated arrows */}
					<Sequence from={fps * 5} premountFor={1 * fps} layout="none">
						<Arrow x1={280} y1={280} x2={340} y2={275} color={COLORS.warning} />
					</Sequence>
					<Sequence from={fps * 7.5} premountFor={1 * fps} layout="none">
						<Arrow x1={570} y1={280} x2={640} y2={280} color={COLORS.warning} />
					</Sequence>

					{/* Step badges — top right, stacked, no Sequence wrappers */}
					<div style={{ position: 'absolute', top: 24, right: 24, zIndex: 100, display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 480 }}>
						<div style={{ opacity: showBadge1, transform: `translateX(${interpolate(showBadge1, [0, 1], [60, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) })}px)` }}>
							<StepBadge num={1} text="DELETE FROM project_member WHERE id = 'uuid-abc'" color={COLORS.danger} />
						</div>
						<div style={{ opacity: showBadge2, transform: `translateX(${interpolate(showBadge2, [0, 1], [60, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) })}px)` }}>
							<StepBadge num={2} text="UPDATE project SET members_count = members_count - 1" color={COLORS.warning} />
						</div>
						<div style={{ opacity: showBadge3, transform: `translateX(${interpolate(showBadge3, [0, 1], [60, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) })}px)` }}>
							<StepBadge num={3} text="UPDATE project_team SET members_count = members_count - 1" color={COLORS.warning} />
						</div>
					</div>

					{/* Warning banner */}
					<div style={{
						position: 'absolute', bottom: 32, left: 50, right: 50,
						opacity: showWarning,
						transform: `translateY(${interpolate(showWarning, [0, 1], [40, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.175, 0.885, 0.32, 1.275) })}px)`,
						display: 'flex', justifyContent: 'center', zIndex: 30,
					}}>
						<div style={{
							background: 'rgba(255,23,68,0.18)', border: `2px solid ${COLORS.danger}`,
							color: COLORS.ink, padding: '14px 32px', borderRadius: 12,
							fontSize: 18, fontWeight: 800, fontFamily: 'Inter',
							boxShadow: `0 0 40px rgba(255,23,68,0.45)`, backdropFilter: 'blur(10px)',
							letterSpacing: '0.5px',
						}}>
							⚠️ &nbsp;1 DELETE cascades into 2+ additional UPDATEs — Write Amplification
						</div>
					</div>
				</div>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
