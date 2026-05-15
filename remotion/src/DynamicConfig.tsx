import React from 'react';
import { AbsoluteFill, Sequence, useVideoConfig, useCurrentFrame, spring, interpolate } from 'remotion';
import { COLORS, GRADIENTS } from './components/Nodes';
import { TitleCard } from './components/TitleCard';

const F  = (s: number) => 30 * s;
const SP = (f: number, d: number, fps: number, damp = 16) => spring({ frame: f - d, fps, config: { damping: damp, stiffness: 100 } });

/* ── Background Underlay Dashboard ── */
const DashboardUnderlay: React.FC<{ blur: number }> = ({ blur }) => (
	<AbsoluteFill style={{
		background: '#090d16', filter: `blur(${blur}px)`, padding: 40, display: 'flex', flexDirection: 'column', gap: 24, opacity: 0.7, transition: 'filter 0.2s ease'
	}}>
		{/* Dummy Metrics row */}
		<div style={{ display: 'flex', gap: 24, width: '100%' }}>
			{[1, 2, 3].map(i => (
				<div key={i} style={{ flex: 1, height: 120, borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1.5px solid rgba(255,255,255,0.05)', padding: 20 }}>
					<div style={{ width: 80, height: 12, background: 'rgba(255,255,255,0.1)', borderRadius: 6, marginBottom: 12 }} />
					<div style={{ width: 120, height: 28, background: 'rgba(255,255,255,0.15)', borderRadius: 8 }} />
				</div>
			))}
		</div>
		{/* Dummy Table list */}
		<div style={{ flex: 1, borderRadius: 20, background: 'rgba(255,255,255,0.02)', border: '1.5px solid rgba(255,255,255,0.05)', padding: 24 }}>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
				{[1,2,3,4,5].map(i => (
					<div key={i} style={{ display: 'flex', gap: 16, borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: 12 }}>
						<div style={{ width: 40, height: 40, borderRadius: 20, background: 'rgba(255,255,255,0.08)' }} />
						<div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
							<div style={{ width: '30%', height: 12, background: 'rgba(255,255,255,0.1)', borderRadius: 6 }} />
							<div style={{ width: '60%', height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4 }} />
						</div>
					</div>
				))}
			</div>
		</div>
	</AbsoluteFill>
);

/* ── Form Input Mock ── */
const MockInput: React.FC<{ label: string; value: string; delay: number }> = ({ label, value, delay }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const s = SP(f, delay, fps);
	return (
		<div style={{ opacity: s, transform: `translateY(${interpolate(s, [0, 1], [10, 0])}px)` }}>
			<div style={{ fontSize: 11, fontWeight: 800, color: COLORS.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
			<div style={{
				background: 'rgba(0,0,0,0.3)', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: 10,
				padding: '12px 16px', fontFamily: 'monospace', fontSize: 13, color: COLORS.ink, boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)'
			}}>
				{value}
			</div>
		</div>
	);
};

/* ── Form Dropdown Mock ── */
const MockSelect: React.FC<{ label: string; value: string; delay: number }> = ({ label, value, delay }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const s = SP(f, delay, fps);
	return (
		<div style={{ opacity: s, transform: `translateY(${interpolate(s, [0, 1], [10, 0])}px)` }}>
			<div style={{ fontSize: 11, fontWeight: 800, color: COLORS.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
			<div style={{
				background: 'rgba(30,41,59,0.5)', border: '1.5px solid rgba(0,229,255,0.2)', borderRadius: 10,
				padding: '12px 16px', fontSize: 13, fontWeight: 700, color: COLORS.accent, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
				boxShadow: `0 0 15px rgba(0,229,255,0.05)`
			}}>
				<span>{value}</span>
				<span style={{ fontSize: 10, opacity: 0.8 }}>▼</span>
			</div>
		</div>
	);
};

/* ── Main Overlay Layout ── */
const ConfigSlide: React.FC = () => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();

	const tOpen = F(2);
	const isOpen = f >= tOpen;

	// Modal Spring scaling: elastic values (damping: 12, stiffness: 100)
	const modalS = spring({ frame: f - tOpen, fps, config: { damping: 12, stiffness: 100 } });
	const modalScale = interpolate(modalS, [0, 1], [0.6, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
	const modalOpacity = interpolate(modalS, [0, 0.5, 1], [0, 1, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

	// Blur interpolation timed with popup
	const blurValue = interpolate(modalS, [0, 1], [0, 22], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

	return (
		<AbsoluteFill style={{ background: GRADIENTS.bg }}>
			{/* 1. Dashboard Underlay */}
			<DashboardUnderlay blur={blurValue} />

			{/* Dimmer Overlay Backdrop */}
			{isOpen && (
				<div style={{
					position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
					background: 'rgba(2, 6, 23, 0.4)', zIndex: 20, opacity: modalOpacity,
					transition: 'opacity 0.2s'
				}} />
			)}

			{/* 2. Centered Glassmorphic Modal */}
			{isOpen && (
				<div style={{
					position: 'absolute', top: '54%', left: '50%', width: 640, height: 460,
					transform: `translate(-50%, -50%) scale(${modalScale})`, opacity: modalOpacity,
					background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(40px)',
					borderRadius: 28, border: '2px solid rgba(255, 255, 255, 0.1)', zIndex: 30,
					boxShadow: '0 50px 120px rgba(0, 0, 0, 0.8), inset 0 1px 1px rgba(255,255,255,0.15)',
					padding: 32, display: 'flex', flexDirection: 'column', overflow: 'hidden'
				}}>
					{/* Inner accent gradient top-border */}
					<div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.accent2})` }} />

					{/* Modal Header */}
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
						<div>
							<div style={{ fontSize: 10, fontWeight: 900, color: COLORS.accent, letterSpacing: 2 }}>CONFIG PARAMETERS</div>
							<div style={{ fontSize: 24, fontWeight: 900, color: COLORS.ink, fontFamily: 'Inter', marginTop: 2 }}>Webhook Configuration</div>
						</div>
						<div style={{ width: 36, height: 36, borderRadius: 18, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800 }}>
							✕
						</div>
					</div>

					{/* Form Elements inside body */}
					<div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
						<MockInput label="Destination Payload URL" value="https://hooks.taskinator.io/v1/triggers/receive/tr_82a0" delay={tOpen + 10} />
						
						<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
							<MockSelect label="Retry Limit" value="3 Attempts (Exponential)" delay={tOpen + 15} />
							<MockSelect label="Timeout Boundary" value="5000ms Threshold" delay={tOpen + 20} />
						</div>

						{/* Active Footer options */}
						<div style={{
							marginTop: 12, padding: 16, borderRadius: 12, background: `${COLORS.accent2}08`,
							border: `1.5px solid ${COLORS.accent2}22`, display: 'flex', alignItems: 'center', gap: 12,
							opacity: SP(f, tOpen + 25, fps), transform: `translateY(${interpolate(SP(f, tOpen + 25, fps), [0, 1], [10, 0])}px)`
						}}>
							<div style={{
								width: 20, height: 20, borderRadius: 6, background: COLORS.accent2, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 900
							}}>
								✓
							</div>
							<div>
								<div style={{ fontSize: 13, fontWeight: 800, color: COLORS.ink }}>Enable Smart Fallback Routing</div>
								<div style={{ fontSize: 10, color: COLORS.muted, marginTop: 1 }}>Cascade failure signals to fallback alerting streams.</div>
							</div>
						</div>
					</div>

					{/* Action Footer Buttons */}
					<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1.5px solid rgba(255,255,255,0.05)', paddingTop: 20, marginTop: 10 }}>
						<div style={{ padding: '12px 24px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', color: '#cbd5e1', fontSize: 13, fontWeight: 700 }}>
							Cancel
						</div>
						<div style={{ padding: '12px 32px', borderRadius: 10, background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accent2})`, color: 'white', fontSize: 13, fontWeight: 800, boxShadow: `0 8px 24px ${COLORS.accent}33` }}>
							Save Config
						</div>
					</div>
				</div>
			)}

			{/* Top Header floating over dimmer background */}
			<div style={{ position: 'absolute', top: 40, left: 50, zIndex: 40, opacity: interpolate(modalS, [0, 1], [1, 0.3], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }), pointerEvents: 'none' }}>
				<div style={{ fontSize: 12, fontWeight: 800, color: COLORS.accent2, letterSpacing: 2 }}>ADMINISTRATIVE DASHBOARD</div>
				<div style={{ fontSize: 30, fontWeight: 900, color: COLORS.ink, fontFamily: 'Inter', marginTop: 4 }}>Smart Configuration Modals</div>
			</div>
		</AbsoluteFill>
	);
};

/* ── Root ── */
export const DynamicConfig: React.FC = () => {
	const { fps } = useVideoConfig();
	return (
		<AbsoluteFill style={{ background: GRADIENTS.bg }}>
			<Sequence from={0} durationInFrames={fps * 3} layout="none">
				<TitleCard title="Administrative Config Overlays" />
			</Sequence>
			<Sequence from={fps * 3} durationInFrames={fps * 17} layout="none">
				<ConfigSlide />
			</Sequence>
		</AbsoluteFill>
	);
};
