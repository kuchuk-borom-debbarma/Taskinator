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

export const RemotionRoot: React.FC = () => {
  return (
    <>
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
    </>
  );
};
