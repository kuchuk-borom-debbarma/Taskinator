import "./index.css";
import { Composition } from "remotion";
import { MyComposition } from "./Composition";
import {
  totalDuration,
  VIDEO_FPS,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
} from "./architecture-data";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="TaskinatorArchitecture"
        component={MyComposition}
        durationInFrames={totalDuration}
        fps={VIDEO_FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
      />
    </>
  );
};
