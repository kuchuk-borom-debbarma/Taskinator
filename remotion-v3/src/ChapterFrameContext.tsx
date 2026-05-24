import React, { createContext, useContext } from "react";
import { useCurrentFrame } from "remotion";

// Context to provide the chapter-local frame to all scene children
const ChapterFrameContext = createContext(0);

export const ChapterFrameProvider: React.FC<{
  chapterStart: number;
  children: React.ReactNode;
}> = ({ chapterStart, children }) => {
  const globalFrame = useCurrentFrame();
  const localFrame = Math.max(0, globalFrame - chapterStart);
  return (
    <ChapterFrameContext.Provider value={localFrame}>
      {children}
    </ChapterFrameContext.Provider>
  );
};

export function useChapterFrame(): number {
  return useContext(ChapterFrameContext);
}
