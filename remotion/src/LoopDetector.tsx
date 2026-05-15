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

/* ── Main Slide Wrapper ── */
const CircularSlide: React.FC = () => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();

	const tStart = F(2);
	const tLock = F(11.5); // Moment of absolute block!
	const locked = f >= tLock;

	// 1. Accelerating Rotation:
	// As frame counts from tStart to tLock, rotation speeds up exponentially.
	// We map active frames [0, tLock-tStart] into exponential rotation degrees.
	const activeF = Math.min(Math.max(0, f - tStart), tLock - tStart);
	
	// Map active time 0-9.5s to total degrees. 
	// Using power of 2 to simulate kinetic acceleration!
	const tProg = activeF / (tLock - tStart); // 0 -> 1
	const accel = Math.pow(tProg, 2.8);       // Accelerate slowly then exponentially
	const rotation = accel * 2160;            // 6 full spins (360 * 6)

	// 2. Trace Depth Counter:
	const depth = Math.round(interpolate(accel, [0, 1], [1, 50], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));

	return (
		<Shell>
			{/* Header */}
			<div style={{ position: 'absolute', top: 40, left: 50 }}>
				<div style={{ fontSize: 12, fontWeight: 800, color: COLORS.warning, letterSpacing: 2 }}>RECURSION PROTECTION</div>
				<div style={{ fontSize: 32, fontWeight: 900, color: COLORS.ink, fontFamily: 'Inter', marginTop: 4 }}>Infinite Loop Detection</div>
				<div style={{ fontSize: 14, color: COLORS.muted, fontFamily: 'Inter', marginTop: 4, maxWidth: 600 }}>
					Global Trace Correlation monitors transaction depth across cascaded triggers. Cyclic dependencies trigger instant circuit shutdowns.
				</div>
			</div>

			{/* Live Telemetry Panel */}
			<div style={{
				position: 'absolute', top: 40, right: 50, width: 240,
				background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.05)',
				borderRadius: 12, padding: '12px 20px', fontFamily: 'monospace'
			}}>
				<div style={{ fontSize: 10, fontWeight: 900, color: COLORS.muted, marginBottom: 6 }}>CORRELATION TELEMETRY</div>
				<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
					<span>TRACE_ID</span>
					<span style={{ color: COLORS.accent }}>tr_a9b2_z0</span>
				</div>
				<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8' }}>
					<span>STACK_DEPTH</span>
					<span style={{ color: locked ? COLORS.danger : COLORS.warning, fontWeight: 900, transition: 'color 0.2s' }}>
						{depth} / 50
					</span>
				</div>
			</div>

			{/* Center Loop Visualization */}
			<div style={{
				position: 'absolute', top: '54%', left: '50%', width: 400, height: 400,
				transform: 'translate(-50%, -50%)', display: 'flex', alignItems: 'center', justifyContent: 'center'
			}}>
				{/* Outer SVG Track */}
				<svg width="400" height="400" style={{ position: 'absolute', overflow: 'visible', opacity: locked ? 0.2 : 0.8, transition: 'opacity 0.3s' }}>
					<circle cx="200" cy="200" r="160" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
					<circle
						cx="200" cy="200" r="160" fill="none" stroke={COLORS.accent} strokeWidth="2"
						strokeDasharray="1000" strokeDashoffset={locked ? 1000 : interpolate(accel, [0, 1], [1000, 0], { extrapolateLeft: 'clamp' })}
						style={{ opacity: 0.3, filter: 'drop-shadow(0 0 8px #00E5FF)' }}
					/>
				</svg>

				{/* The Central Guard Node */}
				<div style={{
					width: 140, height: 140, borderRadius: 70, background: 'rgba(15,23,42,0.95)',
					border: `2px solid ${locked ? COLORS.danger : 'rgba(255,255,255,0.1)'}`,
					display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
					zIndex: 20, transition: 'border 0.3s',
					boxShadow: locked ? `0 0 40px ${COLORS.danger}33` : '0 8px 32px rgba(0,0,0,0.6)'
				}}>
					<span style={{ fontSize: 28 }}>🛡️</span>
					<span style={{ fontSize: 10, fontWeight: 900, color: locked ? COLORS.danger : COLORS.muted, fontFamily: 'Inter', letterSpacing: 1, marginTop: 4 }}>GUARD</span>
				</div>

				{/* Revolving Event Node Wrapper */}
				<div style={{
					position: 'absolute', width: '100%', height: '100%',
					transform: `rotate(${rotation}deg)`,
					opacity: locked ? 0 : 1, transition: 'opacity 0.2s'
				}}>
					{/* The Event Packet orbiting at outer ring */}
					<div style={{
						position: 'absolute', top: 40 - 20, left: 200 - 20, width: 40, height: 40, borderRadius: 20,
						background: COLORS.accent2, border: '2px solid white',
						boxShadow: `0 0 20px ${COLORS.accent2}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
						fontSize: 16, color: 'white', fontWeight: 800,
						// Counter-rotate to keep text upright
						transform: `rotate(-${rotation}deg)`
					}}>
						⚡
					</div>
				</div>
			</div>

			{/* Full-Screen "CYCLE BLOCKED" Lock Overlay */}
			{locked && (
				<div style={{
					position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
					background: `${COLORS.danger}0d`, zIndex: 50,
					display: 'flex', alignItems: 'center', justifyContent: 'center',
					backdropFilter: 'blur(12px)',
					border: `4px solid ${COLORS.danger}33`, borderRadius: 26,
					animation: 'pulseBorder 2s infinite alternate'
				}}>
					<div style={{
						transform: `scale(${interpolate(SP(f, tLock, fps), [0, 1], [0.85, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.175, 0.885, 0.32, 1.275) })})`,
						textAlign: 'center'
					}}>
						<div style={{
							background: 'rgba(15,23,42,0.9)', border: `3px solid ${COLORS.danger}`, borderRadius: 24,
							padding: '40px 60px', boxShadow: `0 25px 80px rgba(255, 23, 68, 0.3)`
						}}>
							<div style={{ fontSize: 64, marginBottom: 16 }}>🛑</div>
							<div style={{ fontSize: 40, fontWeight: 900, color: COLORS.danger, fontFamily: 'Inter', letterSpacing: 4, textTransform: 'uppercase' }}>
								Cycle Blocked
							</div>
							<div style={{ fontSize: 16, color: '#cbd5e1', fontFamily: 'Inter', marginTop: 12, maxWidth: 500, lineHeight: 1.5 }}>
								Infinite cascading recursion detected.<br />
								Autopilot terminated executions automatically at **Stack Depth Level 50** to safeguard database limits.
							</div>
							<div style={{
								background: 'rgba(0,0,0,0.5)', border: `1px solid ${COLORS.danger}44`,
								padding: '8px 16px', borderRadius: 8, display: 'inline-block',
								fontFamily: 'monospace', color: COLORS.danger, fontSize: 13, fontWeight: 800, marginTop: 24
							}}>
								STATUS: ERR_MAX_DEPTH_EXCEEDED
							</div>
						</div>
					</div>
				</div>
			)}
		</Shell>
	);
};

/* ── Root Sequence ── */
export const LoopDetector: React.FC = () => {
	const { fps } = useVideoConfig();
	return (
		<AbsoluteFill style={{ background: GRADIENTS.bg }}>
			<Sequence from={0} durationInFrames={fps * 3} layout="none">
				<TitleCard title="Cyclic Loop Safety Guard" />
			</Sequence>
			<Sequence from={fps * 3} durationInFrames={fps * 27} layout="none">
				<CircularSlide />
			</Sequence>
		</AbsoluteFill>
	);
};
