import React from 'react';
import { spring, useCurrentFrame, useVideoConfig, interpolate, interpolateColors } from 'remotion';

export const COLORS = {
	bg: '#0b0f19', // Deep charcoal/navy
	ink: '#f8fafc', // Off-white for text
	muted: '#94a3b8', // Slate gray for muted text
	accent: '#00E5FF', // Neon Electric Blue
	accent2: '#FF5100', // Neon Orange
	accent3: '#00E676', // Emerald
	panel: 'rgba(30, 41, 59, 0.6)', // Glassmorphic dark panel
	panelStrong: 'rgba(15, 23, 42, 0.8)',
	success: '#00E676',
	warning: '#FFD600',
	danger: '#FF1744',
};

export const GRADIENTS = {
	bg: `radial-gradient(circle at 10% 20%, rgba(0, 229, 255, 0.08), transparent 40%),
       radial-gradient(circle at 90% 80%, rgba(255, 81, 0, 0.06), transparent 40%),
       radial-gradient(circle at 50% 50%, rgba(0, 230, 118, 0.03), transparent 60%),
       linear-gradient(180deg, #0b0f19 0%, #06090f 100%)`,
	surface: 'linear-gradient(180deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.8))',
};

const TypeLabel: React.FC<{ label: string }> = ({ label }) => (
	<div style={{
		fontSize: '10px',
		fontWeight: '700',
		color: COLORS.accent,
		letterSpacing: '1.5px',
		marginBottom: '4px',
		textTransform: 'uppercase',
		fontFamily: 'Inter, system-ui, sans-serif'
	}}>
		{label}
	</div>
);

export const ProjectNode: React.FC<{ label: string }> = ({ label }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const scale = spring({ frame, fps, config: { damping: 14, stiffness: 120 } });

	return (
		<div style={{ transform: `scale(${scale})`, display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10 }}>
			<TypeLabel label="Project" />
			<div style={{
				background: 'rgba(0, 229, 255, 0.1)',
				color: COLORS.ink,
				padding: '12px 24px',
				borderRadius: '12px',
				fontSize: '22px',
				fontWeight: '800',
				boxShadow: '0 0 30px rgba(0, 229, 255, 0.3), inset 0 0 10px rgba(0, 229, 255, 0.2)',
				minWidth: '220px',
				textAlign: 'center',
				border: '1px solid rgba(0, 229, 255, 0.5)',
				backdropFilter: 'blur(12px)',
				fontFamily: 'Inter, system-ui, sans-serif'
			}}>
				{label}
			</div>
		</div>
	);
};

export const TeamNode: React.FC<{ label: string }> = ({ label }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const scale = spring({ frame, fps, config: { damping: 14 } });

	return (
		<div style={{ transform: `scale(${scale})`, display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10 }}>
			<TypeLabel label="Team" />
			<div style={{
				background: GRADIENTS.surface,
				color: COLORS.ink,
				padding: '8px 16px',
				borderRadius: '8px',
				fontSize: '16px',
				fontWeight: '700',
				boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
				minWidth: '160px',
				textAlign: 'center',
				border: '1px solid rgba(255, 255, 255, 0.1)',
				backdropFilter: 'blur(16px)',
				fontFamily: 'Inter, system-ui, sans-serif'
			}}>
				{label}
			</div>
		</div>
	);
};

export const MemberNode: React.FC<{ name: string; color?: string }> = ({ name, color = COLORS.accent2 }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const scale = spring({ frame, fps, config: { damping: 12, stiffness: 150 } });

	return (
		<div style={{ transform: `scale(${scale})`, display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 20 }}>
			<div style={{
				background: `linear-gradient(135deg, ${color}, #1a1a1a)`,
				color: 'white',
				width: '40px',
				height: '40px',
				borderRadius: '20px',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				fontSize: '16px',
				fontWeight: '800',
				boxShadow: `0 0 15px ${color}66`,
				border: `2px solid ${color}`,
				fontFamily: 'Inter, system-ui, sans-serif'
			}}>
				{name[0]}
			</div>
			<div style={{ marginTop: '6px', fontSize: '11px', fontWeight: '700', color: COLORS.muted, fontFamily: 'Inter, system-ui, sans-serif' }}>{name}</div>
		</div>
	);
};

export const TaskNode: React.FC<{ label: string; successProgress?: number }> = ({ label, successProgress = 0 }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const scale = spring({ frame, fps, config: { damping: 14 } });

	const bg = interpolateColors(successProgress, [0, 1], ['rgba(15, 23, 42, 0.8)', 'rgba(0, 230, 118, 0.25)']);
	const border = interpolateColors(successProgress, [0, 1], ['rgba(255, 255, 255, 0.05)', COLORS.success]);
	const boxShadow = successProgress > 0.1 
		? `0 4px 20px rgba(0, 230, 118, ${successProgress * 0.4}), inset 0 0 15px rgba(0, 230, 118, ${successProgress * 0.15})`
		: '0 4px 12px rgba(0, 0, 0, 0.5)';

	return (
		<div style={{ transform: `scale(${scale})`, display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10 }}>
			<div style={{
				background: bg,
				color: COLORS.ink,
				padding: '8px 16px',
				borderRadius: '6px',
				fontSize: '14px',
				fontWeight: '600',
				boxShadow,
				border: `1px solid ${border}`,
				borderLeft: `4px solid ${COLORS.accent3}`,
				minWidth: '130px',
				textAlign: 'center',
				backdropFilter: 'blur(8px)',
				fontFamily: 'Inter, system-ui, sans-serif',
				transition: 'none'
			}}>
				{label}
			</div>
		</div>
	);
};

export const AutopilotNode: React.FC = () => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	
	const scale = spring({ frame, fps, config: { damping: 12, stiffness: 120 } });
	
	// Infinite stateless repeating loop for rings
	const loopDuration = 60;
	const t = frame % loopDuration;
	
	const r1 = t / loopDuration;
	const r2 = ((t + loopDuration / 2) % loopDuration) / loopDuration;

	return (
		<div style={{ transform: `scale(${scale})`, position: 'relative', width: '220px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 30 }}>
			<svg style={{ position: 'absolute', width: '300px', height: '300px', pointerEvents: 'none', zIndex: -1, overflow: 'visible' }}>
				<circle cx="110" cy="25" r={40 + r1 * 60} fill="none" stroke={COLORS.accent} strokeWidth="2" opacity={interpolate(r1, [0, 1], [0.6, 0])} />
				<circle cx="110" cy="25" r={40 + r2 * 60} fill="none" stroke={COLORS.accent} strokeWidth="1.5" opacity={interpolate(r2, [0, 1], [0.4, 0])} />
			</svg>
			
			<div style={{
				background: 'rgba(0, 229, 255, 0.15)',
				border: `2px solid ${COLORS.accent}`,
				boxShadow: `0 0 25px ${COLORS.accent}4d, inset 0 0 15px ${COLORS.accent}33`,
				borderRadius: '10px',
				padding: '10px 20px',
				color: COLORS.ink,
				fontSize: '13px',
				fontWeight: '800',
				letterSpacing: '2px',
				textAlign: 'center',
				backdropFilter: 'blur(12px)',
				fontFamily: 'Inter, system-ui, sans-serif',
				display: 'flex',
				alignItems: 'center',
				gap: '8px'
			}}>
				<span style={{ textShadow: `0 0 10px ${COLORS.accent}` }}>⚡ AUTOPILOT ENGINE</span>
			</div>
		</div>
	);
};
