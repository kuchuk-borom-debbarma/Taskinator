import React from 'react';
import { AbsoluteFill, Sequence, useVideoConfig } from 'remotion';
import { GRADIENTS } from './components/Nodes';

// Sub-compositions
import { TitleSlide, PollingProblemSlide } from './RealtimeProblems';
import { RedisPubSubSlide, GraphQLSubscriptionSlide } from './RealtimeArchitecture';
import { MultiInstanceIsolationSlide, BeforeAfterComparisonSlide } from './RealtimeIsolation';

export const RealtimeSSE: React.FC = () => {
	const { fps } = useVideoConfig();
	
	return (
		<AbsoluteFill style={{ background: GRADIENTS.bg }}>
			<Sequence from={0}            durationInFrames={fps * 3}>   <TitleSlide />                 </Sequence>
			<Sequence from={fps * 3}      durationInFrames={fps * 15}>  <PollingProblemSlide />        </Sequence>
			<Sequence from={fps * 18}     durationInFrames={fps * 15}>  <RedisPubSubSlide />           </Sequence>
			<Sequence from={fps * 33}     durationInFrames={fps * 15}>  <GraphQLSubscriptionSlide />   </Sequence>
			<Sequence from={fps * 48}     durationInFrames={fps * 15}>  <MultiInstanceIsolationSlide /></Sequence>
			<Sequence from={fps * 63}>                                  <BeforeAfterComparisonSlide /> </Sequence>
		</AbsoluteFill>
	);
};
