import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { COLORS, GRADIENTS } from './components/Nodes';

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

const Arrow: React.FC<{ x1: number; y1: number; x2: number; y2: number; color: string; label?: string; delay: number; dashed?: boolean; labelOffset?: number; labelPos?: number }> = ({ x1, y1, x2, y2, color, label, delay, dashed, labelOffset = 0, labelPos = 0.5 }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const p = spring({ frame: f - delay, fps, config: { damping: 20, stiffness: 70 } });
	const id = `arrow_${x1}_${y1}_${delay}`;
	const midX = x1 + (x2 - x1) * p;
	const midY = y1 + (y2 - y1) * p;
	
	const lx = x1 + (x2 - x1) * labelPos;
	const ly = y1 + (y2 - y1) * labelPos;
	const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;

	return (
		<>
			<svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none', zIndex: 10 }}>
				<defs>
					<marker id={id} markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
						<path d="M 0 0 L 8 4 L 0 8 z" fill={color} />
					</marker>
				</defs>
				<line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={1} opacity={0.1} strokeDasharray="4 4" />
				<line x1={x1} y1={y1} x2={midX} y2={midY} stroke={color} strokeWidth={3} strokeLinecap="round" markerEnd={p > 0.95 ? `url(#${id})` : undefined} strokeDasharray={dashed ? '10 5' : undefined} style={{ filter: `drop-shadow(0 0 5px ${color}66)` }} />
			</svg>
			{label && (
				<div style={{ 
					position: 'absolute', 
					left: lx, 
					top: ly + labelOffset, 
					opacity: p, 
					transform: `translate(-50%, -50%) rotate(${angle}deg)`, 
					transformOrigin: 'center',
					zIndex: 25 
				}}>
					<div style={{ transform: `rotate(${-angle}deg)`, background: 'rgba(15,23,42,0.95)', border: `1.5px solid ${color}55`, borderRadius: 8, padding: '4px 12px', fontSize: 11, fontWeight: 800, color, fontFamily: 'monospace', whiteSpace: 'nowrap', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}>
						{label}
					</div>
				</div>
			)}
		</>
	);
};

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
   SLIDE 1 — Solution Intro
════════════════════════════════════════════════ */
export const SolutionIntroSlide: React.FC = () => {
	return (
		<Shell>
			<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '0 40px' }}>
				<Appear at={5}>
					<div style={{ fontSize: 48, color: COLORS.accent, marginBottom: 20 }}>✦</div>
				</Appear>
				
				<Appear at={12}>
					<h2 style={{ fontSize: 38, fontWeight: 900, color: COLORS.ink, fontFamily: 'Inter', margin: '0 0 16px', letterSpacing: '-1px' }}>Two-Phase Aggregation</h2>
				</Appear>
				
				<Appear at={20}>
					<p style={{ fontSize: 16, color: COLORS.muted, fontFamily: 'Inter', margin: '0 0 40px', maxWidth: 600, textAlign: 'center', lineHeight: 1.6 }}>
						Group and batch events to drastically reduce database operations
					</p>
				</Appear>
				
				<div style={{ display: 'flex', gap: 30, width: '100%', maxWidth: 900 }}>
					<Appear at={30} y={30} style={{ flex: 1 }}>
						<div style={{ background: 'rgba(15,23,42,0.8)', border: `2px solid ${COLORS.warning}66`, borderRadius: 20, padding: 30, height: '100%', boxShadow: `0 20px 40px ${COLORS.warning}22` }}>
							<div style={{ fontSize: 18, fontWeight: 900, color: COLORS.warning, fontFamily: 'Inter', marginBottom: 12 }}>Phase 1 — Smart Aggregator</div>
							<div style={{ fontSize: 14, color: COLORS.muted, fontFamily: 'Inter', lineHeight: 1.6 }}>Groups and batches events together to minimize the final number of DB calls</div>
						</div>
					</Appear>
					
					<Appear at={30} y={30} style={{ flex: 1 }}>
						<div style={{ background: 'rgba(15,23,42,0.8)', border: `2px solid ${COLORS.accent3}66`, borderRadius: 20, padding: 30, height: '100%', boxShadow: `0 20px 40px ${COLORS.accent3}22` }}>
							<div style={{ fontSize: 18, fontWeight: 900, color: COLORS.accent3, fontFamily: 'Inter', marginBottom: 12 }}>Phase 2 — Listeners</div>
							<div style={{ fontSize: 14, color: COLORS.muted, fontFamily: 'Inter', lineHeight: 1.6 }}>Each listener reads one aggregated signal, performs one targeted DB write</div>
						</div>
					</Appear>
				</div>
				
				<Appear at={55}>
					<div style={{ marginTop: 50, background: `${COLORS.accent}22`, border: `1px solid ${COLORS.accent}`, borderRadius: 30, padding: '12px 24px', fontSize: 14, fontWeight: 800, color: COLORS.accent, fontFamily: 'Inter', boxShadow: `0 0 20px ${COLORS.accent}44` }}>
						Result: massive reduction in DB load (batching) + bonus of resolving race conditions
					</div>
				</Appear>
			</div>
		</Shell>
	);
};

/* ════════════════════════════════════════════════
   SLIDE 2 — Two-Phase Pipeline
════════════════════════════════════════════════ */
export const TwoPhasePipelineSlide: React.FC = () => {
	// f unused


	return (
		<Shell>
			{/* Phase Background Chips */}
			<Appear at={5} y={0}>
				<div style={{ position: 'absolute', top: 70, left: 30, background: `${COLORS.warning}15`, border: `1px solid ${COLORS.warning}55`, borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 900, color: COLORS.warning, fontFamily: 'Inter', letterSpacing: 2 }}>PHASE 1</div>
			</Appear>
			
			<Appear at={35} y={0}>
				<div style={{ position: 'absolute', top: 70, left: 790, background: `${COLORS.accent3}15`, border: `1px solid ${COLORS.accent3}55`, borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 900, color: COLORS.accent3, fontFamily: 'Inter', letterSpacing: 2 }}>PHASE 2</div>
			</Appear>

			{/* Vertical Divider */}
			<svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
				<line x1={760} y1={60} x2={760} y2={580} stroke="rgba(255,255,255,0.06)" strokeWidth={2} strokeDasharray="4 4" />
			</svg>

			{/* Row 1 — Raw events */}
			<SNode icon="📨" label="DOMAIN_EVENTS" color={COLORS.warning} top={120} left={30} w={170} delay={5} />

			{/* Arrow 1 */}
			<Arrow x1={200} y1={170} x2={260} y2={280} color={COLORS.warning} delay={20} label="raw events (batch)" labelPos={0.4} labelOffset={-20} />

			{/* Row 2 — Aggregator */}
			<SNode icon="⚙️" label="BatchAggregator" sub="consumer-group: project-aggregator" color={COLORS.accent} top={270} left={260} w={200} delay={15} glow />

			{/* Label FOR UPDATE SKIP LOCKED */}
			<Appear at={18} y={10}>
				<div style={{ position: 'absolute', top: 210, left: 290, fontSize: 9, color: COLORS.muted, fontFamily: 'monospace', fontWeight: 800, textAlign: 'center', lineHeight: 1.4, background: 'rgba(15,23,42,0.8)', padding: '4px 8px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)' }}>
					FOR UPDATE<br/>SKIP LOCKED
				</div>
			</Appear>

			{/* Arrow 2 */}
			<Arrow x1={360} y1={270} x2={520} y2={170} color={COLORS.accent} delay={32} label="1 aggregated signal" labelPos={0.6} labelOffset={-20} />

			{/* Row 3 — Aggregated Topic */}
			<SNode icon="📨" label="PROJECT_AGGREGATED" color={COLORS.accent} top={120} left={520} w={210} delay={28} />

			{/* Arrows 3, 4, 5 */}
			<Arrow x1={730} y1={170} x2={790} y2={210} color={COLORS.accent} delay={40} />
			<Arrow x1={730} y1={170} x2={790} y2={320} color={COLORS.accent} delay={45} />
			<Arrow x1={730} y1={170} x2={790} y2={430} color={COLORS.accent} delay={50} />

			{/* Row 4 — Execution Listeners */}
			<SNode icon="✓" label="ChangeProjectMemberCount" color={COLORS.accent3} top={160} left={790} w={240} delay={38} />
			<SNode icon="✓" label="DeleteProjectTask"        color={COLORS.accent2} top={270} left={790} w={240} delay={43} />
			<SNode icon="✓" label="UpdateUserProjectCount"   color={COLORS.accent}  top={380} left={790} w={240} delay={48} />

			{/* Arrows 6, 7, 8 */}
			<Arrow x1={1030} y1={210} x2={1090} y2={300} color={COLORS.accent3} delay={58} />
			<Arrow x1={1030} y1={320} x2={1090} y2={320} color={COLORS.accent3} delay={63} />
			<Arrow x1={1030} y1={430} x2={1090} y2={340} color={COLORS.accent3} delay={68} />

			{/* Row 5 — DB */}
			<SNode icon="🗄️" label="PostgreSQL" color={COLORS.accent3} top={270} left={1090} w={155} delay={55} />
		</Shell>
	);
};
