import React from 'react';
import { AbsoluteFill, Sequence, useVideoConfig, spring, useCurrentFrame, interpolate, Easing } from 'remotion';
import { ProjectNode, TeamNode, MemberNode, TaskNode, AutopilotNode, COLORS, GRADIENTS } from './components/Nodes';
import { DependencyLink } from './components/Link';
import { TitleCard } from './components/TitleCard';
import { TypographyIntro } from './components/TypographyIntro';

/**
 * AnimatedItem: Reusable component for moving nodes from a start point to an end point.
 */
const AnimatedItem: React.FC<{ 
	component: React.ReactNode;
	startPos: { x: number, y: number }; 
	endPos: { x: number, y: number };
	showAt: number;
	moveAt: number;
	zIndex?: number;
}> = ({ component, startPos, endPos, showAt, moveAt, zIndex = 20 }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	
	const appearance = spring({ frame: frame - showAt, fps, config: { damping: 12 } });
	const movement = spring({ frame: frame - moveAt, fps, config: { damping: 15, stiffness: 60 } });

	const x = interpolate(movement, [0, 1], [startPos.x, endPos.x], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) });
	const y = interpolate(movement, [0, 1], [startPos.y, endPos.y], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) });

	return (
		<div style={{ 
			position: 'absolute', 
			top: y, 
			left: x, 
			opacity: appearance,
			transform: `scale(${appearance})`,
			zIndex
		}}>
			{component}
		</div>
	);
};

/**
 * ProgressIndicator: Shows what's happening on the top left.
 */
const ProgressIndicator: React.FC<{ segmentFrame: number; fps: number }> = ({ segmentFrame, fps }) => {
	const steps = [
		{ frame: 0, text: "Creating Project..." },
		{ frame: fps * 1, text: "Adding Members to Project..." },
		{ frame: fps * 2.5, text: "Creating Teams..." },
		{ frame: fps * 4, text: "Assigning Members to Teams..." },
		{ frame: fps * 5.5, text: "Creating New Tasks..." },
		{ frame: fps * 8.5, text: "Assigning Tasks to Teams..." },
		{ frame: fps * 11.5, text: "Creating Orchestration Links..." },
		{ frame: fps * 15.0, text: "⚡ Activating Autopilot Engine..." }
	];

	// Find the current active step based on frame
	const currentStep = [...steps].reverse().find(s => segmentFrame >= s.frame) || steps[0];

	return (
		<div style={{
			position: 'absolute',
			top: '30px',
			left: '30px',
			background: 'rgba(15, 23, 42, 0.6)',
			padding: '12px 20px',
			borderRadius: '12px',
			boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
			border: '1px solid rgba(0, 229, 255, 0.2)',
			backdropFilter: 'blur(12px)',
			zIndex: 100,
			display: 'flex',
			alignItems: 'center',
			gap: '10px'
		}}>
			<div style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS.accent, boxShadow: `0 0 8px ${COLORS.accent}` }} />
			<span style={{ fontSize: '14px', fontWeight: '700', color: COLORS.ink, fontFamily: 'Inter, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
				{currentStep.text}
			</span>
		</div>
	);
};

export const FeatureShowcase: React.FC = () => {
	const { fps, width } = useVideoConfig();
	const frame = useCurrentFrame();

	const centerX = width / 2;
	const segmentFrame = frame - fps * 7;

	return (
		<AbsoluteFill style={{ background: GRADIENTS.bg }}>
			{/* Segment 1: High-level Title Card */}
			<Sequence from={0} durationInFrames={fps * 3} layout="none">
				<TitleCard title="Designing the High Throughput Backend for Taskinator" />
			</Sequence>

			{/* Segment 2: Philosophical Intro */}
			<Sequence from={fps * 3} durationInFrames={fps * 4} layout="none">
				<TypographyIntro text="Taskinator is a performant project management application with focus on connection between tasks." />
			</Sequence>

			{/* Segment 3: The Hierarchical Cascade Flow */}
			<Sequence from={fps * 7} durationInFrames={fps * 25} layout="none">
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
						{/* Progress Indicator (Top Left) */}
						<ProgressIndicator segmentFrame={segmentFrame} fps={fps} />

						{/* --- LAYER 1: PROJECT — top-center --- */}
						<div style={{ 
							position: 'absolute', top: 40, left: centerX - 110,
							opacity: spring({ frame: segmentFrame, fps }),
							transform: `translateY(${interpolate(spring({ frame: segmentFrame, fps }), [0, 1], [-10, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })}px)`
						}}>
							<ProjectNode label="Gourmet Bistro" />
						</div>

						{/* --- LAYER 2: TEAMS — spread wide across mid-canvas --- */}
						<Sequence from={fps * 2.5} layout="none">
							<div style={{ position: 'absolute', top: 210, left: centerX - 490 }}><TeamNode label="Logistics" /></div>
							<div style={{ position: 'absolute', top: 210, left: centerX - 85 }}><TeamNode label="Kitchen Crew" /></div>
							<div style={{ position: 'absolute', top: 210, left: centerX + 310 }}><TeamNode label="Front of House" /></div>
						</Sequence>

						{/* --- MEMBER MIGRATION — spawn near Project center, disperse to teams --- */}
						{/* Logistics members */}
						<AnimatedItem component={<MemberNode name="Mario" color="#FF1744" />} startPos={{x: centerX - 240, y: 50}} endPos={{x: centerX - 470, y: 320}} showAt={fps * 1.0} moveAt={fps * 4.0} />
						<AnimatedItem component={<MemberNode name="Elena" color="#FF5100" />} startPos={{x: centerX - 310, y: 50}} endPos={{x: centerX - 390, y: 320}} showAt={fps * 1.3} moveAt={fps * 4.3} />
						{/* Kitchen Crew member */}
						<AnimatedItem component={<MemberNode name="Luigi" color="#00E676" />} startPos={{x: centerX + 170, y: 50}} endPos={{x: centerX - 65,  y: 320}} showAt={fps * 1.1} moveAt={fps * 4.1} />
						{/* Front of House member */}
						<AnimatedItem component={<MemberNode name="Sarah" color="#00E5FF" />} startPos={{x: centerX + 240, y: 50}} endPos={{x: centerX + 325, y: 320}} showAt={fps * 1.2} moveAt={fps * 4.2} />

						{/* --- TASK MIGRATION — queue in center, fan out to bottom two rows --- */}
						<Sequence from={fps * 5.5} layout="none">
							<h3 style={{ position: 'absolute', top: 160, left: centerX - 55, fontSize: '10px', fontWeight: '800', color: COLORS.muted, letterSpacing: '1px', textTransform: 'uppercase', opacity: interpolate(segmentFrame, [fps * 5.5, fps * 5.8, fps * 8.5, fps * 9.0], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
								Incoming Tasks
							</h3>
						</Sequence>

						{/* Row 1 tasks — y≈430 */}
						<AnimatedItem component={<TaskNode label="Inventory" />} startPos={{x: centerX - 300, y: 170}} endPos={{x: centerX - 480, y: 430}} showAt={fps * 5.5} moveAt={fps * 8.5} />
						<AnimatedItem component={<TaskNode label="Prep" />}      startPos={{x: centerX - 150, y: 170}} endPos={{x: centerX - 90,  y: 430}} showAt={fps * 5.7} moveAt={fps * 8.6} />
						<AnimatedItem component={<TaskNode label="Booking" />}   startPos={{x: centerX + 150, y: 170}} endPos={{x: centerX + 320, y: 430}} showAt={fps * 6.1} moveAt={fps * 8.8} />
						
						{/* Success Spring for downstream Autopilot tasks */}
						{(() => {
							const successSpring = spring({ frame: segmentFrame - fps * 18.0, fps, config: { damping: 15 } });
							return (
								<>
									{/* Row 2 tasks — y≈545 */}
									<AnimatedItem component={<TaskNode label="Cooking" successProgress={successSpring} />}   startPos={{x: centerX,       y: 170}} endPos={{x: centerX - 90,  y: 545}} showAt={fps * 5.9} moveAt={fps * 8.7} />
									<AnimatedItem component={<TaskNode label="Service" successProgress={successSpring} />}   startPos={{x: centerX + 300, y: 170}} endPos={{x: centerX + 320, y: 545}} showAt={fps * 6.3} moveAt={fps * 8.9} />
								</>
							);
						})()}

						{/* --- ORCHESTRATION LINKS — connect tasks across the bottom rows --- */}
						<Sequence from={fps * 11.5} layout="none">
							{/* Inventory → Prep (row 1, horizontal) */}
							<DependencyLink from={{ x: centerX - 345, y: 452 }} to={{ x: centerX - 90,  y: 452 }} label="Required" />
							{/* Prep → Cooking (row 1 → row 2, vertical) */}
							<DependencyLink from={{ x: centerX - 25,  y: 453 }} to={{ x: centerX - 25,  y: 545 }} label="Prerequisite" />
							{/* Booking → Service (row 1 → row 2, vertical) */}
							<DependencyLink from={{ x: centerX + 385, y: 453 }} to={{ x: centerX + 385, y: 545 }} label="Triggers" />
							{/* Cooking → Service (row 2, horizontal) */}
							<DependencyLink from={{ x: centerX + 50,  y: 567 }} to={{ x: centerX + 320, y: 567 }} label="Unlocks" />
						</Sequence>

						{/* --- AUTOPILOT INTEGRATION — materialize at center, pulse trigger downstream --- */}
						<Sequence from={fps * 15.0} layout="none">
							<div style={{ 
								position: 'absolute', 
								top: 325, 
								left: centerX - 110,
								zIndex: 40
							}}>
								<AutopilotNode />
							</div>
						</Sequence>

						<Sequence from={fps * 16.5} layout="none">
							{/* Pulse 1: Autopilot → Cooking */}
							<DependencyLink from={{ x: centerX, y: 375 }} to={{ x: centerX - 25, y: 545 }} label="Trigger" />
							{/* Pulse 2: Autopilot → Service */}
							<DependencyLink from={{ x: centerX, y: 375 }} to={{ x: centerX + 385, y: 545 }} label="Trigger" />
						</Sequence>
					</div>
				</AbsoluteFill>
			</Sequence>
		</AbsoluteFill>
	);
};
