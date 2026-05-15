import React from 'react';
import { AbsoluteFill, Sequence, useVideoConfig, useCurrentFrame, spring, interpolate, Easing } from 'remotion';
import { COLORS, GRADIENTS } from './components/Nodes';
import { TitleCard } from './components/TitleCard';

const F  = (s: number) => 30 * s;
const SP = (f: number, d: number, fps: number, damp = 16) => spring({ frame: f - d, fps, config: { damping: damp, stiffness: 100 } });

/* ── Shell Layout Container ── */
const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
	<AbsoluteFill style={{ background: GRADIENTS.bg }}>
		<AbsoluteFill style={{ padding: 24 }}>
			<div style={{ 
				flex: 1, position: 'relative', overflow: 'hidden',
				background: 'rgba(15, 23, 42, 0.3)', backdropFilter: 'blur(50px)',
				borderRadius: 24, border: '1.5px solid rgba(255, 255, 255, 0.08)',
				boxShadow: '0 40px 100px rgba(0, 0, 0, 0.65)' 
			}}>
				{children}
			</div>
		</AbsoluteFill>
	</AbsoluteFill>
);

/* ── Dotted Grid XYFlow Canvas ── */
const CanvasGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
	<div style={{
		position: 'absolute', top: 140, left: 40, width: 580, height: 520,
		background: '#0f172a', borderRadius: 20, border: '1.5px solid rgba(255,255,255,0.06)',
		backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px)',
		backgroundSize: '24px 24px', overflow: 'hidden', boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5)'
	}}>
		<div style={{ position: 'absolute', top: 16, left: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
			<div style={{ width: 8, height: 8, borderRadius: 4, background: COLORS.accent }} />
			<span style={{ fontSize: 10, fontWeight: 800, color: COLORS.muted, letterSpacing: 1.5 }}>XYFLOW CANVAS v2.0</span>
		</div>
		{children}
	</div>
);

/* ── JSON Syntax Terminal ── */
const CodeTerminal: React.FC<{ children: React.ReactNode }> = ({ children }) => (
	<div style={{
		position: 'absolute', top: 140, left: 660, width: 580, height: 520,
		background: '#090d16', borderRadius: 20, border: '1.5px solid rgba(255,255,255,0.06)',
		boxShadow: '0 20px 60px rgba(0,0,0,0.7)', overflow: 'hidden'
	}}>
		{/* Tab Bar */}
		<div style={{
			height: 44, background: '#0f172a', borderBottom: '1.5px solid rgba(255,255,255,0.06)',
			display: 'flex', alignItems: 'center', gap: 16, paddingLeft: 20
		}}>
			<div style={{ display: 'flex', gap: 6 }}>
				<div style={{ width: 10, height: 10, borderRadius: 5, background: '#ef4444' }} />
				<div style={{ width: 10, height: 10, borderRadius: 5, background: '#f59e0b' }} />
				<div style={{ width: 10, height: 10, borderRadius: 5, background: '#22c55e' }} />
			</div>
			<div style={{
				fontSize: 11, fontWeight: 700, color: COLORS.ink, background: '#090d16',
				padding: '6px 14px', borderRadius: '8px 8px 0 0', height: '100%',
				display: 'flex', alignItems: 'center', marginTop: 12, border: '1.5px solid rgba(255,255,255,0.06)',
				borderBottom: 'none', fontFamily: 'monospace'
			}}>
				📄 rule_payload.json
			</div>
		</div>
		<div style={{ padding: 24, fontFamily: 'monospace', fontSize: 13, lineHeight: 1.8, color: '#cbd5e1' }}>
			{children}
		</div>
	</div>
);

/* ── Flow Node ── */
const FlowNode: React.FC<{ label: string; sub: string; color: string; top: number; left: number; delay: number }> = ({ label, sub, color, top, left, delay }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const s = SP(f, delay, fps);
	return (
		<div style={{
			position: 'absolute', top, left, width: 220, transform: `translate(-50%, -50%) scale(${s})`, opacity: s,
			background: 'rgba(30, 41, 59, 0.9)', border: `2.5px solid ${color}aa`,
			borderRadius: 12, padding: 16, zIndex: 10,
			boxShadow: `0 10px 30px rgba(0,0,0,0.4), inset 0 0 12px ${color}15`
		}}>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
				<span style={{ fontSize: 9, fontWeight: 900, color, letterSpacing: 1 }}>TRIGGER NODE</span>
				<div style={{ width: 10, height: 10, borderRadius: 5, background: color, boxShadow: `0 0 10px ${color}` }} />
			</div>
			<div style={{ fontSize: 14, fontWeight: 800, color: '#f8fafc', fontFamily: 'Inter' }}>{label}</div>
			<div style={{ fontSize: 10, color: COLORS.muted, fontFamily: 'Inter', marginTop: 2 }}>{sub}</div>
			{/* Link Handle dots */}
			<div style={{ position: 'absolute', top: '50%', right: -6, width: 10, height: 10, background: '#fff', border: '2.5px solid #0f172a', borderRadius: 5, transform: 'translateY(-50%)' }} />
			<div style={{ position: 'absolute', top: '50%', left: -6, width: 10, height: 10, background: '#fff', border: '2.5px solid #0f172a', borderRadius: 5, transform: 'translateY(-50%)' }} />
		</div>
	);
};

/* ── Interactive Bridge Packet ── */
const SerializerPacket: React.FC<{ fromY: number; toY: number; delay: number; color: string }> = ({ fromY, toY, delay, color }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	if (f < delay) return null;

	const progress = spring({ frame: f - delay, fps, config: { damping: 22, stiffness: 40 } });
	
	const x1 = 500; const x2 = 700;
	const dx = x2 - x1;
	const currX = x1 + dx * progress;
	
	// Quadratic Bezier Curve: start y -> peaks high -> ends at toY
	const midY = Math.min(fromY, toY) - 80;
	const currY = interpolate(progress, [0, 0.5, 1], [fromY, midY, toY], { easing: Easing.bezier(0.25, 0.1, 0.25, 1) });

	const opacity = interpolate(progress, [0, 0.1, 0.9, 1], [0, 1, 1, 0]);

	return (
		<div style={{
			position: 'absolute', left: currX, top: currY, width: 14, height: 14, borderRadius: 7,
			background: 'white', boxShadow: `0 0 15px ${color}, 0 0 30px ${color}`,
			transform: 'translate(-50%, -50%)', zIndex: 50, opacity
		}} />
	);
};

/* ── Main Slider Layout ── */
const SerializationSlide: React.FC = () => {
	const f = useCurrentFrame();
	
	const tNodeA = F(1);
	const tNodeB = F(1.5);
	
	const tEmitA = F(3);
	const tEmitB = F(4.5);
	
	const tCodeStart = F(3.7);
	const tCodeBody = F(5.2);

	// Text rendering triggers
	const codeA = f > tCodeStart;
	const codeB = f > tCodeBody;

	return (
		<Shell>
			{/* Static Dashboard Header */}
			<div style={{ position: 'absolute', top: 40, left: 50 }}>
				<div style={{ fontSize: 12, fontWeight: 800, color: COLORS.accent, letterSpacing: 2 }}>GRAPH COMPILATION</div>
				<div style={{ fontSize: 30, fontWeight: 900, color: COLORS.ink, fontFamily: 'Inter', marginTop: 4 }}>React XYFlow Node Serialization</div>
				<div style={{ fontSize: 14, color: COLORS.muted, fontFamily: 'Inter', marginTop: 4, maxWidth: 650 }}>
					Visual flow coordinates are decoupled from logic, enabling the editor to compile graphs instantly into optimized execution JSON trees.
				</div>
			</div>

			{/* Left Canvas Pane */}
			<CanvasGrid>
				{/* Static Bezier Connector inside canvas */}
				<svg width="100%" height="100%" style={{ position: 'absolute', overflow: 'visible' }}>
					<path d="M 280 220 C 340 220, 220 380, 280 380" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={3} />
				</svg>
				
				<FlowNode label="WHEN: Task Overdue" sub="Check cron status every 1h" color={COLORS.accent} top={220} left={280} delay={tNodeA} />
				<FlowNode label="AND: Status = OPEN" sub="Check standard workflow state" color={COLORS.accent2} top={380} left={280} delay={tNodeB} />
			</CanvasGrid>

			{/* Visual Gutters Packet Stream */}
			<SerializerPacket fromY={360} toY={250} delay={tEmitA} color={COLORS.accent} />
			<SerializerPacket fromY={520} toY={370} delay={tEmitB} color={COLORS.accent2} />

			{/* Right Code Terminal Pane */}
			<CodeTerminal>
				<div style={{ display: 'flex', gap: 12 }}>
					<span style={{ color: '#475569', textAlign: 'right', width: 20, userSelect: 'none' }}>01<br />02<br />03<br />04<br />05<br />06<br />07<br />08<br />09<br />10<br />11<br />12</span>
					<div style={{ borderLeft: '1px solid rgba(255,255,255,0.05)', paddingLeft: 16 }}>
						<div style={{ opacity: codeA ? 1 : 0.1, transition: 'opacity 0.3s' }}>
							<span style={{ color: '#f472b6' }}>&#123;</span><br />
							&nbsp;&nbsp;<span style={{ color: '#38bdf8' }}>"id"</span>: <span style={{ color: '#fbbf24' }}>"rule_92fa"</span>,<br />
							&nbsp;&nbsp;<span style={{ color: '#38bdf8' }}>"trigger"</span>: <span style={{ color: '#fbbf24' }}>"TASK_OVERDUE"</span>,<br />
							&nbsp;&nbsp;<span style={{ color: '#38bdf8' }}>"conditions"</span>: <span style={{ color: '#c084fc' }}>[</span>
						</div>
						
						<div style={{ opacity: codeB ? 1 : 0, transition: 'opacity 0.3s' }}>
							&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: '#f472b6' }}>&#123;</span><br />
							&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: '#38bdf8' }}>"field"</span>: <span style={{ color: '#fbbf24' }}>"status"</span>,<br />
							&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: '#38bdf8' }}>"op"</span>: <span style={{ color: '#fbbf24' }}>"EQUALS"</span>,<br />
							&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: '#38bdf8' }}>"val"</span>: <span style={{ color: '#fbbf24' }}>"OPEN"</span><br />
							&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: '#f472b6' }}>&#125;</span>
						</div>
						
						<div style={{ opacity: codeB ? 1 : 0.1, transition: 'opacity 0.3s' }}>
							&nbsp;&nbsp;<span style={{ color: '#c084fc' }}>]</span><br />
							<span style={{ color: '#f472b6' }}>&#125;</span>
						</div>
					</div>
				</div>
			</CodeTerminal>

			{/* Compiled Overlay badge */}
			{f > F(7) && (
				<div style={{
					position: 'absolute', bottom: 40, right: 70,
					background: `${COLORS.success}1a`, border: `2px solid ${COLORS.success}`, borderRadius: 8,
					padding: '6px 16px', color: COLORS.success, fontWeight: 900, fontSize: 11, letterSpacing: 2,
					fontFamily: 'monospace', boxShadow: `0 0 20px ${COLORS.success}22`
				}}>
					COMPILATION SUCCESSFUL
				</div>
			)}
		</Shell>
	);
};

/* ── Root ── */
export const VisualConditionBuilder: React.FC = () => {
	const { fps } = useVideoConfig();
	return (
		<AbsoluteFill style={{ background: GRADIENTS.bg }}>
			<Sequence from={0} durationInFrames={fps * 3} layout="none">
				<TitleCard title="Node Graph Serialization" />
			</Sequence>
			<Sequence from={fps * 3} durationInFrames={fps * 27} layout="none">
				<SerializationSlide />
			</Sequence>
		</AbsoluteFill>
	);
};
