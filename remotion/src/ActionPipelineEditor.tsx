import React from 'react';
import { AbsoluteFill, Sequence, useVideoConfig, useCurrentFrame, spring, interpolate } from 'remotion';
import { COLORS, GRADIENTS } from './components/Nodes';
import { TitleCard } from './components/TitleCard';

const F  = (s: number) => 30 * s;
const SP = (f: number, d: number, fps: number, damp = 16) => spring({ frame: f - d, fps, config: { damping: damp, stiffness: 100 } });

/* ── Shell Container ── */
const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
	<AbsoluteFill style={{ background: GRADIENTS.bg }}>
		<AbsoluteFill style={{ padding: 24 }}>
			<div style={{ 
				flex: 1, position: 'relative', overflow: 'hidden',
				background: 'rgba(15, 23, 42, 0.3)', backdropFilter: 'blur(50px)',
				borderRadius: 24, border: '1.5px solid rgba(255, 255, 255, 0.08)',
				boxShadow: '0 40px 100px rgba(0, 0, 0, 0.65)' 
			}}>
				{children}
			</div>
		</AbsoluteFill>
	</AbsoluteFill>
);

/* ── Styled Toggle Switch ── */
const ToggleSwitch: React.FC<{ active: boolean; top: number; left: number; scale: number }> = ({ active, top, left, scale }) => {
	const knobX = active ? 32 : 4;
	const bg = active ? COLORS.success : 'rgba(255,255,255,0.1)';
	return (
		<div style={{
			position: 'absolute', top, left, width: 64, height: 36, borderRadius: 18,
			background: bg, border: `1px solid rgba(255,255,255,0.15)`,
			display: 'flex', alignItems: 'center', transform: `scale(${scale})`,
			transition: 'background 0.25s ease', boxShadow: active ? `0 0 25px ${COLORS.success}44` : 'none'
		}}>
			<div style={{
				width: 28, height: 28, borderRadius: 14, background: '#ffffff',
				transform: `translateX(${knobX}px)`, transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
				boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
			}} />
		</div>
	);
};

/* ── Loading Spinner ── */
const Spinner: React.FC<{ size?: number }> = ({ size = 24 }) => {
	const f = useCurrentFrame();
	const rot = f * 10;
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
			 strokeWidth="3" strokeLinecap="round"
			 style={{ transform: `rotate(${rot}deg)`, color: COLORS.accent }}>
			<circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.15)" />
			<path d="M12 2 C 6.5 2, 2 6.5, 2 12" />
		</svg>
	);
};

/* ── Main Pipeline Comparative Slide ── */
const PipelineSlide: React.FC = () => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();


	const tClick = F(3.5);
	const tResolved = F(7.5); // 4 seconds delay

	const clickS = SP(f, tClick, fps, 12);
	const clickScale = interpolate(clickS, [0, 0.5, 1], [1, 0.9, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

	// -- 1. Standard Track Logic --
	const stdLoading = f >= tClick && f < tResolved;
	const stdActive  = f >= tResolved;
	
	// -- 2. Optimistic Track Logic --
	const optActive  = f >= tClick;
	const optSyncing = f >= tClick && f < tResolved;

	// Instant green ripple expansion from bottom toggle
	const rippleProgress = spring({ frame: f - tClick, fps, config: { damping: 24, stiffness: 60 } });
	const rippleScale = interpolate(rippleProgress, [0, 1], [0, 4.5], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
	const rippleOpacity = interpolate(rippleProgress, [0, 0.5, 1], [0.7, 0.7, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

	return (
		<Shell>
			{/* Header */}
			<div style={{ position: 'absolute', top: 40, left: 50 }}>
				<div style={{ fontSize: 12, fontWeight: 800, color: COLORS.success, letterSpacing: 2 }}>ZERO LATENCY USER INTERFACES</div>
				<div style={{ fontSize: 30, fontWeight: 900, color: COLORS.ink, fontFamily: 'Inter', marginTop: 4 }}>Action Pipeline Optimistic UI</div>
				<div style={{ fontSize: 14, color: COLORS.muted, fontFamily: 'Inter', marginTop: 4, maxWidth: 650 }}>
					TanStack Query hooks preemptively mutate state on click, providing immediate tactile feedback while background API resolvers stabilize.
				</div>
			</div>

			{/* LANE 1: STANDARD API ROUNDTRIP */}
			<div style={{
				position: 'absolute', left: 60, top: 170, width: 1160, height: 200,
				background: 'rgba(15, 23, 42, 0.8)', borderRadius: 20,
				border: `1.5px solid rgba(255, 255, 255, ${stdLoading ? 0.12 : 0.05})`,
				display: 'flex', alignItems: 'center', padding: '0 50px',
				transition: 'border 0.3s, background 0.3s',
				boxShadow: stdLoading ? 'inset 0 0 40px rgba(0,0,0,0.3)' : 'none',
				overflow: 'hidden'
			}}>
				{/* Lane Metadata */}
				<div style={{ flex: 1 }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
						<div style={{ width: 8, height: 8, borderRadius: 4, background: '#64748b' }} />
						<span style={{ fontSize: 10, fontWeight: 900, color: COLORS.muted, letterSpacing: 1 }}>LEGACY INTERACTION</span>
					</div>
					<div style={{ fontSize: 18, fontWeight: 800, color: COLORS.ink, fontFamily: 'Inter' }}>Standard REST API Patch</div>
					<div style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace', marginTop: 4 }}>PATCH /api/v1/autopilots/:id/toggle</div>
				</div>

				{/* Dynamic Status Indicators */}
				<div style={{ display: 'flex', alignItems: 'center', gap: 24, paddingRight: 100 }}>
					{stdLoading && (
						<div style={{ display: 'flex', alignItems: 'center', gap: 10, color: COLORS.accent, fontFamily: 'monospace', fontSize: 12, fontWeight: 800 }}>
							<Spinner size={20} />
							WAITING FOR RESOLVER...
						</div>
					)}
					{stdActive && (
						<div style={{ color: COLORS.success, fontFamily: 'monospace', fontSize: 12, fontWeight: 800 }}>
							✅ COMPLETED (4200ms)
						</div>
					)}
					{!stdLoading && !stdActive && (
						<span style={{ color: '#475569', fontFamily: 'monospace', fontSize: 12, fontWeight: 800 }}>READY</span>
					)}
				</div>

				{/* Interactive Control */}
				<div style={{ position: 'relative', width: 80, height: 40 }}>
					<ToggleSwitch active={stdActive} top={2} left={8} scale={clickScale} />
				</div>
			</div>

			{/* LANE 2: OPTIMISTIC DIRECT UI */}
			<div style={{
				position: 'absolute', left: 60, top: 430, width: 1160, height: 200,
				background: 'rgba(15, 23, 42, 0.8)', borderRadius: 20,
				border: `1.5px solid rgba(255, 255, 255, ${optActive ? 0.15 : 0.05})`,
				display: 'flex', alignItems: 'center', padding: '0 50px',
				boxShadow: optActive ? `inset 0 0 50px ${COLORS.success}0a` : 'none',
				overflow: 'hidden', zIndex: 20
			}}>
				{/* Radiating Green Ripple Effect expanding on Frame 45 */}
				<div style={{
					position: 'absolute', right: 90, top: '50%', width: 80, height: 80, borderRadius: 40,
					background: COLORS.success, filter: 'blur(15px)', zIndex: 5,
					transform: `translate(50%, -50%) scale(${rippleScale})`, opacity: rippleOpacity,
					pointerEvents: 'none'
				}} />

				{/* Lane Metadata */}
				<div style={{ flex: 1, zIndex: 10 }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
						<div style={{ width: 8, height: 8, borderRadius: 4, background: COLORS.success, boxShadow: `0 0 10px ${COLORS.success}` }} />
						<span style={{ fontSize: 10, fontWeight: 900, color: COLORS.success, letterSpacing: 1 }}>OPTIMISTIC ENGAGED</span>
					</div>
					<div style={{ fontSize: 18, fontWeight: 800, color: COLORS.ink, fontFamily: 'Inter' }}>Preemptive Cache Mutation</div>
					<div style={{ fontSize: 12, color: COLORS.muted, fontFamily: 'monospace', marginTop: 4 }}>queryClient.setQueryData(...)</div>
				</div>

				{/* Dynamic Status Indicators */}
				<div style={{ display: 'flex', alignItems: 'center', gap: 24, paddingRight: 100, zIndex: 10 }}>
					{optSyncing && (
						<div style={{ display: 'flex', alignItems: 'center', gap: 8, color: COLORS.success, fontFamily: 'monospace', fontSize: 12, fontWeight: 900 }}>
							<div style={{ width: 6, height: 6, borderRadius: 3, background: COLORS.success, animation: 'pulse 1s infinite' }} />
							⚡ UI RENDERED INSTANTLY (Syncing payload...)
						</div>
					)}
					{!optSyncing && optActive && (
						<div style={{ color: COLORS.success, fontFamily: 'monospace', fontSize: 12, fontWeight: 900, textShadow: `0 0 10px ${COLORS.success}55` }}>
							✅ CACHE SYNCHRONIZED IN BACKGROUND
						</div>
					)}
					{!optActive && (
						<span style={{ color: '#475569', fontFamily: 'monospace', fontSize: 12, fontWeight: 800 }}>READY</span>
					)}
				</div>

				{/* Interactive Control */}
				<div style={{ position: 'relative', width: 80, height: 40, zIndex: 10 }}>
					<ToggleSwitch active={optActive} top={2} left={8} scale={clickScale} />
				</div>
			</div>

			{/* Simulated Cursor Overlay pointing at both toggles */}
			<Sequence from={F(2)} durationInFrames={F(3.5)} layout="none">
				<CursorSim />
			</Sequence>
		</Shell>
	);
};

/* ── Cursor Overlay Helper ── */
const CursorSim: React.FC = () => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	// Cursor enters from bottom right -> moves to top toggle -> clicks -> moves to bottom toggle -> clicks
	// Simplification: split cursors hovering both switches simultaneously to showcase instant synced clicks
	const entry = spring({ frame: f, fps, config: { damping: 16, stiffness: 80 } });
	
	const moveX = interpolate(entry, [0, 1], [1200, 1150]);
	const moveYTop = interpolate(entry, [0, 1], [400, 270]);
	const moveYBot = interpolate(entry, [0, 1], [600, 530]);

	const clickProg = spring({ frame: f - F(1.5), fps, config: { damping: 10 } });
	const clickScale = interpolate(clickProg, [0, 0.3, 0.6, 1], [1, 0.8, 1, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

	return (
		<>
			{/* Top cursor */}
			<div style={{
				position: 'absolute', left: moveX, top: moveYTop, transform: `scale(${clickScale})`, pointerEvents: 'none', zIndex: 100, textShadow: '0 4px 12px rgba(0,0,0,0.5)'
			}}>
				<span style={{ fontSize: 32 }}>👆</span>
			</div>
			{/* Bottom cursor */}
			<div style={{
				position: 'absolute', left: moveX, top: moveYBot, transform: `scale(${clickScale})`, pointerEvents: 'none', zIndex: 100, textShadow: '0 4px 12px rgba(0,0,0,0.5)'
			}}>
				<span style={{ fontSize: 32 }}>👆</span>
			</div>
		</>
	);
};

/* ── Root ── */
export const ActionPipelineEditor: React.FC = () => {
	const { fps } = useVideoConfig();
	return (
		<AbsoluteFill style={{ background: GRADIENTS.bg }}>
			<Sequence from={0} durationInFrames={fps * 3} layout="none">
				<TitleCard title="Optimistic User Interfaces" />
			</Sequence>
			<Sequence from={fps * 3} durationInFrames={fps * 27} layout="none">
				<PipelineSlide />
			</Sequence>
		</AbsoluteFill>
	);
};
