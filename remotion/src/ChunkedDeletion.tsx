import React from 'react';
import { AbsoluteFill, Sequence, useVideoConfig } from 'remotion';
import { GRADIENTS } from './components/Nodes';

// Sub-compositions
import { TitleSlide, SyncDeleteProblemSlide } from './ChunkedDeletionProblems';
import { SelfSignalingLoopSlide } from './ChunkedDeletionArchitecture';
import { ChunkTransactionSlide, TuningAndIdempotencySlide } from './ChunkedDeletionMechanics';

export const ChunkedDeletion: React.FC = () => {
	const { fps } = useVideoConfig();
	
	return (
		<AbsoluteFill style={{ background: GRADIENTS.bg }}>
			<Sequence from={0}            durationInFrames={fps * 3}>   <TitleSlide />                </Sequence>
			<Sequence from={fps * 3}      durationInFrames={fps * 15}>  <SyncDeleteProblemSlide />    </Sequence>
			<Sequence from={fps * 18}     durationInFrames={fps * 20}>  <SelfSignalingLoopSlide />    </Sequence>
			<Sequence from={fps * 38}     durationInFrames={fps * 15}>  <ChunkTransactionSlide />     </Sequence>
			<Sequence from={fps * 53}>                                  <TuningAndIdempotencySlide /> </Sequence>
		</AbsoluteFill>
	);
};
