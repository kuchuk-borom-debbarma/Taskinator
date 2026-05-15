import "react";
import "./index.css";
import { Composition } from "remotion";
import { FeatureShowcase } from "./FeatureShowcase";
import { SchemaDesign } from "./SchemaDesign";
import { SyncArchitecture } from "./SyncArchitecture";
import { AsyncProblems } from "./AsyncProblems";
import { TransactionalOutbox } from "./TransactionalOutbox";
import { UpgradedAsyncFlow } from "./UpgradedAsyncFlow";
import { ConcurrencyControl } from "./ConcurrencyControl";
import { SmartAggregation } from "./SmartAggregation";
import { ChunkedDeletion } from "./ChunkedDeletion";
import { RealtimeSSE } from "./RealtimeSSE";
import { FinalArchitecture } from "./FinalArchitecture";
import { AutopilotOverview } from "./AutopilotOverview";
import { ConditionEvaluator } from "./ConditionEvaluator";
import { ActionChain } from "./ActionChain";
import { LoopDetector } from "./LoopDetector";
import { VisualConditionBuilder } from "./VisualConditionBuilder";
import { ActionPipelineEditor } from "./ActionPipelineEditor";
import { DynamicConfig } from "./DynamicConfig";
import { MasterPresentation } from "./MasterPresentation";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MasterPresentation"
        component={MasterPresentation}
        durationInFrames={29885}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="FinalArchitecture"
        component={FinalArchitecture}
        durationInFrames={1290}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="RealtimeSSE"
        component={RealtimeSSE}
        durationInFrames={3090}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="ChunkedDeletion"
        component={ChunkedDeletion}
        durationInFrames={1950}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="SmartAggregation"
        component={SmartAggregation}
        durationInFrames={3660}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="FeatureShowcase"
        component={FeatureShowcase}
        durationInFrames={810}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="SchemaDesign"
        component={SchemaDesign}
        durationInFrames={3360}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="SyncArchitecture"
        component={SyncArchitecture}
        durationInFrames={3750}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="AsyncProblems"
        component={AsyncProblems}
        durationInFrames={1620}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="TransactionalOutbox"
        component={TransactionalOutbox}
        durationInFrames={2820}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="UpgradedAsyncFlow"
        component={UpgradedAsyncFlow}
        durationInFrames={930}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="ConcurrencyControl"
        component={ConcurrencyControl}
        durationInFrames={1560}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="AutopilotOverview"
        component={AutopilotOverview}
        durationInFrames={900}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="ConditionEvaluator"
        component={ConditionEvaluator}
        durationInFrames={1200}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="ActionChain"
        component={ActionChain}
        durationInFrames={900}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="LoopDetector"
        component={LoopDetector}
        durationInFrames={900}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="VisualConditionBuilder"
        component={VisualConditionBuilder}
        durationInFrames={900}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="ActionPipelineEditor"
        component={ActionPipelineEditor}
        durationInFrames={900}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="DynamicConfig"
        component={DynamicConfig}
        durationInFrames={600}
        fps={30}
        width={1280}
        height={720}
      />
    </>
  );
};
