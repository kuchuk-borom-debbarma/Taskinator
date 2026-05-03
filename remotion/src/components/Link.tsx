import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';

export const DependencyLink: React.FC<{
	from: { x: number; y: number };
	to: { x: number; y: number };
	label: string;
	durationInFrames?: number;
}> = ({ from, to, label, durationInFrames = 30 }) => {
	const frame = useCurrentFrame();
	
	const midY = from.y + (to.y - from.y) / 2;
	const path = `M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`;
	
	const dx = to.x - from.x;
	const dy = to.y - from.y;
	const length = Math.sqrt(dx * dx + dy * dy) * 1.2;

	const progress = interpolate(frame, [0, durationInFrames], [0, 1], {
		extrapolateRight: 'clamp',
		easing: Easing.bezier(0.4, 0, 0.2, 1),
	});

	const dashOffset = length * (1 - progress);
	
	const midXActual = (from.x + to.x) / 2;
	const midYActual = (from.y + to.y) / 2;
	
	const labelOpacity = interpolate(frame, [durationInFrames * 0.7, durationInFrames], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	return (
		<>
			<svg
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					width: '100%',
					height: '100%',
					pointerEvents: 'none',
					zIndex: 5,
				}}
			>
				<path
					d={path}
					fill="none"
					stroke="#00E5FF"
					strokeWidth="2"
					opacity={0.15}
				/>
				<path
					d={path}
					fill="none"
					stroke="#00E5FF"
					strokeWidth="3"
					strokeDasharray={length}
					strokeDashoffset={dashOffset}
					strokeLinecap="round"
					style={{
						filter: 'drop-shadow(0 0 6px rgba(0, 229, 255, 0.6))'
					}}
				/>
			</svg>
			<div style={{
				position: 'absolute',
				top: midYActual - 12,
				left: midXActual - 60,
				width: '120px',
				textAlign: 'center',
				background: 'rgba(15, 23, 42, 0.8)',
				border: '1px solid rgba(0, 229, 255, 0.3)',
				borderRadius: '12px',
				padding: '4px 8px',
				fontSize: '10px',
				fontWeight: '700',
				color: '#00E5FF',
				boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4), inset 0 0 8px rgba(0, 229, 255, 0.1)',
				opacity: labelOpacity,
				zIndex: 6,
				textTransform: 'uppercase',
				letterSpacing: '1px',
				fontFamily: 'Inter, system-ui, sans-serif',
				backdropFilter: 'blur(8px)'
			}}>
				{label}
			</div>
		</>
	);
};
