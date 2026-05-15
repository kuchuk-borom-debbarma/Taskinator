import React from 'react';
import { AbsoluteFill, Sequence, useVideoConfig, useCurrentFrame, spring, interpolate, Easing } from 'remotion';
import { COLORS, GRADIENTS } from './components/Nodes';
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

/* ── Action Step Block ── */
const ActionBlock: React.FC<{ label: string; command: string; state: 'idle' | 'active' | 'success' | 'fail' | 'skipped'; top: number; left: number; delay: number }> = ({ label, command, state, top, left, delay }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const s = SP(f, delay, fps);

	let color = COLORS.muted;
	let status = '🕒 IDLE';
	let opacity = 1;
	let filter = 'none';

	if (state === 'active')  { color = COLORS.accent;  status = '⚡ RUNNING'; }
	if (state === 'success') { color = COLORS.success; status = '✅ COMPLETE'; }
	if (state === 'fail')    { color = COLORS.danger;  status = '💥 FAILED'; }
	if (state === 'skipped') { color = '#475569';      status = '🚫 SKIPPED'; opacity = 0.3; filter = 'grayscale(100%) blur(1px)'; }

	return (
		<div style={{
			position: 'absolute', top, left, width: 280, transform: `translate(-50%, -50%) scale(${s})`, opacity: s * opacity,
			background: 'rgba(15, 23, 42, 0.95)', border: `2px solid ${state !== 'idle' ? color : 'rgba(255,255,255,0.1)'}`,
			borderRadius: 20, padding: 24, textAlign: 'left', zIndex: 20, filter,
			boxShadow: state === 'active' ? `0 0 40px ${color}33` : state === 'fail' ? `0 0 40px ${color}33` : '0 8px 32px rgba(0,0,0,0.4)',
			transition: 'all 0.4s ease'
		}}>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
				<span style={{ fontSize: 10, fontWeight: 900, color: COLORS.muted, letterSpacing: 1 }}>ACTION UNIT</span>
				<span style={{ fontSize: 9, fontWeight: 900, color, transition: 'color 0.3s' }}>{status}</span>
			</div>
			<div style={{ fontSize: 18, fontWeight: 800, color: COLORS.ink, fontFamily: 'Inter' }}>{label}</div>
			<div style={{
				fontSize: 11, fontWeight: 600, color: state === 'fail' ? COLORS.danger : '#cbd5e1', background: 'rgba(0,0,0,0.3)',
				padding: '8px 12px', borderRadius: 8, marginTop: 12, fontFamily: 'monospace', opacity: 0.8
			}}>
				{command}
			</div>
		</div>
	);
};

/* ── Pipeline Connector ── */
const PipeConnector: React.FC<{ x1: number; y1: number; x2: number; y2: number; delay: number; state: 'idle' | 'success' | 'fail' }> = ({ x1, y1, x2, y2, delay, state }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const p = spring({ frame: f - delay, fps, config: { damping: 20, stiffness: 80 } });

	const midX = x1 + (x2 - x1) * p;
	
	let stroke = '#334155'; // Idle slate
	if (state === 'success') stroke = COLORS.success;
	if (state === 'fail') stroke = COLORS.danger;

	const id = `arrow_${x1}_${delay}`;

	return (
		<svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none', zIndex: 10 }}>
			<defs>
				<marker id={id} markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
					<path d="M 0 0 L 8 4 L 0 8 z" fill={state !== 'idle' ? stroke : '#334155'}/>
				</marker>
			</defs>
			<line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255, 255, 255, 0.05)" strokeWidth={4} />
			<line
				x1={x1} y1={y1} x2={midX} y2={y2} stroke={stroke} strokeWidth={4} strokeLinecap="round"
				markerEnd={p > 0.95 ? `url(#${id})` : undefined}
				style={{ filter: state !== 'idle' ? `drop-shadow(0 0 4px ${stroke}aa)` : 'none', transition: 'stroke 0.4s, filter 0.4s' }}
			/>
		</svg>
	);
};

/* ── Main Slide Wrapper ── */
const ChainSlide: React.FC = () => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();

	const coords = {
		b1: { x: 240,  y: 360 },
		b2: { x: 640,  y: 360 },
		b3: { x: 1040, y: 360 }
	};

	// Timing triggers
	const tIn = F(1);
	const tRun1 = F(3);
	const tDone1 = F(5.5);
	
	const tPipe12 = F(5.5); // Connector A
	
	const tRun2 = F(7.5);
	const tFail2 = F(10.5); // Step 2 breaks!

	const tFailHalt = F(11.5); // Global execution freeze

	// State interpolators
	let s1: 'idle'|'active'|'success'|'fail' = 'idle';
	if (f > tRun1) s1 = 'active';
	if (f > tDone1) s1 = 'success';

	let p12: 'idle'|'success'|'fail' = 'idle';
	if (f > tPipe12) p12 = 'success';

	let s2: 'idle'|'active'|'success'|'fail' = 'idle';
	if (f > tRun2) s2 = 'active';
	if (f > tFail2) s2 = 'fail';

	let p23: 'idle'|'success'|'fail' = 'idle';
	if (f > tFail2) p23 = 'fail'; // Connector turns red instantly at failure point!

	let s3: 'idle'|'active'|'success'|'fail'|'skipped' = 'idle';
	if (f > tFail2) s3 = 'skipped'; // Downstream skips immediately!

	return (
		<Shell>
			{/* Header */}
			<div style={{ position: 'absolute', top: 40, left: 50 }}>
				<div style={{ fontSize: 12, fontWeight: 800, color: COLORS.danger, letterSpacing: 2 }}>ATOMICITY GUARANTEE</div>
				<div style={{ fontSize: 32, fontWeight: 900, color: COLORS.ink, fontFamily: 'Inter', marginTop: 4 }}>Fail-Fast Ordered Action Chain</div>
				<div style={{ fontSize: 14, color: COLORS.muted, fontFamily: 'Inter', marginTop: 4, maxWidth: 600 }}>
					The engine processes steps in strict sequence. Any execution error immediately aborts and freezes all subsequent pipeline steps.
				</div>
			</div>

			{/* Connections */}
			<PipeConnector x1={coords.b1.x + 140} y1={coords.b1.y} x2={coords.b2.x - 150} y2={coords.b2.y} delay={tPipe12} state={p12} />
			<PipeConnector x1={coords.b2.x + 140} y1={coords.b2.y} x2={coords.b3.x - 150} y2={coords.b3.y} delay={tFail2} state={p23} />

			{/* Action Blocks */}
			<ActionBlock label="Update Record" command="UPDATE task SET status='TEST'" state={s1} top={coords.b1.y} left={coords.b1.x} delay={tIn} />
			<ActionBlock label="Slack Alert" command="POST /services/hooks/slack" state={s2} top={coords.b2.y} left={coords.b2.x} delay={tIn + 10} />
			<ActionBlock label="Assign Owner" command="UPDATE member_id SET..." state={s3} top={coords.b3.y} left={coords.b3.x} delay={tIn + 20} />

			{/* Giant Circuit Overlay */}
			{f > tFailHalt && (
				<div style={{
					position: 'absolute', bottom: 40, left: 0, right: 0, display: 'flex', justifyContent: 'center',
					transform: `translateY(${interpolate(SP(f, tFailHalt, fps), [0, 1], [20, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.175, 0.885, 0.32, 1.275) })}px)`
				}}>
					<div style={{
						background: `${COLORS.danger}1a`, border: `2px solid ${COLORS.danger}`, borderRadius: 16,
						padding: '16px 48px', textAlign: 'center', color: COLORS.danger, fontWeight: 800,
						fontSize: 14, fontFamily: 'Inter', boxShadow: `0 0 50px ${COLORS.danger}22`, backdropFilter: 'blur(15px)'
					}}>
						🚨 CIRCUIT BREAKER TRIPPED: Action #2 failed. Aborting Step #3 instantly to preserve data integrity.
					</div>
				</div>
			)}
		</Shell>
	);
};

/* ── Root ── */
export const ActionChain: React.FC = () => {
	const { fps } = useVideoConfig();
	return (
		<AbsoluteFill style={{ background: GRADIENTS.bg }}>
			<Sequence from={0} durationInFrames={fps * 3} layout="none">
				<TitleCard title="Fail-Fast Action Pipelines" />
			</Sequence>
			<Sequence from={fps * 3} durationInFrames={fps * 27} layout="none">
				<ChainSlide />
			</Sequence>
		</AbsoluteFill>
	);
};
