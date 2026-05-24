import React from "react";
import { Composition } from "remotion";
import { TaskInBackend } from "./TaskInBackend";
import { TOTAL_FRAMES, FPS, WIDTH, HEIGHT } from "./chapters";

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="TaskInBackend"
        component={TaskInBackend}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
};
