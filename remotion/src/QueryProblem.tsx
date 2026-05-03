import React from 'react';
import { AbsoluteFill, Sequence, useVideoConfig, useCurrentFrame, spring, interpolate } from 'remotion';
import { COLORS, GRADIENTS } from './components/Nodes';
import { DependencyLink } from './components/Link';

const SystemNode: React.FC<{ label: string; icon?: string; color: string }> = ({ label, icon, color }) => (
	<div style={{
		background: 'rgba(30, 41, 59, 0.8)',
		border: `2px solid ${color}`,
		boxShadow: `0 0 30px ${color}40, inset 0 0 15px ${color}20`,
		color: COLORS.ink, padding: '20px 30px', borderRadius: '16px',
		display: 'flex', flexDirection: 'column', alignItems: 'center',
		backdropFilter: 'blur(12px)',
		fontFamily: 'Inter', minWidth: '160px'
	}}>
		{icon && <div style={{ fontSize: '32px', marginBottom: '10px' }}>{icon}</div>}
		<div style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '1px', textAlign: 'center' }}>{label}</div>
	</div>
);

const QueryNode: React.FC<{ code: string; color: string }> = ({ code, color }) => (
	<div style={{
		background: 'rgba(15, 23, 42, 0.9)',
		borderLeft: `4px solid ${color}`,
		padding: '12px 16px', borderRadius: '8px',
		fontFamily: 'monospace', color: COLORS.ink, fontSize: '12px',
		boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
		whiteSpace: 'nowrap'
	}}>
		{code}
	</div>
);

export const QueryProblem: React.FC = () => {
	const { fps, width } = useVideoConfig();
	const frame = useCurrentFrame();

	const showClient = spring({ frame: frame - fps * 0.5, fps });
	const showApi = spring({ frame: frame - fps * 1.5, fps });
	const showDb = spring({ frame: frame - fps * 3.5, fps });

	const q1 = spring({ frame: frame - fps * 4.5, fps });
	const q2 = spring({ frame: frame - fps * 5.5, fps });
	const q3 = spring({ frame: frame - fps * 6.5, fps });
	const q4 = spring({ frame: frame - fps * 7.5, fps });
	const showWarning = spring({ frame: frame - fps * 9, fps, config: { damping: 12, stiffness: 150 } });

	return (
		<AbsoluteFill style={{ padding: '40px', justifyContent: 'center', alignItems: 'center' }}>
			<div style={{
				width: '100%', height: '100%',
				background: 'rgba(30, 41, 59, 0.2)',
				backdropFilter: 'blur(30px)',
				borderRadius: '20px',
				border: '1px solid rgba(255, 255, 255, 0.1)',
				boxShadow: '0 30px 80px rgba(0, 0, 0, 0.5), inset 0 0 40px rgba(0, 229, 255, 0.05)',
				position: 'relative',
				overflow: 'hidden'
			}}>
				<h2 style={{
					position: 'absolute', top: '20px', left: '30px',
					color: COLORS.warning, fontFamily: 'Inter', fontSize: '24px', margin: 0,
				}}>
					The Read Amplification Problem
				</h2>

				{/* Nodes */}
				<div style={{ position: 'absolute', left: 40, top: 250, opacity: showClient, transform: `scale(${showClient})`, zIndex: 10 }}>
					<SystemNode label="Client App" icon="📱" color={COLORS.accent} />
					<div style={{ 
						marginTop: 16, background: 'rgba(0, 229, 255, 0.1)', padding: '16px', borderRadius: 12, 
						fontSize: 13, color: COLORS.ink, fontFamily: 'Inter', border: `1px solid ${COLORS.accent}`,
						boxShadow: `0 8px 24px rgba(0,0,0,0.3)`, maxWidth: '240px', lineHeight: '1.5'
					}}>
						When client is requesting a project, it is also expecting the team count, the task count, and the members count.
					</div>
				</div>
				<div style={{ position: 'absolute', left: 360, top: 280, opacity: showApi, transform: `scale(${showApi})`, zIndex: 10 }}>
					<SystemNode label="API Server" icon="⚙️" color={COLORS.success} />
				</div>
				<div style={{ position: 'absolute', left: 950, top: 280, opacity: showDb, transform: `scale(${showDb})`, zIndex: 10 }}>
					<SystemNode label="PostgreSQL" icon="🗄️" color={COLORS.accent3} />
				</div>

				{/* Link: Client -> API */}
				<Sequence from={fps * 2.5}>
					<DependencyLink from={{x: 200, y: 340}} to={{x: 360, y: 340}} label="Req: Project + Counts" durationInFrames={fps} />
				</Sequence>

				{/* Links & Queries: API -> DB */}
				<Sequence from={fps * 4.5}>
					<DependencyLink from={{x: 520, y: 300}} to={{x: 950, y: 160}} label="Project Info" durationInFrames={fps} />
					<div style={{ position: 'absolute', left: 620, top: 120, opacity: q1, transform: `scale(${q1})`, zIndex: 20 }}>
						<QueryNode code="SELECT * FROM project..." color={COLORS.accent3} />
					</div>
				</Sequence>
				<Sequence from={fps * 5.5}>
					<DependencyLink from={{x: 520, y: 320}} to={{x: 950, y: 260}} label="Members Count" durationInFrames={fps} />
					<div style={{ position: 'absolute', left: 620, top: 220, opacity: q2, transform: `scale(${q2})`, zIndex: 20 }}>
						<QueryNode code="SELECT COUNT(*) FROM project_member..." color={COLORS.warning} />
					</div>
				</Sequence>
				<Sequence from={fps * 6.5}>
					<DependencyLink from={{x: 520, y: 340}} to={{x: 950, y: 420}} label="Teams Count" durationInFrames={fps} />
					<div style={{ position: 'absolute', left: 620, top: 380, opacity: q3, transform: `scale(${q3})`, zIndex: 20 }}>
						<QueryNode code="SELECT COUNT(*) FROM project_team..." color={COLORS.warning} />
					</div>
				</Sequence>
				<Sequence from={fps * 7.5}>
					<DependencyLink from={{x: 520, y: 360}} to={{x: 950, y: 520}} label="Tasks Count" durationInFrames={fps} />
					<div style={{ position: 'absolute', left: 620, top: 480, opacity: q4, transform: `scale(${q4})`, zIndex: 20 }}>
						<QueryNode code="SELECT COUNT(*) FROM project_task..." color={COLORS.warning} />
					</div>
				</Sequence>

				{/* Warning Alert */}
				<div style={{
					position: 'absolute', left: 0, right: 0, bottom: 60, display: 'flex', justifyContent: 'center',
					opacity: showWarning, transform: `translateY(${interpolate(showWarning, [0, 1], [50, 0])}px)`, zIndex: 30
				}}>
					<div style={{
						background: 'rgba(255, 23, 68, 0.2)',
						border: `2px solid ${COLORS.danger}`,
						color: COLORS.ink, padding: '16px 32px', borderRadius: '12px',
						fontSize: '22px', fontWeight: '800', fontFamily: 'Inter',
						boxShadow: `0 0 40px rgba(255, 23, 68, 0.5)`, backdropFilter: 'blur(10px)',
						letterSpacing: '1px'
					}}>
						🚨 Read Amplification: N+1 Problem (4 Queries per Project)
					</div>
				</div>
			</div>
		</AbsoluteFill>
	);
};
