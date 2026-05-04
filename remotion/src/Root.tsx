import "./index.css";
import { Composition } from "remotion";
import { MyComposition } from "./Composition";
import { FeatureShowcase } from "./FeatureShowcase";
import { SchemaDesign } from "./SchemaDesign";
import { SyncArchitecture } from "./SyncArchitecture";

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
        durationInFrames={1620}
        fps={30}
        width={1280}
        height={720}
      />
    </>
  );
};
