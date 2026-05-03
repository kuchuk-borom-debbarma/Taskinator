import "./index.css";
import { Composition } from "remotion";
import { MyComposition } from "./Composition";
import { FeatureShowcase } from "./FeatureShowcase";
import { SchemaDesign } from "./SchemaDesign";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MyComp"
        component={MyComposition}
        durationInFrames={60}
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
        durationInFrames={450}
        fps={30}
        width={1280}
        height={720}
      />
    </>
  );
};
