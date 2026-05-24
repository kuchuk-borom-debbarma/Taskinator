// Shared design tokens and animation utilities
export const COLORS = {
  bg: '#080b14',
  bgLight: '#0d1220',
  bgCard: '#111827',
  bgCardHover: '#1a2235',
  accent: '#6366f1',       // indigo
  accentGlow: '#818cf8',
  accentSoft: '#3730a3',
  green: '#10b981',
  greenGlow: '#34d399',
  orange: '#f59e0b',
  orangeGlow: '#fbbf24',
  red: '#ef4444',
  redGlow: '#f87171',
  cyan: '#06b6d4',
  cyanGlow: '#22d3ee',
  purple: '#a855f7',
  purpleGlow: '#c084fc',
  pink: '#ec4899',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  textDim: '#475569',
  border: '#1e293b',
  borderBright: '#334155',
  kafka: '#ff6b35',
  postgres: '#336791',
  redis: '#dc382d',
  bun: '#fbf0df',
  graphql: '#e535ab',
};

export const FONTS = {
  mono: '"JetBrains Mono", "Fira Code", monospace',
  sans: '"Inter", system-ui, sans-serif',
  display: '"Inter", system-ui, sans-serif',
};

// Easing functions
export const ease = {
  outExpo: (t: number) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  outBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  inOutCubic: (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  outElastic: (t: number) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    const c4 = (2 * Math.PI) / 3;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
};

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

export function progress(frame: number, start: number, end: number, easeFn?: (t: number) => number): number {
  const t = clamp((frame - start) / (end - start), 0, 1);
  return easeFn ? easeFn(t) : t;
}

export function fadeIn(frame: number, startFrame: number, durationFrames = 20): number {
  return progress(frame, startFrame, startFrame + durationFrames, ease.outCubic);
}

export function slideUp(frame: number, startFrame: number, durationFrames = 25): number {
  return progress(frame, startFrame, startFrame + durationFrames, ease.outExpo);
}

export function scaleIn(frame: number, startFrame: number, durationFrames = 20): number {
  return progress(frame, startFrame, startFrame + durationFrames, ease.outBack);
}

// Typing animation
export function typeText(frame: number, startFrame: number, text: string, charsPerSecond = 30): string {
  const elapsed = (frame - startFrame) / 30;
  const chars = Math.floor(elapsed * charsPerSecond);
  return text.slice(0, Math.max(0, chars));
}

// Pulse animation
export function pulse(frame: number, speed = 1): number {
  return 0.5 + 0.5 * Math.sin(frame * 0.05 * speed);
}

// Float animation
export function float(frame: number, amplitude = 8, speed = 1): number {
  return Math.sin(frame * 0.03 * speed) * amplitude;
}

// Stagger helper
export function stagger(index: number, frame: number, startFrame: number, staggerFrames = 8, durationFrames = 20): number {
  return fadeIn(frame, startFrame + index * staggerFrames, durationFrames);
}
