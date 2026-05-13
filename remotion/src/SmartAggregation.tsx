import React from 'react';
import { AbsoluteFill, Sequence, useVideoConfig } from 'remotion';
import { GRADIENTS } from './components/Nodes';

// Sub-compositions
import { TitleSlide, NaiveListenerSlide, FanoutExplosionSlide } from './SmartAggregationProblems';
import { SolutionIntroSlide, TwoPhasePipelineSlide } from './SmartAggregationSolution';
import { NaiveExplosionSlide, AggregatedDeletionSlide } from './SmartAggregationExample';
import { SkipLockedSlide, IdempotencySlide } from './SmartAggregationMechanics';

export const SmartAggregation: React.FC = () => {
	const { fps } = useVideoConfig();
	
	return (
		<AbsoluteFill style={{ background: GRADIENTS.bg }}>
			<Sequence from={0}            durationInFrames={fps * 3}>   <TitleSlide />              </Sequence>
			<Sequence from={fps * 3}      durationInFrames={fps * 12}>  <NaiveListenerSlide />      </Sequence>
			<Sequence from={fps * 15}     durationInFrames={fps * 12}>  <FanoutExplosionSlide />    </Sequence>
			<Sequence from={fps * 27}     durationInFrames={fps * 9}>   <SolutionIntroSlide />      </Sequence>
			<Sequence from={fps * 36}     durationInFrames={fps * 20}>  <TwoPhasePipelineSlide />   </Sequence>
			<Sequence from={fps * 56}     durationInFrames={fps * 16}>  <NaiveExplosionSlide />     </Sequence>
			<Sequence from={fps * 72}     durationInFrames={fps * 20}>  <AggregatedDeletionSlide /> </Sequence>
			<Sequence from={fps * 92}     durationInFrames={fps * 14}>  <SkipLockedSlide />         </Sequence>
			<Sequence from={fps * 106}>                                 <IdempotencySlide />        </Sequence>
		</AbsoluteFill>
	);
};
