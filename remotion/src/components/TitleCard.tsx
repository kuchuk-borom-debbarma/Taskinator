import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const TitleCard: React.FC<{ title: string }> = ({ title }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	const opacity = interpolate(frame, [0, 20, 70, 90], [0, 1, 1, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	const scale = spring({
		frame,
		fps,
		config: { damping: 14, stiffness: 100 },
	});

	return (
		<AbsoluteFill
			style={{
				background: '#0b0f19',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				opacity,
			}}
		>
			<h1
				style={{
					color: '#f8fafc',
					fontSize: '68px',
					fontWeight: '800',
					textAlign: 'center',
					maxWidth: '85%',
					transform: `scale(${scale})`,
					letterSpacing: '-2px',
					lineHeight: '1.1',
					fontFamily: 'Inter, system-ui, sans-serif'
				}}
			>
				{title}
			</h1>
		</AbsoluteFill>
	);
};
