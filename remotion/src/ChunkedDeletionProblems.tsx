import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { COLORS, GRADIENTS } from './components/Nodes';
import { TitleCard } from './components/TitleCard';

/* ── Helpers ── */
const SP = (f: number, d: number, fps: number) => spring({ frame: f - d, fps, config: { damping: 16, stiffness: 80 } });

/* ── Shell ── */
const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
	<AbsoluteFill style={{ background: GRADIENTS.bg }}>
		<AbsoluteFill style={{ padding: 30 }}>
			<div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'rgba(15,23,42,0.3)', backdropFilter: 'blur(50px)', borderRadius: 30, border: '1.5px solid rgba(255,255,255,0.08)', boxShadow: '0 50px 120px rgba(0,0,0,0.7)' }}>
				{children}
			</div>
		</AbsoluteFill>
	</AbsoluteFill>
);

/* ── Components ── */
const Appear: React.FC<{ at: number; children: React.ReactNode; y?: number; x?: number; style?: React.CSSProperties }> = ({ at, children, y = 20, x = 0, style }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const s = SP(f, at, fps);
	return (
		<div style={{ opacity: s, transform: `translate(${interpolate(s, [0, 1], [x, 0])}px, ${interpolate(s, [0, 1], [y, 0])}px)`, ...style }}>
			{children}
		</div>
	);
};

/* ════════════════════════════════════════════════
   SLIDE 1 — Title
════════════════════════════════════════════════ */
export const TitleSlide: React.FC = () => {
	return <TitleCard title="Chunked Background Deletion" />;
};

/* ════════════════════════════════════════════════
   SLIDE 2 — Sync Delete Problem
════════════════════════════════════════════════ */
export const SyncDeleteProblemSlide: React.FC = () => {
	const f = useCurrentFrame();
	const { fps } = useVideoConfig();

	// Timer logic
	const timerStartFrame = 30;
	const timerActive = f >= timerStartFrame;
	const seconds = timerActive ? Math.min(30, (f - timerStartFrame) / fps * 3) : 0; // Speeds up time
	const isTimeout = seconds >= 30;

	return (
		<Shell>
			<Appear at={5} y={-20}>
				<div style={{ position: 'absolute', top: 40, left: 50 }}>
					<div style={{ fontSize: 12, fontWeight: 900, color: COLORS.danger, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'Inter', marginBottom: 10 }}>SYNCHRONOUS CASCADES</div>
					<h2 style={{ fontSize: 36, fontWeight: 900, color: COLORS.ink, fontFamily: 'Inter', margin: '0 0 8px' }}>The Table Lock Danger</h2>
					<p style={{ fontSize: 16, color: COLORS.muted, fontFamily: 'Inter', margin: 0, maxWidth: 800, lineHeight: 1.6 }}>
						Deleting massive hierarchies blocks the entire database table.
					</p>
				</div>
			</Appear>

			{/* Center Database Representation */}
			<Appear at={15}>
				<div style={{ position: 'absolute', top: 200, left: 200, width: 800, height: 350, background: 'rgba(15,23,42,0.9)', border: `2px solid ${COLORS.accent3}66`, borderRadius: 20, padding: 30, display: 'flex', flexDirection: 'column' }}>
					<div style={{ fontSize: 24, fontWeight: 900, color: COLORS.accent3, fontFamily: 'Inter', textAlign: 'center', marginBottom: 20 }}>🗄️ PostgreSQL Tasks Table</div>
					
					{/* The Heavy Query */}
					<Appear at={25}>
						<div style={{ background: isTimeout ? `${COLORS.danger}33` : `${COLORS.warning}22`, border: `2px solid ${isTimeout ? COLORS.danger : COLORS.warning}`, borderRadius: 16, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
							<div>
								<div style={{ fontSize: 14, color: COLORS.ink, fontFamily: 'monospace', fontWeight: 800 }}>DELETE FROM tasks WHERE project_id = 'P1' CASCADE;</div>
								<div style={{ fontSize: 12, color: COLORS.muted, fontFamily: 'Inter', marginTop: 8 }}>Deleting 10,000+ rows synchronously...</div>
							</div>
							
							{/* Lock Indicator */}
							<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
								<span style={{ fontSize: 24 }}>🔒</span>
								<span style={{ fontSize: 14, fontWeight: 900, color: COLORS.warning, textTransform: 'uppercase', letterSpacing: 1 }}>Exclusive Lock</span>
							</div>
						</div>
					</Appear>

					{/* Queueing Queries */}
					<div style={{ marginTop: 30, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
						{f >= 45 && <Appear at={45}><div style={{ padding: '8px 16px', background: `${COLORS.muted}22`, border: `1px solid ${COLORS.muted}`, borderRadius: 8, fontSize: 12, color: COLORS.muted, fontFamily: 'monospace' }}>INSERT INTO tasks... (Blocked)</div></Appear>}
						{f >= 55 && <Appear at={55}><div style={{ padding: '8px 16px', background: `${COLORS.muted}22`, border: `1px solid ${COLORS.muted}`, borderRadius: 8, fontSize: 12, color: COLORS.muted, fontFamily: 'monospace' }}>UPDATE tasks SET... (Blocked)</div></Appear>}
						{f >= 65 && <Appear at={65}><div style={{ padding: '8px 16px', background: `${COLORS.muted}22`, border: `1px solid ${COLORS.muted}`, borderRadius: 8, fontSize: 12, color: COLORS.muted, fontFamily: 'monospace' }}>DELETE FROM tasks... (Blocked)</div></Appear>}
						{f >= 75 && <Appear at={75}><div style={{ padding: '8px 16px', background: `${COLORS.muted}22`, border: `1px solid ${COLORS.muted}`, borderRadius: 8, fontSize: 12, color: COLORS.muted, fontFamily: 'monospace' }}>INSERT INTO tasks... (Blocked)</div></Appear>}
					</div>
				</div>
			</Appear>

			{/* Timer Widget */}
			<Appear at={30} x={30}>
				<div style={{ position: 'absolute', top: 220, right: -40, width: 220, background: isTimeout ? `${COLORS.danger}22` : `rgba(0,0,0,0.8)`, border: `2px solid ${isTimeout ? COLORS.danger : COLORS.accent}`, borderRadius: 16, padding: '20px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
					<div style={{ fontSize: 12, fontWeight: 900, color: COLORS.muted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Query Duration</div>
					<div style={{ fontSize: 42, fontWeight: 900, color: isTimeout ? COLORS.danger : COLORS.ink, fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums' }}>
						{seconds.toFixed(1)}s
					</div>
				</div>
			</Appear>

			{/* Crash / Timeout Banner */}
			{isTimeout && (
				<Appear at={f} y={20}>
					<div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 30 }}>
						<div style={{ background: `${COLORS.danger}22`, border: `2px solid ${COLORS.danger}`, borderRadius: 20, padding: '16px 48px', fontSize: 18, fontWeight: 900, color: COLORS.danger, fontFamily: 'Inter', boxShadow: `0 0 50px ${COLORS.danger}33`, backdropFilter: 'blur(20px)' }}>
							❌ Error: statement timeout (30s) — System Outage
						</div>
					</div>
				</Appear>
			)}
		</Shell>
	);
};
