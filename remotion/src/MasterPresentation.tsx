import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, interpolate } from 'remotion';

// Central Playlist Modules (Narrative Order D-01)
import { FeatureShowcase } from './FeatureShowcase';
import { SchemaDesign } from './SchemaDesign';
import { SyncArchitecture } from './SyncArchitecture';
import { AsyncProblems } from './AsyncProblems';
import { TransactionalOutbox } from './TransactionalOutbox';
import { UpgradedAsyncFlow } from './UpgradedAsyncFlow';
import { ConcurrencyControl } from './ConcurrencyControl';
import { SmartAggregation } from './SmartAggregation';
import { ChunkedDeletion } from './ChunkedDeletion';
import { RealtimeSSE } from './RealtimeSSE';
import { AutopilotOverview } from './AutopilotOverview';
import { ConditionEvaluator } from './ConditionEvaluator';
import { ActionChain } from './ActionChain';
import { LoopDetector } from './LoopDetector';
import { VisualConditionBuilder } from './VisualConditionBuilder';
import { ActionPipelineEditor } from './ActionPipelineEditor';
import { DynamicConfig } from './DynamicConfig';
import { FinalArchitecture } from './FinalArchitecture';

const OVERLAP = 15; // Frame overlap count for smooth crossfades

// Narrative Matrix definitions with local scene durations
const SCENES = [
	{ Component: FeatureShowcase, duration: 810 },
	{ Component: SchemaDesign, duration: 3360 },
	{ Component: SyncArchitecture, duration: 3750 },
	{ Component: AsyncProblems, duration: 1620 },
	{ Component: TransactionalOutbox, duration: 2820 },
	{ Component: UpgradedAsyncFlow, duration: 930 },
	{ Component: ConcurrencyControl, duration: 1560 },
	{ Component: SmartAggregation, duration: 3660 },
	{ Component: ChunkedDeletion, duration: 1950 },
	{ Component: RealtimeSSE, duration: 3090 },
	{ Component: AutopilotOverview, duration: 900 },
	{ Component: ConditionEvaluator, duration: 1200 },
	{ Component: ActionChain, duration: 900 },
	{ Component: LoopDetector, duration: 900 },
	{ Component: VisualConditionBuilder, duration: 900 },
	{ Component: ActionPipelineEditor, duration: 900 },
	{ Component: DynamicConfig, duration: 600 },
	{ Component: FinalArchitecture, duration: 1290 },
];

/* ── Scene Wrapper with Cinema-Grade Dissolve Crossfades ── */
const SceneWrapper: React.FC<{ Component: React.ComponentType; duration: number }> = ({ Component, duration }) => {
	const frame = useCurrentFrame();
	// Smooth Opacity Crossfade curve tied entirely to Local frame sequence bounds
	const opacity = interpolate(
		frame,
		[0, OVERLAP, duration - OVERLAP, duration],
		[0, 1, 1, 0],
		{ extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
	);

	return (
		<AbsoluteFill style={{ opacity, background: '#000' }}>
			<Component />
		</AbsoluteFill>
	);
};

/* ── Main Master Presentation Timeline ── */
export const MasterPresentation: React.FC = () => {
	let currentCumulativeStart = 0;

	return (
		<AbsoluteFill style={{ background: '#000' }}>
			{SCENES.map((scene, index) => {
				const sceneStart = currentCumulativeStart;
				// Calculate next start subtracting standard overlap to sustain dissolving layers
				currentCumulativeStart += scene.duration - OVERLAP;

				return (
					<Sequence 
						key={index} 
						from={sceneStart} 
						durationInFrames={scene.duration} 
						layout="none"
					>
						<SceneWrapper Component={scene.Component} duration={scene.duration} />
					</Sequence>
				);
			})}
		</AbsoluteFill>
	);
};
