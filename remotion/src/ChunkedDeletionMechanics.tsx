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
   SLIDE 1 — CTE Chunk Transaction
════════════════════════════════════════════════ */
export const ChunkTransactionSlide: React.FC = () => {
	return (
		<Shell>
			<Appear at={5} y={-20}>
				<div style={{ position: 'absolute', top: 40, left: 50 }}>
					<div style={{ fontSize: 12, fontWeight: 900, color: COLORS.accent, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'Inter', marginBottom: 10 }}>THE MECHANICS</div>
					<h2 style={{ fontSize: 36, fontWeight: 900, color: COLORS.ink, fontFamily: 'monospace', margin: '0 0 8px' }}>Common Table Expressions (CTE)</h2>
					<p style={{ fontSize: 16, color: COLORS.muted, fontFamily: 'Inter', margin: 0, maxWidth: 800, lineHeight: 1.6 }}>One atomic statement handles both deletion and self-signaling.</p>
				</div>
			</Appear>

			{/* SQL Block */}
			<Appear at={15} x={0}>
				<div style={{ position: 'absolute', top: 150, left: 50, right: 400, background: 'rgba(10,15,30,0.9)', border: `2px solid ${COLORS.accent}66`, borderRadius: 16, padding: '30px', boxShadow: `0 20px 50px rgba(0,0,0,0.6)` }}>
					<div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
						<div style={{ width: 12, height: 12, borderRadius: '50%', background: COLORS.danger }} />
						<div style={{ width: 12, height: 12, borderRadius: '50%', background: COLORS.warning }} />
						<div style={{ width: 12, height: 12, borderRadius: '50%', background: COLORS.success }} />
					</div>
					<div style={{ fontFamily: 'monospace', fontSize: 18, lineHeight: 1.8 }}>
						<Appear at={20}><div style={{ color: COLORS.accent }}>WITH <span style={{ color: COLORS.ink }}>deleted</span> AS (</div></Appear>
						<Appear at={25}><div style={{ paddingLeft: 40, color: COLORS.danger }}>DELETE FROM <span style={{ color: COLORS.ink }}>tasks</span></div></Appear>
						<Appear at={25}><div style={{ paddingLeft: 40, color: COLORS.ink }}>WHERE project_id = 'P1'</div></Appear>
						<Appear at={25}><div style={{ paddingLeft: 40, color: COLORS.warning, fontWeight: 900 }}>LIMIT 500</div></Appear>
						<Appear at={25}><div style={{ paddingLeft: 40, color: COLORS.accent }}>RETURNING id</div></Appear>
						<Appear at={20}><div style={{ color: COLORS.accent }}>),</div></Appear>
						
						<Appear at={40}><div style={{ color: COLORS.accent2, marginTop: 10 }}>re_signal <span style={{ color: COLORS.accent }}>AS (</span></div></Appear>
						<Appear at={45}><div style={{ paddingLeft: 40, color: COLORS.success }}>INSERT INTO <span style={{ color: COLORS.ink }}>outbox_events (type, payload)</span></div></Appear>
						<Appear at={45}><div style={{ paddingLeft: 40, color: COLORS.ink }}>SELECT 'PROJECT_DELETED', '&#123;"id":"P1"&#125;'</div></Appear>
						<Appear at={50}><div style={{ paddingLeft: 40, color: COLORS.warning, background: `${COLORS.warning}22`, display: 'inline-block', borderRadius: 4 }}>WHERE (SELECT count(*) FROM deleted) = 500</div></Appear>
						<Appear at={40}><div style={{ color: COLORS.accent }}>)</div></Appear>
						
						<Appear at={65}><div style={{ color: COLORS.accent3, marginTop: 10 }}>SELECT <span style={{ color: COLORS.ink }}>count(*) FROM deleted;</span></div></Appear>
					</div>
				</div>
			</Appear>

			{/* Explanations on the right */}
			<div style={{ position: 'absolute', top: 150, left: 880, width: 340 }}>
				<Appear at={35}>
					<div style={{ background: `${COLORS.danger}15`, borderLeft: `4px solid ${COLORS.danger}`, padding: 16, borderRadius: 8, marginBottom: 20 }}>
						<div style={{ fontSize: 14, fontWeight: 900, color: COLORS.danger, fontFamily: 'Inter', marginBottom: 8 }}>1. The Chunk</div>
						<div style={{ fontSize: 12, color: COLORS.muted, fontFamily: 'Inter', lineHeight: 1.5 }}>Deletes up to 500 rows and returns their IDs into the CTE temporary table.</div>
					</div>
				</Appear>

				<Appear at={55}>
					<div style={{ background: `${COLORS.success}15`, borderLeft: `4px solid ${COLORS.success}`, padding: 16, borderRadius: 8, marginBottom: 20 }}>
						<div style={{ fontSize: 14, fontWeight: 900, color: COLORS.success, fontFamily: 'Inter', marginBottom: 8 }}>2. The Signal</div>
						<div style={{ fontSize: 12, color: COLORS.muted, fontFamily: 'Inter', lineHeight: 1.5 }}>If we hit the limit of 500, it means there are probably more rows. Insert the outbox event to trigger the next loop.</div>
					</div>
				</Appear>
				
				<Appear at={70}>
					<div style={{ background: `${COLORS.accent3}15`, borderLeft: `4px solid ${COLORS.accent3}`, padding: 16, borderRadius: 8 }}>
						<div style={{ fontSize: 14, fontWeight: 900, color: COLORS.accent3, fontFamily: 'Inter', marginBottom: 8 }}>3. Termination</div>
						<div style={{ fontSize: 12, color: COLORS.muted, fontFamily: 'Inter', lineHeight: 1.5 }}>If count &lt; 500, the INSERT condition fails. No signal is published. The loop gracefully ends.</div>
					</div>
				</Appear>
			</div>
		</Shell>
	);
};

/* ════════════════════════════════════════════════
   SLIDE 2 — Tuning and Idempotency
════════════════════════════════════════════════ */
export const TuningAndIdempotencySlide: React.FC = () => {
	return (
		<Shell>
			<Appear at={5} y={-20}>
				<div style={{ position: 'absolute', top: 40, left: 50 }}>
					<div style={{ fontSize: 12, fontWeight: 900, color: COLORS.accent2, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'Inter', marginBottom: 10 }}>DESIGN CONSIDERATIONS</div>
					<h2 style={{ fontSize: 36, fontWeight: 900, color: COLORS.ink, fontFamily: 'Inter', margin: '0 0 8px' }}>Tuning & Idempotency</h2>
				</div>
			</Appear>

			<div style={{ display: 'flex', gap: 40, marginTop: 140, padding: '0 50px' }}>
				{/* Tuning Panel */}
				<Appear at={15} y={30} style={{ flex: 1 }}>
					<div style={{ background: 'rgba(15,23,42,0.8)', border: `2px solid ${COLORS.warning}66`, borderRadius: 20, padding: 40, height: 380, boxShadow: `0 20px 40px ${COLORS.warning}22`, display: 'flex', flexDirection: 'column' }}>
						<div style={{ fontSize: 22, fontWeight: 900, color: COLORS.warning, fontFamily: 'Inter', marginBottom: 20 }}>Chunk Size Tuning</div>
						
						<div style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1, justifyContent: 'center' }}>
							<div style={{ background: 'rgba(0,0,0,0.3)', padding: 16, borderRadius: 12, borderLeft: `4px solid ${COLORS.danger}` }}>
								<div style={{ fontSize: 14, fontWeight: 800, color: COLORS.danger, marginBottom: 4 }}>Too Small (e.g. 10)</div>
								<div style={{ fontSize: 13, color: COLORS.muted }}>Excessive network and transaction overhead. Slow deletion.</div>
							</div>
							
							<div style={{ background: 'rgba(0,0,0,0.3)', padding: 16, borderRadius: 12, borderLeft: `4px solid ${COLORS.danger}` }}>
								<div style={{ fontSize: 14, fontWeight: 800, color: COLORS.danger, marginBottom: 4 }}>Too Large (e.g. 50,000)</div>
								<div style={{ fontSize: 13, color: COLORS.muted }}>Transaction takes too long, triggering lock contention again.</div>
							</div>
							
							<div style={{ background: `${COLORS.success}15`, padding: 16, borderRadius: 12, borderLeft: `4px solid ${COLORS.success}` }}>
								<div style={{ fontSize: 14, fontWeight: 800, color: COLORS.success, marginBottom: 4 }}>Sweet Spot (500 - 5000)</div>
								<div style={{ fontSize: 13, color: COLORS.muted }}>Locks held &lt; 50ms. Invisible to users.</div>
							</div>
						</div>
					</div>
				</Appear>

				{/* Idempotency Panel */}
				<Appear at={30} y={30} style={{ flex: 1 }}>
					<div style={{ background: 'rgba(15,23,42,0.8)', border: `2px solid ${COLORS.success}66`, borderRadius: 20, padding: 40, height: 380, boxShadow: `0 20px 40px ${COLORS.success}22`, display: 'flex', flexDirection: 'column' }}>
						<div style={{ fontSize: 22, fontWeight: 900, color: COLORS.success, fontFamily: 'Inter', marginBottom: 20 }}>Idempotency Guarantees</div>
						
						<div style={{ display: 'flex', flexDirection: 'column', gap: 24, flex: 1, justifyContent: 'center' }}>
							<div style={{ display: 'flex', gap: 16 }}>
								<div style={{ fontSize: 28 }}>💥</div>
								<div>
									<div style={{ fontSize: 15, fontWeight: 800, color: COLORS.ink, marginBottom: 4 }}>Crash before commit?</div>
									<div style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.5 }}>The chunk deletion and the outbox insertion are both rolled back. The event is retried from Kafka.</div>
								</div>
							</div>
							
							<div style={{ display: 'flex', gap: 16 }}>
								<div style={{ fontSize: 28 }}>🔁</div>
								<div>
									<div style={{ fontSize: 15, fontWeight: 800, color: COLORS.ink, marginBottom: 4 }}>Kafka delivers event twice?</div>
									<div style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.5 }}><code>DELETE FROM tasks WHERE ... LIMIT 500</code> is inherently safe to run multiple times.</div>
								</div>
							</div>
						</div>
					</div>
				</Appear>
			</div>
		</Shell>
	);
};
