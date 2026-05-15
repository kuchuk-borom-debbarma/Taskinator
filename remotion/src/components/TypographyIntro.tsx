import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

export const TypographyIntro: React.FC<{ text: string }> = ({ text }) => {
	const frame = useCurrentFrame();


	const opacity = interpolate(frame, [0, 20, 100, 120], [0, 1, 1, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	const words = text.split(' ');

	return (
		<AbsoluteFill
			style={{
				background: `radial-gradient(circle at 10% 20%, rgba(0, 229, 255, 0.08), transparent 40%),
                     radial-gradient(circle at 90% 80%, rgba(255, 81, 0, 0.06), transparent 40%),
                     radial-gradient(circle at 50% 50%, rgba(0, 230, 118, 0.03), transparent 60%),
                     linear-gradient(180deg, #0b0f19 0%, #06090f 100%)`,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				padding: '100px',
				opacity,
			}}
		>
			<div
				style={{
					fontSize: '52px',
					fontWeight: '700',
					color: '#f8fafc',
					textAlign: 'center',
					lineHeight: '1.3',
					maxWidth: '1000px',
					fontFamily: 'Inter, system-ui, sans-serif'
				}}
			>
				{words.map((word, i) => {
					const wordOpacity = interpolate(
						frame,
						[i * 4 + 10, i * 4 + 20],
						[0, 1],
						{ extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
					);

					return (
						<span
							key={i}
							style={{
								opacity: wordOpacity,
								display: 'inline-block',
								marginRight: '14px',
							}}
						>
							{word}
						</span>
					);
				})}
			</div>
		</AbsoluteFill>
	);
};
