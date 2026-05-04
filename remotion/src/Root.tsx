import "react";
import "./index.css";
import { Composition } from "remotion";
import { MyComposition } from "./Composition";
import { FeatureShowcase } from "./FeatureShowcase";
import { SchemaDesign } from "./SchemaDesign";
import { SyncArchitecture } from "./SyncArchitecture";
import { AsyncProblems } from "./AsyncProblems";
import { TransactionalOutbox } from "./TransactionalOutbox";

export const RemotionRoot: React.FC = () => {
  return (
    <>
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
        durationInFrames={1500}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="TransactionalOutbox"
        component={TransactionalOutbox}
        durationInFrames={1500}
        fps={30}
        width={1280}
        height={720}
      />
    </>
  );
};
