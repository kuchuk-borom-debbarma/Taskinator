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

const Appear: React.FC<{ at: number; children: React.ReactNode; y?: number; x?: number }> = ({ at, children, y = 18, x = 0 }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const s = SP(f, at, fps);
	return (
		<div style={{ opacity: s, transform: `translate(${interpolate(s, [0, 1], [x, 0])}px, ${interpolate(s, [0, 1], [y, 0])}px)` }}>
			{children}
		</div>
	);
};

/* ════════════════════════════════════════════════
   SLIDE 1 — Naive Explosion
════════════════════════════════════════════════ */
export const NaiveExplosionSlide: React.FC = () => {
	const f = useCurrentFrame();

	return (
		<Shell>
			<Appear at={5} y={-20}>
				<div style={{ position: 'absolute', top: 40, left: 50 }}>
					<div style={{ fontSize: 12, fontWeight: 900, color: COLORS.danger, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'Inter', marginBottom: 10 }}>❌ WITHOUT AGGREGATION</div>
					<h2 style={{ fontSize: 36, fontWeight: 900, color: COLORS.ink, fontFamily: 'Inter', margin: '0 0 8px' }}>Naive Event Cascade</h2>
					<p style={{ fontSize: 16, color: COLORS.muted, fontFamily: 'Inter', margin: 0, maxWidth: 800, lineHeight: 1.6 }}>One deletion produces 5 independent writes racing each other.</p>
				</div>
			</Appear>

			{/* Beat 1: Central Event */}
			<SNode icon="💥" label="DELETE project-abc" color={COLORS.danger} top={320} left={240} w={200} delay={5} glow />

			{/* Beat 2: 5 Listeners (Simultaneous) */}
			<SNode icon="🎧" label="ChangeProjectMemberCount" color={COLORS.warning} top={100} left={800} w={250} delay={15} />
			<SNode icon="🎧" label="DeleteProjectTask"        color={COLORS.warning} top={200} left={860} w={250} delay={15} />
			<SNode icon="🎧" label="PurgeTeamMemberships"     color={COLORS.warning} top={300} left={880} w={250} delay={15} />
			<SNode icon="🎧" label="SyncTeamTaskCount"        color={COLORS.warning} top={400} left={860} w={250} delay={15} />
			<SNode icon="🎧" label="UpdateUserProjectCount"   color={COLORS.warning} top={500} left={800} w={250} delay={15} />

			{/* Beat 3: Arrows from event -> listeners (all same time) */}
			<Arrow x1={440} y1={350} x2={800} y2={140} color={COLORS.danger} delay={20} />
			<Arrow x1={440} y1={360} x2={860} y2={240} color={COLORS.danger} delay={20} />
			<Arrow x1={440} y1={370} x2={880} y2={340} color={COLORS.danger} delay={20} />
			<Arrow x1={440} y1={380} x2={860} y2={440} color={COLORS.danger} delay={20} />
			<Arrow x1={440} y1={390} x2={800} y2={540} color={COLORS.danger} delay={20} />

			{/* Beat 4: Race Condition Badges */}
			{f >= 35 && (
				<>
					<Appear at={35}>
						<div style={{ position: 'absolute', top: 250, left: 780, background: COLORS.danger, color: 'white', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 900, boxShadow: '0 4px 12px rgba(255,0,0,0.5)', zIndex: 30 }}>
							⚠ RACE: Listener C reads tasks_count = 5 (stale)
						</div>
					</Appear>
					<Appear at={40}>
						<div style={{ position: 'absolute', top: 350, left: 780, background: COLORS.danger, color: 'white', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 900, boxShadow: '0 4px 12px rgba(255,0,0,0.5)', zIndex: 30 }}>
							⚠ RACE: Listener A reads same stale value
						</div>
					</Appear>
					<Appear at={45}>
						<div style={{ position: 'absolute', top: 450, left: 780, background: COLORS.danger, color: 'white', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 900, boxShadow: '0 4px 12px rgba(255,0,0,0.5)', zIndex: 30 }}>
							⚠ RACE: Both write 4 → count wrong
						</div>
					</Appear>
				</>
			)}

			{/* Beat 5: Bottom Warning */}
			{f >= 55 && (
				<Appear at={55} y={20}>
					<div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 30 }}>
						<div style={{ background: `rgba(0,0,0,0.8)`, border: `1px solid ${COLORS.danger}55`, borderLeft: `4px solid ${COLORS.danger}`, borderRadius: 12, padding: '16px 24px', fontSize: 14, color: COLORS.ink, fontFamily: 'Inter', boxShadow: `0 10px 30px rgba(0,0,0,0.5)` }}>
							Each listener has no awareness of the others. The results depend entirely on network timing.
						</div>
					</div>
				</Appear>
			)}
		</Shell>
	);
};

/* ════════════════════════════════════════════════
   SLIDE 2 — Aggregated Deletion
════════════════════════════════════════════════ */
export const AggregatedDeletionSlide: React.FC = () => {
	const f = useCurrentFrame();

	return (
		<Shell>
			<Appear at={5} y={-20}>
				<div style={{ position: 'absolute', top: 40, left: 50 }}>
					<div style={{ fontSize: 12, fontWeight: 900, color: COLORS.success, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'Inter', marginBottom: 10 }}>✅ WITH AGGREGATION</div>
					<h2 style={{ fontSize: 36, fontWeight: 900, color: COLORS.ink, fontFamily: 'Inter', margin: '0 0 8px' }}>Ordered Cascade</h2>
					<p style={{ fontSize: 16, color: COLORS.muted, fontFamily: 'Inter', margin: 0, maxWidth: 800, lineHeight: 1.6 }}>Single consolidated signal orchestrates perfect order.</p>
				</div>
			</Appear>

			{/* Beat 1 */}
			<SNode icon="📨" label="DOMAIN_EVENTS" color={COLORS.warning} top={120} left={30} w={170} delay={5} />

			{/* Beat 2 */}
			<SNode icon="⚙️" label="BatchAggregator" sub="batches 3 events in 50ms window" color={COLORS.accent} top={260} left={240} w={190} delay={12} glow />

			{/* Beat 3 */}
			<Arrow x1={200} y1={170} x2={240} y2={280} color={COLORS.warning} delay={20} label="3 raw events" labelPos={0.4} labelOffset={-20} />

			{/* Beat 4: Code snippet */}
			<Appear at={30} y={10}>
				<div style={{ position: 'absolute', top: 380, left: 200, width: 250, background: 'rgba(10,15,30,0.9)', border: `2px solid ${COLORS.accent}66`, borderRadius: 12, padding: '16px', boxShadow: `0 10px 30px rgba(0,0,0,0.5)`, zIndex: 25 }}>
					<div style={{ fontSize: 10, color: COLORS.muted, fontFamily: 'monospace', marginBottom: 8 }}>consolidatedState = {'{'}</div>
					<div style={{ fontSize: 12, color: COLORS.accent, fontFamily: 'monospace', paddingLeft: 12 }}>membersToRemove: 3,</div>
					<div style={{ fontSize: 12, color: COLORS.accent, fontFamily: 'monospace', paddingLeft: 12 }}>tasksToDelete: 47,</div>
					<div style={{ fontSize: 12, color: COLORS.accent, fontFamily: 'monospace', paddingLeft: 12 }}>teamsToUnlink: 2</div>
					<div style={{ fontSize: 10, color: COLORS.muted, fontFamily: 'monospace', marginTop: 8 }}>{'}'}</div>
				</div>
			</Appear>

			{/* Beat 5 */}
			<SNode icon="📨" label="PROJECT_AGGREGATED" color={COLORS.accent} top={120} left={500} w={210} delay={40} />

			{/* Beat 6 */}
			<Arrow x1={335} y1={260} x2={500} y2={160} color={COLORS.accent} delay={48} label="1 signal" labelPos={0.6} labelOffset={-20} />

			{/* Beat 7: Staggered listeners */}
			<SNode icon="✓" label="ChangeProjectMemberCount" color={COLORS.accent3} top={140} left={780} w={260} delay={56} />
			<SNode icon="✓" label="DeleteProjectTask"        color={COLORS.accent3} top={260} left={780} w={260} delay={64} />
			<SNode icon="✓" label="UpdateUserProjectCount"   color={COLORS.accent3} top={380} left={780} w={260} delay={72} />

			{/* Beat 8: Staggered arrows */}
			<Arrow x1={710} y1={160} x2={780} y2={180} color={COLORS.accent} delay={65} />
			<Arrow x1={710} y1={160} x2={780} y2={300} color={COLORS.accent} delay={73} />
			<Arrow x1={710} y1={160} x2={780} y2={420} color={COLORS.accent} delay={81} />

			{/* Beat 9 */}
			<SNode icon="🗄️" label="PostgreSQL" color={COLORS.accent3} top={260} left={1060} w={155} delay={85} />

			{/* Beat 10: Staggered arrows to DB */}
			<Arrow x1={1040} y1={180} x2={1060} y2={280} color={COLORS.accent3} delay={88} />
			<Arrow x1={1040} y1={300} x2={1060} y2={300} color={COLORS.accent3} delay={93} />
			<Arrow x1={1040} y1={420} x2={1060} y2={320} color={COLORS.accent3} delay={98} />

			{/* Beat 11: Green Banner */}
			{f >= 105 && (
				<Appear at={105} y={20}>
					<div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 30 }}>
						<div style={{ background: `${COLORS.success}22`, border: `2px solid ${COLORS.success}`, borderRadius: 12, padding: '16px 32px', fontSize: 16, fontWeight: 900, color: COLORS.success, fontFamily: 'Inter', boxShadow: `0 0 40px ${COLORS.success}33`, backdropFilter: 'blur(10px)' }}>
							All 3 side-effects applied in order · Zero race conditions
						</div>
					</div>
				</Appear>
			)}
		</Shell>
	);
};
