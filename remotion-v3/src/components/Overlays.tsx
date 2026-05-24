import React from "react";
import { useCurrentFrame } from "remotion";
import { COLORS, FONTS, fadeIn, ease, progress } from "../design";
import { CHAPTERS } from "../chapters";

interface SubtitleEntry {
  startFrame: number;
  endFrame: number;
  text: string;
}

// Chapter progress indicator (top bar)
export const ChapterProgress: React.FC = () => {
  const frame = useCurrentFrame();

  const currentChapter = CHAPTERS.findIndex((ch, i) => {
    const next = CHAPTERS[i + 1];
    return frame >= ch.start && (!next || frame < next.start);
  });

  const chapterLabels = [
    'Cold Open',
    'Architecture',
    'Tech Stack',
    'Database',
    'Kafka',
    'Choreography',
    'Idempotency',
    'Opt. Locking',
    'SQL Patterns',
    'API Layer',
    'Automation',
    'Outro',
  ];

  const op = fadeIn(frame, 5, 15);

  return (
    <div style={{
      position: 'absolute',
      top: 0, left: 0, right: 0,
      height: 3,
      background: 'rgba(0,0,0,0.5)',
      zIndex: 100,
      opacity: op,
    }}>
      {/* Per-chapter segments */}
      <div style={{ display: 'flex', height: '100%' }}>
        {CHAPTERS.map((ch, i) => {
          const isActive = i === currentChapter;
          const isPast = i < currentChapter;
          let fillPct = isPast ? 100 : 0;
          if (isActive) {
            const localProgress = (frame - ch.start) / ch.duration;
            fillPct = Math.min(100, localProgress * 100);
          }
          return (
            <div key={i} style={{
              flex: ch.duration,
              height: '100%',
              background: isPast ? COLORS.accent : 'rgba(255,255,255,0.1)',
              position: 'relative',
              borderRight: i < CHAPTERS.length - 1 ? '1px solid rgba(0,0,0,0.5)' : 'none',
            }}>
              {isActive && (
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0,
                  width: fillPct + '%',
                  background: COLORS.accent,
                  boxShadow: `0 0 8px ${COLORS.accent}`,
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Chapter label overlay (top-left)
export const ChapterLabel: React.FC = () => {
  const frame = useCurrentFrame();

  const currentChapter = CHAPTERS.findIndex((ch, i) => {
    const next = CHAPTERS[i + 1];
    return frame >= ch.start && (!next || frame < next.start);
  });

  const chapterNames = [
    null, // cold open has no label
    '01 — Architecture',
    '02 — Tech Stack',
    '03 — Database Schema',
    '04 — Kafka Event Bus',
    '05 — Choreography Pattern',
    '06 — Idempotency',
    '07 — Optimistic Locking',
    '08 — SQL Performance',
    '09 — API Layer',
    '10 — TCA Automation',
    '11 — Outro',
  ];

  const name = chapterNames[currentChapter];
  if (!name) return null;

  const ch = CHAPTERS[currentChapter];
  const localFrame = frame - ch.start;
  const showLabel = localFrame < 80;
  const op = localFrame < 40
    ? fadeIn(localFrame + frame - frame, 0, 20)
    : progress(localFrame, 50, 80, ease.inOutCubic) > 0
    ? 1 - progress(localFrame, 50, 80, ease.inOutCubic)
    : 1;

  return (
    <div style={{
      position: 'absolute',
      top: 20, left: 20,
      opacity: op * (showLabel ? 1 : 0),
      zIndex: 99,
    }}>
      <div style={{
        background: 'rgba(0,0,0,0.6)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8, padding: '6px 14px',
        fontSize: 12, color: COLORS.textMuted, fontWeight: 600,
        letterSpacing: 0.5,
        backdropFilter: 'blur(8px)',
      }}>{name}</div>
    </div>
  );
};

// Subtitle display (bottom center) - for facecam recording
export const Subtitle: React.FC<{ entries: SubtitleEntry[] }> = ({ entries }) => {
  const frame = useCurrentFrame();

  const current = entries.find(e => frame >= e.startFrame && frame <= e.endFrame);
  if (!current) return null;

  const localFrame = frame - current.startFrame;
  const duration = current.endFrame - current.startFrame;
  const fadeInFrames = 8;
  const fadeOutFrames = 8;

  const op = localFrame < fadeInFrames
    ? localFrame / fadeInFrames
    : localFrame > duration - fadeOutFrames
    ? (duration - localFrame) / fadeOutFrames
    : 1;

  return (
    <div style={{
      position: 'absolute',
      bottom: 60, left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 100,
      maxWidth: '80%',
      opacity: op,
    }}>
      <div style={{
        background: 'rgba(0,0,0,0.82)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: '12px 24px',
        textAlign: 'center',
        backdropFilter: 'blur(16px)',
      }}>
        <div style={{
          fontSize: 18,
          color: COLORS.text,
          lineHeight: 1.5,
          fontWeight: 500,
          fontFamily: FONTS.sans,
          textShadow: '0 2px 8px rgba(0,0,0,0.8)',
        }}>{current.text}</div>
      </div>
    </div>
  );
};
