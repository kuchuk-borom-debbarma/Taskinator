import React from 'react';
import { AbsoluteFill, Sequence, useVideoConfig, useCurrentFrame, spring } from 'remotion';
import { TableNode } from './components/TableNode';
import { COLORS, GRADIENTS } from './components/Nodes';
import { TitleCard } from './components/TitleCard';
import { QueryProblem } from './QueryProblem';

const projectCols = [
	{ name: 'id', type: 'UUID', isPk: true },
	{ name: 'name', type: 'TEXT' },
	{ name: 'description', type: 'TEXT' },
	{ name: 'fk_user_id', type: 'TEXT', isFk: true },
	{ name: 'version', type: 'INTEGER' },
	{ name: 'created_at', type: 'TIMESTAMP' },
	{ name: 'updated_at', type: 'TIMESTAMP' },
];

const projectMemberCols = [
	{ name: 'id', type: 'UUID', isPk: true },
	{ name: 'fk_project_id', type: 'UUID', isFk: true },
	{ name: 'fk_user_id', type: 'TEXT', isFk: true },
	{ name: 'version', type: 'INTEGER' },
	{ name: 'created_at', type: 'TIMESTAMP' },
	{ name: 'updated_at', type: 'TIMESTAMP' },
];

const projectTeamCols = [
	{ name: 'id', type: 'UUID', isPk: true },
	{ name: 'name', type: 'TEXT' },
	{ name: 'fk_project_id', type: 'UUID', isFk: true },
	{ name: 'fk_user_id', type: 'TEXT', isFk: true },
	{ name: 'version', type: 'INTEGER' },
	{ name: 'created_at', type: 'TIMESTAMP' },
	{ name: 'updated_at', type: 'TIMESTAMP' },
];

const projectTeamMemberCols = [
	{ name: 'id', type: 'UUID', isPk: true },
	{ name: 'fk_project_id', type: 'UUID', isFk: true },
	{ name: 'fk_team_id', type: 'UUID', isFk: true },
	{ name: 'fk_user_id', type: 'TEXT', isFk: true },
	{ name: 'version', type: 'INTEGER' },
	{ name: 'created_at', type: 'TIMESTAMP' },
	{ name: 'updated_at', type: 'TIMESTAMP' },
];

const projectTaskCols = [
	{ name: 'id', type: 'UUID', isPk: true },
	{ name: 'fk_project_id', type: 'UUID', isFk: true },
	{ name: 'fk_team_id', type: 'UUID', isFk: true },
	{ name: 'fk_member_id', type: 'TEXT', isFk: true },
	{ name: 'title', type: 'TEXT' },
	{ name: 'description', type: 'TEXT' },
	{ name: 'status', type: 'TEXT' },
	{ name: 'version', type: 'INTEGER' },
	{ name: 'created_by', type: 'TEXT' },
	{ name: 'updated_by', type: 'TEXT' },
	{ name: 'created_at', type: 'TIMESTAMP' },
	{ name: 'updated_at', type: 'TIMESTAMP' },
	{ name: 'priority', type: 'INTEGER' },
];

const taskLinkCols = [
	{ name: 'id', type: 'UUID', isPk: true },
	{ name: 'fk_project_id', type: 'UUID', isFk: true },
	{ name: 'source_task_id', type: 'UUID', isFk: true },
	{ name: 'target_task_id', type: 'UUID', isFk: true },
	{ name: 'label', type: 'TEXT' },
	{ name: 'created_by', type: 'TEXT' },
	{ name: 'created_at', type: 'TIMESTAMP' },
];

const AnimatedTable: React.FC<{
	table: { name: string; cols: any[] };
	pos: { x: number; y: number };
	showAt: number;
}> = ({ table, pos, showAt }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const appearance = spring({ frame: frame - showAt, fps, config: { damping: 12 } });

	return (
		<div style={{
			position: 'absolute',
			left: pos.x,
			top: pos.y,
			opacity: appearance,
			transform: `scale(${appearance})`,
			zIndex: 20
		}}>
			<TableNode tableName={table.name} columns={table.cols} />
		</div>
	);
};

export const SchemaDesign: React.FC = () => {
	const { fps } = useVideoConfig();
	const frame = useCurrentFrame();
	const segmentFrame = frame - fps * 3;

	return (
		<AbsoluteFill style={{ background: GRADIENTS.bg }}>
			<Sequence from={0} durationInFrames={fps * 3}>
				<TitleCard title="The Data Foundation" />
			</Sequence>

			<Sequence from={fps * 3} durationInFrames={fps * 10}>
				<AbsoluteFill style={{ padding: '20px' }}>
					<div style={{
						flex: 1,
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
							color: COLORS.ink, fontFamily: 'Inter', fontSize: '24px', margin: 0,
							opacity: spring({ frame: segmentFrame, fps })
						}}>
							Core Schema Entities
						</h2>

						<AnimatedTable table={{ name: 'project', cols: projectCols }} pos={{ x: 60, y: 80 }} showAt={fps * 4} />
						<AnimatedTable table={{ name: 'project_member', cols: projectMemberCols }} pos={{ x: 60, y: 380 }} showAt={fps * 4.5} />
						
						<AnimatedTable table={{ name: 'project_team', cols: projectTeamCols }} pos={{ x: 350, y: 80 }} showAt={fps * 5} />
						<AnimatedTable table={{ name: 'project_team_member', cols: projectTeamMemberCols }} pos={{ x: 350, y: 380 }} showAt={fps * 5.5} />
						
						<AnimatedTable table={{ name: 'project_task', cols: projectTaskCols }} pos={{ x: 640, y: 80 }} showAt={fps * 6} />
						
						<AnimatedTable table={{ name: 'task_link', cols: taskLinkCols }} pos={{ x: 950, y: 80 }} showAt={fps * 6.5} />
					</div>
				</AbsoluteFill>
			</Sequence>

			<Sequence from={fps * 13}>
				<QueryProblem />
			</Sequence>
		</AbsoluteFill>
	);
};
