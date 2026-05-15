import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';

const COLORS = {
	project: '#4F46E5',
	team: '#0D9488',
	member: '#E11D48',
	task: '#F8FAFC',
	text: '#1E293B',
	highlight: '#F59E0B',
};

export const FeatureItem: React.FC<{ label: string; active: boolean }> = ({ label, active }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	const opacity = spring({
		frame,
		fps,
		config: { damping: 20 },
	});

	return (
		<div
			style={{
				opacity,
				display: 'flex',
				alignItems: 'center',
				gap: '12px',
				marginBottom: '16px',
				transform: active ? 'translateX(10px)' : 'translateX(0)',
				transition: 'transform 0.3s ease',
			}}
		>
			<div
				style={{
					width: '12px',
					height: '12px',
					borderRadius: '50%',
					backgroundColor: active ? COLORS.highlight : '#CBD5E1',
					boxShadow: active ? `0 0 10px ${COLORS.highlight}` : 'none',
				}}
			/>
			<span
				style={{
					fontSize: '24px',
					fontWeight: active ? '700' : '400',
					color: active ? COLORS.text : '#94A3B8',
				}}
			>
				{label}
			</span>
		</div>
	);
};

export const FeatureList: React.FC<{ activeIndex: number }> = ({ activeIndex }) => {
	const features = [
		'Create Projects',
		'Manage Teams',
		'Assign Members',
		'Orchestrate Tasks',
		'Define Dependencies',
	];

	return (
		<div
			style={{
				position: 'absolute',
				top: '100px',
				left: '80px',
				width: '350px',
				padding: '40px',
				backgroundColor: 'white',
				borderRadius: '24px',
				boxShadow: '0 20px 50px rgba(0,0,0,0.05)',
				border: '1px solid #F1F5F9',
			}}
		>
			<h3 style={{ color: '#64748B', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '30px' }}>
				Core Capabilities
			</h3>
			{features.map((f, i) => (
				<FeatureItem key={f} label={f} active={i === activeIndex} />
			))}
		</div>
	);
};
