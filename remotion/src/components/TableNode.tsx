import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, GRADIENTS } from './Nodes';

export const TableNode: React.FC<{
	tableName: string;
	columns: { name: string; type: string; isPk?: boolean; isFk?: boolean }[];
}> = ({ tableName, columns }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const scale = spring({ frame, fps, config: { damping: 14 } });

	return (
		<div style={{
			transform: `scale(${scale})`,
			background: GRADIENTS.surface,
			color: COLORS.ink,
			borderRadius: '12px',
			boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
			border: '1px solid rgba(255, 255, 255, 0.1)',
			backdropFilter: 'blur(16px)',
			fontFamily: 'Inter, system-ui, sans-serif',
			minWidth: '240px',
			overflow: 'hidden',
			zIndex: 10
		}}>
			<div style={{
				background: 'rgba(0, 229, 255, 0.15)',
				padding: '12px 16px',
				borderBottom: '1px solid rgba(0, 229, 255, 0.3)',
				fontSize: '16px',
				fontWeight: '800',
				textAlign: 'center',
				letterSpacing: '1px',
				color: COLORS.accent
			}}>
				{tableName}
			</div>
			<div style={{ padding: '8px 0' }}>
				{columns.map((col, idx) => (
					<div key={idx} style={{
						display: 'flex',
						justifyContent: 'space-between',
						padding: '6px 16px',
						fontSize: '12px',
						borderBottom: idx === columns.length - 1 ? 'none' : '1px solid rgba(255, 255, 255, 0.05)'
					}}>
						<span style={{ 
							fontWeight: col.isPk || col.isFk ? '700' : '500', 
							color: col.isPk ? COLORS.warning : (col.isFk ? COLORS.accent3 : COLORS.ink)
						}}>
							{col.name} {col.isPk && '(PK)'} {col.isFk && '(FK)'}
						</span>
						<span style={{ color: COLORS.muted, fontFamily: 'monospace' }}>
							{col.type}
						</span>
					</div>
				))}
			</div>
		</div>
	);
};
