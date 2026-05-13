import React from 'react';
import { AbsoluteFill, Sequence, useVideoConfig } from 'remotion';
import { GRADIENTS } from './components/Nodes';

// Sub-compositions
import { TitleSlide, NaiveWebSocketSlide } from './RealtimeProblems';
import { RedisRegistrySlide, TargetedDeliverySlide } from './RealtimeArchitecture';
import { OfflineEfficiencySlide, BeforeAfterComparisonSlide } from './RealtimeIsolation';

export const RealtimeSSE: React.FC = () => {
	const { fps } = useVideoConfig();
	
	return (
		<AbsoluteFill style={{ background: GRADIENTS.bg }}>
			<Sequence from={0}            durationInFrames={fps * 3}>   <TitleSlide />                 </Sequence>
			<Sequence from={fps * 3}      durationInFrames={fps * 15}>  <NaiveWebSocketSlide />         </Sequence>
			<Sequence from={fps * 18}     durationInFrames={fps * 15}>  <RedisRegistrySlide />         </Sequence>
			<Sequence from={fps * 33}     durationInFrames={fps * 15}>  <TargetedDeliverySlide />      </Sequence>
			<Sequence from={fps * 48}     durationInFrames={fps * 15}>  <OfflineEfficiencySlide />     </Sequence>
			<Sequence from={fps * 63}>                                  <BeforeAfterComparisonSlide /> </Sequence>
		</AbsoluteFill>
	);
};
