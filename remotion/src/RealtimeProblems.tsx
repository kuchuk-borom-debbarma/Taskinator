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

const SNode: React.FC<{ icon: string; label: string; sub?: string; color: string; top: number; left: number; w: number; delay: number; glow?: boolean; opacity?: number }> = ({ icon, label, sub, color, top, left, w, delay, glow, opacity = 1 }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const s = SP(f, delay, fps);
	return (
		<div style={{ position: 'absolute', top, left, width: w, opacity: s * opacity, transform: `scale(${s}) translateY(${interpolate(s, [0, 1], [10, 0])}px)`, background: 'rgba(15,23,42,0.95)', border: `2px solid ${color}66`, borderRadius: 20, padding: '18px 20px', textAlign: 'center', boxShadow: glow ? `0 0 40px ${color}22` : '0 15px 40px rgba(0,0,0,0.6)', zIndex: 20 }}>
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

/* ════════════════════════════════════════════════
   SLIDE 0 — Title
════════════════════════════════════════════════ */
export const TitleSlide: React.FC = () => {
	return <TitleCard title="Real-Time Architecture" />;
};

/* ════════════════════════════════════════════════
   SLIDE 1 — Evolution 1: HTTP Polling
════════════════════════════════════════════════ */
export const PollingProblemSlide: React.FC = () => {
	const f = useCurrentFrame();
	const { fps } = useVideoConfig();

	// Counter simulation
	const isPollingActive = f > 30;
	const requests = isPollingActive ? Math.floor(Math.pow((f - 30) / fps * 10, 2)) : 0;
	const emptyRate = 98;

	// Looping arrows
	const loops = Array.from({ length: 15 }).map((_, i) => {
		const startF = 30 + (i * 10);
		const isActive = f >= startF && f < startF + 20;
		return { id: i, active: isActive, startF };
	});

	return (
		<Shell>
			<Appear at={5} y={-20}>
				<div style={{ position: 'absolute', top: 40, left: 50 }}>
					<div style={{ fontSize: 12, fontWeight: 900, color: COLORS.danger, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'Inter', marginBottom: 10 }}>EVOLUTION 1</div>
					<h2 style={{ fontSize: 36, fontWeight: 900, color: COLORS.ink, fontFamily: 'Inter', margin: '0 0 8px' }}>HTTP Polling</h2>
					<p style={{ fontSize: 16, color: COLORS.muted, fontFamily: 'Inter', margin: 0, maxWidth: 800, lineHeight: 1.6 }}>10,000 users asking "Are there updates?" every second. 98% of responses are empty.</p>
				</div>
			</Appear>

			<SNode icon="👥" label="10k Clients" color={COLORS.accent} top={350} left={100} w={150} delay={10} />
			<SNode icon="⚙️" label="API Server" color={COLORS.warning} top={350} left={500} w={180} delay={25} />
			<SNode icon="🗄️" label="PostgreSQL" sub="Max 500 connections" color={COLORS.danger} top={350} left={900} w={180} delay={30} glow />

			{loops.map(l => l.active && (
				<React.Fragment key={l.id}>
					<div style={{ position: 'absolute', top: 395, left: 260, width: 230, height: 2, background: COLORS.danger, opacity: 0.5, boxShadow: `0 0 10px ${COLORS.danger}` }} />
					<div style={{ position: 'absolute', top: 395, left: 690, width: 200, height: 2, background: COLORS.danger, opacity: 0.8, boxShadow: `0 0 10px ${COLORS.danger}` }} />
				</React.Fragment>
			))}

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
					<div style={{ width: '100%', height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
						<div style={{ width: `${emptyRate}%`, height: '100%', background: COLORS.danger }} />
					</div>
					<div style={{ textAlign: 'right', fontSize: 10, color: COLORS.danger, marginTop: 5, fontWeight: 800 }}>{emptyRate}% WASTE</div>
				</div>
			</Appear>

			{f >= 100 && (
				<Appear at={100} y={20}>
					<div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 30 }}>
						<div style={{ background: `${COLORS.danger}22`, border: `2px solid ${COLORS.danger}`, borderRadius: 20, padding: '16px 48px', fontSize: 18, fontWeight: 900, color: COLORS.danger, fontFamily: 'Inter', boxShadow: `0 0 50px ${COLORS.danger}33`, backdropFilter: 'blur(20px)' }}>
							⚠️ Result: Database connection pool crashes under the load.
						</div>
					</div>
				</Appear>
			)}
		</Shell>
	);
};

/* ════════════════════════════════════════════════
   SLIDE 2 — Evolution 2: Simple WebSockets
════════════════════════════════════════════════ */
export const SimpleWebSocketProblemSlide: React.FC = () => {
	const f = useCurrentFrame();

	return (
		<Shell>
			<Appear at={5} y={-20}>
				<div style={{ position: 'absolute', top: 40, left: 50 }}>
					<div style={{ fontSize: 12, fontWeight: 900, color: COLORS.warning, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'Inter', marginBottom: 10 }}>EVOLUTION 2</div>
					<h2 style={{ fontSize: 36, fontWeight: 900, color: COLORS.ink, fontFamily: 'Inter', margin: '0 0 8px' }}>Simple WebSockets</h2>
					<p style={{ fontSize: 16, color: COLORS.muted, fontFamily: 'Inter', margin: 0, maxWidth: 800, lineHeight: 1.6 }}>Solves polling waste, but fails at horizontal scale. Isolation prevents delivery.</p>
				</div>
			</Appear>

			{/* Server 1 & Client A */}
			<SNode icon="⚙️" label="API Server 1" color={COLORS.accent} top={250} left={250} w={180} delay={10} />
			<Arrow x1={430} y1={290} x2={750} y2={290} color={COLORS.accent} delay={20} dashed label="WebSocket Connected" />
			<SNode icon="📱" label="User A" sub="Listening for updates" color={COLORS.accent} top={250} left={750} w={180} delay={15} />

			{/* Server 2 & User B (updater) */}
			<SNode icon="⚙️" label="API Server 2" color={COLORS.warning} top={450} left={250} w={180} delay={30} />
			<Arrow x1={750} y1={490} x2={430} y2={490} color={COLORS.warning} delay={40} label="POST /task/update" />
			<SNode icon="💻" label="User B" sub="Makes an update" color={COLORS.warning} top={450} left={750} w={180} delay={35} glow />

			{/* The Wall */}
			{f >= 55 && (
				<Appear at={55}>
					<div style={{ position: 'absolute', top: 350, left: 200, width: 280, height: 80, borderTop: `4px dashed ${COLORS.danger}`, borderBottom: `4px dashed ${COLORS.danger}`, opacity: 0.8, display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10 }}>
						<span style={{ background: COLORS.danger, color: '#fff', padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 'bold' }}>ISOLATION BARRIER</span>
					</div>
				</Appear>
			)}

			{f >= 80 && (
				<Appear at={80} y={20}>
					<div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 30 }}>
						<div style={{ background: `${COLORS.warning}22`, border: `2px solid ${COLORS.warning}`, borderRadius: 20, padding: '16px 48px', fontSize: 18, fontWeight: 900, color: COLORS.warning, fontFamily: 'Inter', boxShadow: `0 0 50px ${COLORS.warning}33`, backdropFilter: 'blur(20px)' }}>
							⚠️ Result: User A never receives User B's update because they are on different servers.
						</div>
					</div>
				</Appear>
			)}
		</Shell>
	);
};

/* ════════════════════════════════════════════════
   SLIDE 3 — Evolution 3: WebSockets + Kafka Broadcast
════════════════════════════════════════════════ */
export const NaiveKafkaBroadcastSlide: React.FC = () => {
	const f = useCurrentFrame();

	return (
		<Shell>
			<Appear at={5} y={-20}>
				<div style={{ position: 'absolute', top: 40, left: 50 }}>
					<div style={{ fontSize: 12, fontWeight: 900, color: COLORS.danger, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'Inter', marginBottom: 10 }}>EVOLUTION 3</div>
					<h2 style={{ fontSize: 36, fontWeight: 900, color: COLORS.ink, fontFamily: 'Inter', margin: '0 0 8px' }}>WebSockets + Kafka Broadcast</h2>
					<p style={{ fontSize: 16, color: COLORS.muted, fontFamily: 'Inter', margin: 0, maxWidth: 800, lineHeight: 1.6 }}>Kafka bridges the gap, but broadcasting to all 50 servers wastes massive CPU.</p>
				</div>
			</Appear>

			{/* Source */}
			<SNode icon="📨" label="Kafka Topic" sub="Broadcasts to all" color={COLORS.warning} top={350} left={100} w={150} delay={10} glow />

			{/* API Instances */}
			<SNode icon="⚙️" label="API Server 1" color={COLORS.danger} top={200} left={400} w={180} delay={15} />
			<Arrow x1={250} y1={360} x2={400} y2={230} color={COLORS.danger} delay={20} />
			{f >= 25 && <div style={{ position: 'absolute', top: 220, left: 600, fontSize: 14, color: COLORS.danger, fontFamily: 'monospace' }}>❌ Not connected. Dropped.</div>}

			<SNode icon="⚙️" label="API Server 2" color={COLORS.danger} top={300} left={400} w={180} delay={17} />
			<Arrow x1={250} y1={380} x2={400} y2={330} color={COLORS.danger} delay={22} />
			{f >= 27 && <div style={{ position: 'absolute', top: 320, left: 600, fontSize: 14, color: COLORS.danger, fontFamily: 'monospace' }}>❌ Not connected. Dropped.</div>}

			<SNode icon="⚙️" label="API Server 3" color={COLORS.danger} top={400} left={400} w={180} delay={19} />
			<Arrow x1={250} y1={400} x2={400} y2={430} color={COLORS.danger} delay={24} />
			{f >= 29 && <div style={{ position: 'absolute', top: 420, left: 600, fontSize: 14, color: COLORS.danger, fontFamily: 'monospace' }}>❌ Not connected. Dropped.</div>}

			{/* The one successful instance */}
			<SNode icon="⚙️" label="API Server 50" color={COLORS.success} top={500} left={400} w={180} delay={21} glow />
			<Arrow x1={250} y1={420} x2={400} y2={530} color={COLORS.success} delay={26} />
			{f >= 31 && <div style={{ position: 'absolute', top: 520, left: 600, fontSize: 14, color: COLORS.success, fontFamily: 'monospace' }}>✅ Found. Pushed to client.</div>}

			{/* Target Client */}
			<SNode icon="📱" label="User A" color={COLORS.success} top={500} left={900} w={150} delay={40} />
			<Arrow x1={580} y1={530} x2={900} y2={530} color={COLORS.success} delay={45} dashed />

			{/* Warning Banner */}
			{f >= 70 && (
				<Appear at={70} y={20}>
					<div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 30 }}>
						<div style={{ background: `${COLORS.danger}22`, border: `2px solid ${COLORS.danger}`, borderRadius: 20, padding: '16px 48px', fontSize: 18, fontWeight: 900, color: COLORS.danger, fontFamily: 'Inter', boxShadow: `0 0 50px ${COLORS.danger}33`, backdropFilter: 'blur(20px)' }}>
							⚠️ Result: 49 servers waste CPU iterating WebSocket lists for an event not meant for them.
						</div>
					</div>
				</Appear>
			)}
		</Shell>
	);
};
