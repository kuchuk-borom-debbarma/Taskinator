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

const Appear: React.FC<{ at: number; children: React.ReactNode; y?: number; x?: number; style?: React.CSSProperties }> = ({ at, children, y = 20, x = 0, style }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const s = SP(f, at, fps);
	return (
		<div style={{ opacity: s, transform: `translate(${interpolate(s, [0, 1], [x, 0])}px, ${interpolate(s, [0, 1], [y, 0])}px)`, ...style }}>
			{children}
		</div>
	);
};

const SNode: React.FC<{ icon: string; label: string; sub?: string; color: string; top: number; left: number; w: number; delay: number; glow?: boolean }> = ({ icon, label, sub, color, top, left, w, delay, glow }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const s = SP(f, delay, fps);
	return (
		<div style={{ position: 'absolute', top, left, width: w, opacity: s, transform: `scale(${s}) translateY(${interpolate(s, [0, 1], [10, 0])}px)`, background: 'rgba(15,23,42,0.95)', border: `2px solid ${color}66`, borderRadius: 20, padding: '18px 20px', textAlign: 'center', boxShadow: glow ? `0 0 40px ${color}22` : '0 15px 40px rgba(0,0,0,0.6)', zIndex: 20 }}>
			<div style={{ fontSize: 32 }}>{icon}</div>
			<div style={{ fontSize: 13, fontWeight: 900, color, letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'Inter', marginTop: 8 }}>{label}</div>
			{sub && <div style={{ fontSize: 10, color: COLORS.muted, fontFamily: 'Inter', marginTop: 4, fontWeight: 600, opacity: 0.8 }}>{sub}</div>}
		</div>
	);
};

/* ════════════════════════════════════════════════
   SLIDE 1 — Title
════════════════════════════════════════════════ */
export const TitleSlide: React.FC = () => {
	return <TitleCard title="Real-Time Subscriptions" />;
};

/* ════════════════════════════════════════════════
   SLIDE 2 — Polling Problem
════════════════════════════════════════════════ */
export const PollingProblemSlide: React.FC = () => {
	const f = useCurrentFrame();
	const { fps } = useVideoConfig();

	// Counter simulation (speeds up dramatically)
	const isPollingActive = f > 30;
	const requests = isPollingActive ? Math.floor(Math.pow((f - 30) / fps * 10, 2)) : 0;
	const emptyRate = 98; // 98% wasted

	// Create looping arrows
	const loops = Array.from({ length: 15 }).map((_, i) => {
		const startF = 30 + (i * 10);
		const isActive = f >= startF && f < startF + 20;
		return { id: i, active: isActive, startF };
	});

	return (
		<Shell>
			<Appear at={5} y={-20}>
				<div style={{ position: 'absolute', top: 40, left: 50 }}>
					<div style={{ fontSize: 12, fontWeight: 900, color: COLORS.danger, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'Inter', marginBottom: 10 }}>THE INEFFICIENCY</div>
					<h2 style={{ fontSize: 36, fontWeight: 900, color: COLORS.ink, fontFamily: 'Inter', margin: '0 0 8px' }}>HTTP Polling</h2>
					<p style={{ fontSize: 16, color: COLORS.muted, fontFamily: 'Inter', margin: 0, maxWidth: 800, lineHeight: 1.6 }}>Clients repeatedly ask the server for updates. 98% of these requests return absolutely nothing.</p>
				</div>
			</Appear>

			{/* Nodes */}
			<SNode icon="📱" label="Client A" color={COLORS.accent} top={200} left={100} w={150} delay={10} />
			<SNode icon="💻" label="Client B" color={COLORS.accent} top={350} left={100} w={150} delay={15} />
			<SNode icon="🌐" label="Client C" color={COLORS.accent} top={500} left={100} w={150} delay={20} />

			<SNode icon="⚙️" label="API Server" color={COLORS.warning} top={350} left={500} w={180} delay={25} />
			
			<SNode icon="🗄️" label="Database" color={COLORS.danger} top={350} left={900} w={180} delay={30} />

			{/* Polling Animation Lines */}
			{loops.map(l => l.active && (
				<React.Fragment key={l.id}>
					<div style={{ position: 'absolute', top: 245, left: 260, width: 230, height: 2, background: COLORS.danger, opacity: 0.5, boxShadow: `0 0 10px ${COLORS.danger}` }} />
					<div style={{ position: 'absolute', top: 395, left: 260, width: 230, height: 2, background: COLORS.danger, opacity: 0.5, boxShadow: `0 0 10px ${COLORS.danger}` }} />
					<div style={{ position: 'absolute', top: 545, left: 260, width: 230, height: 2, background: COLORS.danger, opacity: 0.5, boxShadow: `0 0 10px ${COLORS.danger}` }} />
					<div style={{ position: 'absolute', top: 395, left: 690, width: 200, height: 2, background: COLORS.warning, opacity: 0.8, boxShadow: `0 0 10px ${COLORS.warning}` }} />
				</React.Fragment>
			))}

			{/* Stats Widget */}
			<Appear at={40} x={30}>
				<div style={{ position: 'absolute', top: 200, right: 100, width: 300, background: `rgba(0,0,0,0.8)`, border: `2px solid ${COLORS.danger}`, borderRadius: 16, padding: '20px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
					<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15 }}>
						<div style={{ fontSize: 12, fontWeight: 900, color: COLORS.muted, textTransform: 'uppercase' }}>HTTP Requests</div>
						<div style={{ fontSize: 16, fontWeight: 900, color: COLORS.ink, fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums' }}>{requests.toLocaleString()}</div>
					</div>
					<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15 }}>
						<div style={{ fontSize: 12, fontWeight: 900, color: COLORS.muted, textTransform: 'uppercase' }}>Empty / Wasted</div>
						<div style={{ fontSize: 16, fontWeight: 900, color: COLORS.danger, fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums' }}>{Math.floor(requests * (emptyRate/100)).toLocaleString()}</div>
					</div>
					
					{/* Progress bar of waste */}
					<div style={{ width: '100%', height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
						<div style={{ width: `${emptyRate}%`, height: '100%', background: COLORS.danger }} />
					</div>
					<div style={{ textAlign: 'right', fontSize: 10, color: COLORS.danger, marginTop: 5, fontWeight: 800 }}>{emptyRate}% WASTE</div>
				</div>
			</Appear>

			{/* Warning Banner */}
			{f >= 100 && (
				<Appear at={100} y={20}>
					<div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 30 }}>
						<div style={{ background: `${COLORS.danger}22`, border: `2px solid ${COLORS.danger}`, borderRadius: 20, padding: '16px 48px', fontSize: 18, fontWeight: 900, color: COLORS.danger, fontFamily: 'Inter', boxShadow: `0 0 50px ${COLORS.danger}33`, backdropFilter: 'blur(20px)' }}>
							⚠️ DB Connection pool exhausts under load just from empty polling.
						</div>
					</div>
				</Appear>
			)}
		</Shell>
	);
};
