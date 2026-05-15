import React from 'react';
import { AbsoluteFill, Sequence, useVideoConfig, useCurrentFrame, spring, interpolate, Easing } from 'remotion';
import { COLORS, GRADIENTS, MemberNode, TaskNode } from './components/Nodes';
import { TitleCard } from './components/TitleCard';

const F  = (s: number) => 30 * s;
const SP = (f: number, d: number, fps: number) => spring({ frame: f - d, fps, config: { damping: 15, stiffness: 80 } });

/* ── Shell Container ── */
const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
	<AbsoluteFill style={{ background: GRADIENTS.bg }}>
		<AbsoluteFill style={{ padding: 30 }}>
			<div style={{ 
				flex: 1, position: 'relative', overflow: 'hidden',
				background: 'rgba(15, 23, 42, 0.3)', backdropFilter: 'blur(50px)',
				borderRadius: 30, border: '1.5px solid rgba(255, 255, 255, 0.08)',
				boxShadow: '0 50px 120px rgba(0, 0, 0, 0.7)' 
			}}>
				{children}
			</div>
		</AbsoluteFill>
	</AbsoluteFill>
);

/* ── Engine Central Node ── */
const EngineNode: React.FC<{ s: number; glow: boolean }> = ({ s, glow }) => {
	return (
		<div style={{
			position: 'absolute', top: 240, left: 480, width: 260, opacity: s,
			transform: `scale(${s})`, background: 'rgba(15, 23, 42, 0.95)',
			border: `2px solid ${glow ? COLORS.accent : 'rgba(255,255,255,0.2)'}`, borderRadius: 20,
			padding: 24, textAlign: 'center', zIndex: 20,
			boxShadow: glow ? `0 0 50px ${COLORS.accent}44` : '0 15px 40px rgba(0,0,0,0.6)',
			transition: 'all 0.4s ease'
		}}>
			<div style={{ fontSize: 36 }}>⚙️</div>
			<div style={{ fontSize: 14, fontWeight: 900, color: COLORS.accent, letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'Inter', marginTop: 8 }}>Autopilot Engine</div>
			<div style={{ fontSize: 10, color: COLORS.muted, fontFamily: 'Inter', marginTop: 6, fontWeight: 600, opacity: 0.8 }}>REACTIVE EVALUATOR</div>
		</div>
	);
};

/* ── Arrow Flow ── */
const Arrow: React.FC<{ x1: number; y1: number; x2: number; y2: number; delay: number; active: boolean; label: string }> = ({ x1, y1, x2, y2, delay, active, label }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const p = spring({ frame: f - delay, fps, config: { damping: 20, stiffness: 70 } });
	
	const id = `arrow_${x1}_${y1}_${delay}`;
	const midX = x1 + (x2 - x1) * p;
	const midY = y1 + (y2 - y1) * p;

	return (
		<>
			<svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none', zIndex: 10 }}>
				<defs>
					<marker id={id} markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
						<path d="M 0 0 L 8 4 L 0 8 z" fill={active ? COLORS.accent : 'rgba(255,255,255,0.2)'}/>
					</marker>
				</defs>
				<line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.1)" strokeWidth={1} strokeDasharray="4 4"/>
				<line x1={x1} y1={y1} x2={midX} y2={midY} stroke={active ? COLORS.accent : 'rgba(255,255,255,0.2)'} strokeWidth={3} strokeLinecap="round" markerEnd={p > 0.95 ? `url(#${id})` : undefined} style={{ filter: active ? `drop-shadow(0 0 5px ${COLORS.accent}66)` : 'none' }}/>
			</svg>
			<div style={{
				position: 'absolute', left: x1 + (x2 - x1) * 0.5, top: y1 + (y2 - y1) * 0.5 - 15,
				transform: 'translate(-50%, -50%)', opacity: p > 0.3 ? 1 : 0,
				fontSize: 11, fontWeight: 800, color: active ? COLORS.accent : COLORS.muted,
				fontFamily: 'monospace', background: 'rgba(15,23,42,0.9)',
				border: `1px solid ${active ? COLORS.accent : 'rgba(255,255,255,0.1)'}44`,
				borderRadius: 6, padding: '4px 8px', zIndex: 20
			}}>
				{label}
			</div>
		</>
	);
};

/* ── DB Node ── */
const DBNode: React.FC<{ s: number; saving: boolean }> = ({ s, saving }) => {
	return (
		<div style={{
			position: 'absolute', top: 220, left: 880, width: 280, opacity: s,
			transform: `scale(${s})`, background: 'rgba(15, 23, 42, 0.95)',
			border: `2px solid ${saving ? COLORS.success : 'rgba(255,255,255,0.1)'}`, borderRadius: 20,
			padding: 20, zIndex: 20,
			boxShadow: saving ? `0 0 40px ${COLORS.success}33` : '0 15px 40px rgba(0,0,0,0.6)'
		}}>
			<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
				<div style={{ fontSize: 13, fontWeight: 900, color: COLORS.muted, letterSpacing: 1 }}>POSTGRESQL</div>
				<div style={{ fontSize: 9, color: COLORS.muted, background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 4 }}>AUDIT_LOG</div>
			</div>
			<div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 6, paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 10, color: COLORS.muted, fontWeight: 700 }}>
				<div>event_id</div><div>status</div>
			</div>
			<div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 6, fontSize: 12, fontWeight: 700, marginTop: 6, color: COLORS.ink }}>
				<div>evt_109</div>
				<div style={{ color: saving ? COLORS.success : COLORS.muted }}>
					{saving ? '✅ EXECUTED' : '🕒 PENDING'}
				</div>
			</div>
		</div>
	);
};

/* ── Main Slide Wrapper ── */
const OverviewSlide: React.FC = () => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();

	// Timing keys
	const inLeft  = F(1.5);
	const inMid   = F(2.5);
	const inRight = F(3.5);

	const flowToEngine = F(5);
	const engineEvaluating = F(6.5);
	const flowToDB = F(8.5);
	const dbCompleted = F(10);

	const sLeft  = SP(f, inLeft, fps);
	const sMid   = SP(f, inMid, fps);
	const sRight = SP(f, inRight, fps);

	return (
		<Shell>
			{/* Header */}
			<div style={{
				position: 'absolute', top: 40, left: 50,
				transform: `translateY(${interpolate(SP(f, F(0.5), fps), [0, 1], [-20, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) })}px)`
			}}>
				<div style={{ fontSize: 12, fontWeight: 800, color: COLORS.accent, letterSpacing: 2 }}>SYSTEM BLUEPRINT</div>
				<div style={{ fontSize: 32, fontWeight: 900, color: COLORS.ink, fontFamily: 'Inter', marginTop: 4 }}>Reactive Autopilot Loop</div>
				<div style={{ fontSize: 14, color: COLORS.muted, fontFamily: 'Inter', marginTop: 4, maxWidth: 600 }}>
					Event mutations automatically trigger structural background execution flows without frontend overhead.
				</div>
			</div>

			{/* Left: Event Dispatch Nodes */}
			<div style={{ position: 'absolute', top: 200, left: 100, opacity: sLeft, transform: `scale(${sLeft})` }}>
				<MemberNode name="Bob" color={COLORS.accent2} />
				<div style={{ marginTop: 40 }}>
					<TaskNode label="UPDATE TASK" />
				</div>
			</div>

			{/* Mid: Autopilot Core */}
			<EngineNode s={sMid} glow={f > engineEvaluating && f < flowToDB} />

			{/* Right: DB Panel */}
			<DBNode s={sRight} saving={f > dbCompleted} />

			{/* Connector A: Member -> Engine */}
			<Arrow x1={250} y1={280} x2={470} y2={300} delay={flowToEngine} active={f > flowToEngine && f < engineEvaluating} label="TASK.UPDATED" />

			{/* Connector B: Engine -> DB */}
			<Arrow x1={750} y1={300} x2={870} y2={300} delay={flowToDB} active={f > flowToDB && f < dbCompleted} label="TRIGGER ACTION" />

			{/* Success Banner */}
			{f > dbCompleted + 20 && (
				<div style={{
					position: 'absolute', bottom: 40, left: 0, right: 0, display: 'flex', justifyContent: 'center',
					transform: `translateY(${interpolate(SP(f, dbCompleted + 20, fps), [0, 1], [20, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.175, 0.885, 0.32, 1.275) })}px)`
				}}>
					<div style={{ background: `${COLORS.success}15`, border: `2px solid ${COLORS.success}`, borderRadius: 12, padding: '12px 30px', fontSize: 14, fontWeight: 800, color: COLORS.success, fontFamily: 'Inter', backdropFilter: 'blur(10px)' }}>
						⚡ AUTOPILOT COMPLETE: Task state mutated & action audit logged automatically.
					</div>
				</div>
			)}
		</Shell>
	);
};

/* ── Root Sequence Registration ── */
export const AutopilotOverview: React.FC = () => {
	const { fps } = useVideoConfig();
	return (
		<AbsoluteFill style={{ background: GRADIENTS.bg }}>
			<Sequence from={0} durationInFrames={fps * 3} layout="none">
				<TitleCard title="The Taskinator Autopilot Engine" />
			</Sequence>
			<Sequence from={fps * 3} durationInFrames={fps * 27} layout="none">
				<OverviewSlide />
			</Sequence>
		</AbsoluteFill>
	);
};
