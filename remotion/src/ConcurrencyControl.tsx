import React from 'react';
import { AbsoluteFill, Sequence, useVideoConfig, useCurrentFrame, spring, interpolate, interpolateColors } from 'remotion';
import { COLORS, GRADIENTS } from './components/Nodes';
import { TitleCard } from './components/TitleCard';

const F  = (s: number) => 30 * s;
const SP = (f: number, d: number, fps: number) => spring({ frame: f - d, fps, config: { damping: 16, stiffness: 80 } });

/* ── Shell ── */
const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
	<AbsoluteFill style={{ background: GRADIENTS.bg }}>
		<AbsoluteFill style={{ padding: 30 }}>
			<div style={{ flex:1, position:'relative', overflow:'hidden', background:'rgba(15,23,42,0.3)', backdropFilter:'blur(50px)', borderRadius:30, border:'1.5px solid rgba(255,255,255,0.08)', boxShadow:'0 50px 120px rgba(0,0,0,0.7)' }}>
				{children}
			</div>
		</AbsoluteFill>
	</AbsoluteFill>
);

/* ── Components ── */
const SNode: React.FC<{ icon:string; label:string; sub?:string; color:string; top:number; left:number; w:number; delay:number; glow?:boolean }> = ({ icon,label,sub,color,top,left,w,delay,glow }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const s = SP(f, delay, fps);
	return (
		<div style={{ position:'absolute', top, left, width:w, opacity:s, transform:`scale(${s}) translateY(${interpolate(s,[0,1],[10,0])}px)`, background:'rgba(15,23,42,0.95)', border:`2px solid ${color}66`, borderRadius:20, padding:'18px 20px', textAlign:'center', boxShadow: glow ? `0 0 40px ${color}22` : '0 15px 40px rgba(0,0,0,0.6)', zIndex:20 }}>
			<div style={{ fontSize:32 }}>{icon}</div>
			<div style={{ fontSize:13, fontWeight:900, color, letterSpacing:'2px', textTransform:'uppercase', fontFamily:'Inter', marginTop:8 }}>{label}</div>
			{sub && <div style={{ fontSize:10, color:COLORS.muted, fontFamily:'Inter', marginTop:4, fontWeight:600, opacity:0.8 }}>{sub}</div>}
		</div>
	);
};

const Arrow: React.FC<{ x1:number; y1:number; x2:number; y2:number; color:string; label?:string; delay:number; dashed?:boolean; labelOffset?:number; labelPos?:number }> = ({ x1,y1,x2,y2,color,label,delay,dashed,labelOffset=0,labelPos=0.5 }) => {
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
			<svg style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', overflow:'visible', pointerEvents:'none', zIndex:10 }}>
				<defs>
					<marker id={id} markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
						<path d="M 0 0 L 8 4 L 0 8 z" fill={color}/>
					</marker>
				</defs>
				<line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={1} opacity={0.1} strokeDasharray="4 4"/>
				<line x1={x1} y1={y1} x2={midX} y2={midY} stroke={color} strokeWidth={3} strokeLinecap="round" markerEnd={p > 0.95 ? `url(#${id})` : undefined} strokeDasharray={dashed ? '10 5' : undefined} style={{ filter: `drop-shadow(0 0 5px ${color}66)` }}/>
			</svg>
			{label && (
				<div style={{ 
					position:'absolute', 
					left: lx, 
					top: ly + labelOffset, 
					transform: `translate(-50%, -50%)`, 
					opacity: p > 0.3 ? 1 : 0, 
					transition: 'opacity 0.2s',
					fontSize:11, 
					fontWeight:800, 
					color, 
					fontFamily:'monospace', 
					background:'rgba(15,23,42,0.9)', 
					border:`1px solid ${color}44`, 
					borderRadius:6, 
					padding:'4px 8px', 
					whiteSpace:'nowrap', 
					zIndex:20,
					boxShadow: `0 4px 12px rgba(0,0,0,0.5)`
				}}>
					{label}
				</div>
			)}
		</>
	);
};

const StatusChip: React.FC<{ text:string; color:string; top:number; left:number; delay:number }> = ({ text,color,top,left,delay }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const s = SP(f, delay, fps);
	return (
		<div style={{ position:'absolute', top, left, opacity:s, transform:`scale(${s}) translate(-50%, -50%)`, background:'rgba(15,23,42,0.95)', border:`1.5px solid ${color}`, borderRadius:20, padding:'6px 12px', fontSize:11, fontWeight:800, color, fontFamily:'Inter', whiteSpace:'nowrap', boxShadow:`0 0 20px ${color}44`, zIndex:30 }}>
			{text}
		</div>
	);
};

const Ban: React.FC<{ text:string; color:string; delay:number }> = ({ text,color,delay }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const s = SP(f, delay, fps);
	return (
		<div style={{ position:'absolute', bottom:40, left:0, right:0, display:'flex', justifyContent:'center', opacity:s, transform:`translateY(${interpolate(s,[0,1],[20,0])}px)`, zIndex:40 }}>
			<div style={{ background:`${color}1a`, border:`2px solid ${color}`, borderRadius:12, padding:'12px 30px', fontSize:14, fontWeight:800, color, fontFamily:'Inter', boxShadow:`0 0 40px ${color}33`, backdropFilter:'blur(10px)' }}>
				{text}
			</div>
		</div>
	);
};

/* ════════════════════════════════════════════════════════
   SLIDE 1: THE LOST UPDATE PROBLEM
════════════════════════════════════════════════════════ */
export const LostUpdateSlide: React.FC = () => {
	const f = useCurrentFrame();
	const nodes = {
		bob: { x: 120, y: 180 },
		alice: { x: 120, y: 440 },
		db: { x: 800, y: 240 }
	};

	// Timing map
	const D = (s: number) => F(s);
	const fetchA = D(3);
	const fetchB = D(3.2); // Near simultaneous
	const sendA = D(8);
	const sendAOk = D(10);
	const sendB = D(8.2); // Near simultaneous
	const sendBOk = D(16);

	// DB State interpolation
	let dbTitle = 'Initial';
	let dbColor = COLORS.muted;
	if (f > sendAOk) { dbTitle = 'Bob Update'; dbColor = COLORS.accent; }
	if (f > sendBOk) { dbTitle = 'Alice Update'; dbColor = COLORS.danger; }

	return (
		<Shell>
			<div style={{ position:'absolute', top:40, left:50 }}>
				<div style={{ fontSize:12, fontWeight:800, color:COLORS.danger, letterSpacing:2 }}>THE RACE CONDITION</div>
				<div style={{ fontSize:32, fontWeight:900, color:COLORS.ink, fontFamily:'Inter', marginTop:5 }}>The Lost Update Problem</div>
				<div style={{ fontSize:14, color:COLORS.muted, fontFamily:'Inter', marginTop:5, maxWidth:600 }}>Two users fetch the same task simultaneously. When they save, the second write silently destroys the first.</div>
			</div>

			<SNode icon="👨‍💻" label="User A (Bob)" color={COLORS.accent} top={nodes.bob.y} left={nodes.bob.x} w={140} delay={D(1)} />
			<SNode icon="👩‍💻" label="User B (Alice)" color={COLORS.warning} top={nodes.alice.y} left={nodes.alice.x} w={140} delay={D(1.5)} />

			{/* Database Custom Node */}
			<div style={{ 
				position:'absolute', top:nodes.db.y, left:nodes.db.x, width:340, 
				background:'rgba(15,23,42,0.95)', border:`2px solid ${COLORS.accent3}66`, borderRadius:20, 
				padding:20, zIndex:20, opacity: SP(f, D(2), 30), transform: `scale(${SP(f, D(2), 30)})` 
			}}>
				<div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:15 }}>
					<div style={{ fontSize:14, fontWeight:900, color:COLORS.accent3, letterSpacing:1 }}>POSTGRESQL</div>
					<div style={{ fontSize:10, color:COLORS.muted, background:'rgba(255,255,255,0.1)', padding:'2px 6px', borderRadius:4 }}>Table: task</div>
				</div>
				<div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:8, borderBottom:'1px solid rgba(255,255,255,0.1)', paddingBottom:8, marginBottom:8, fontSize:10, color:COLORS.muted, fontWeight:700 }}>
					<div>id</div><div>title</div>
				</div>
				<div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:8, fontSize:13, fontWeight:700, color:COLORS.ink, transition: 'all 0.3s' }}>
					<div>task_1</div><div style={{ color: dbColor }}>{dbTitle}</div>
				</div>
			</div>

			{/* Bob Fetch */}
			<Arrow x1={nodes.bob.x + 140} y1={nodes.bob.y + 40} x2={nodes.db.x} y2={nodes.db.y + 60} color={COLORS.accent} label="SELECT * FROM task" delay={fetchA} dashed />
			<StatusChip text="Title: Initial" color={COLORS.muted} top={nodes.bob.y + 90} left={nodes.bob.x + 200} delay={fetchA + 20} />

			{/* Alice Fetch */}
			<Arrow x1={nodes.alice.x + 140} y1={nodes.alice.y + 40} x2={nodes.db.x} y2={nodes.db.y + 100} color={COLORS.warning} label="SELECT * FROM task" delay={fetchB} dashed />
			<StatusChip text="Title: Initial" color={COLORS.muted} top={nodes.alice.y + 90} left={nodes.alice.x + 200} delay={fetchB + 20} />

			{/* Bob Write */}
			<Arrow x1={nodes.bob.x + 140} y1={nodes.bob.y + 70} x2={nodes.db.x} y2={nodes.db.y + 80} color={COLORS.accent} label="UPDATE task SET title = 'Bob Update'" delay={sendA} />
			<StatusChip text="✅ 200 OK (Saved)" color={COLORS.success} top={nodes.db.y + 160} left={nodes.db.x + 100} delay={sendAOk} />

			{/* Alice Write */}
			<Arrow x1={nodes.alice.x + 140} y1={nodes.alice.y + 70} x2={nodes.db.x} y2={nodes.db.y + 120} color={COLORS.danger} label="UPDATE task SET title = 'Alice Update'" delay={sendB} />
			<StatusChip text="✅ 200 OK (Saved)" color={COLORS.success} top={nodes.db.y + 160} left={nodes.db.x + 240} delay={sendBOk} />

			{/* The Result */}
			<Ban text="💥 DATA LOSS: Bob's update was completely wiped out because Alice's client had stale data." color={COLORS.danger} delay={D(20)} />
		</Shell>
	);
};

/* ════════════════════════════════════════════════════════
   SLIDE 2: OPTIMISTIC LOCKING SOLUTION
════════════════════════════════════════════════════════ */
export const ProtectedFlowSlide: React.FC = () => {
	const f = useCurrentFrame();
	const nodes = {
		bob: { x: 120, y: 180 },
		alice: { x: 120, y: 440 },
		db: { x: 800, y: 240 }
	};

	const D = (s: number) => F(s);
	const fetchA = D(3);
	const fetchB = D(3.2);
	const sendA = D(9);
	const sendAOk = D(11);
	const sendB = D(9.2);
	const sendBReject = D(17);

	// DB State
	let dbTitle = 'Initial';
	let dbVersion = 1;
	let dbColor = COLORS.muted;
	if (f > sendAOk) { dbTitle = 'Bob Update'; dbColor = COLORS.success; dbVersion = 2; }

	return (
		<Shell>
			<div style={{ position:'absolute', top:40, left:50 }}>
				<div style={{ fontSize:12, fontWeight:800, color:COLORS.success, letterSpacing:2 }}>THE SOLUTION</div>
				<div style={{ fontSize:32, fontWeight:900, color:COLORS.ink, fontFamily:'Inter', marginTop:5 }}>Optimistic Locking</div>
				<div style={{ fontSize:14, color:COLORS.muted, fontFamily:'Inter', marginTop:5, maxWidth:600 }}>We add a `version` column. The database acts as a traffic cop, rejecting updates if the version has changed.</div>
			</div>

			<SNode icon="👨‍💻" label="User A (Bob)" color={COLORS.accent} top={nodes.bob.y} left={nodes.bob.x} w={140} delay={D(1)} />
			<SNode icon="👩‍💻" label="User B (Alice)" color={COLORS.warning} top={nodes.alice.y} left={nodes.alice.x} w={140} delay={D(1.5)} />

			{/* Database Node with Version Column */}
			<div style={{ 
				position:'absolute', top:nodes.db.y, left:nodes.db.x, width:380, 
				background:'rgba(15,23,42,0.95)', border:`2px solid ${COLORS.accent3}66`, borderRadius:20, 
				padding:20, zIndex:20, opacity: SP(f, D(2), 30), transform: `scale(${SP(f, D(2), 30)})` 
			}}>
				<div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:15 }}>
					<div style={{ fontSize:14, fontWeight:900, color:COLORS.accent3, letterSpacing:1 }}>POSTGRESQL</div>
					<div style={{ fontSize:10, color:COLORS.success, background:'rgba(0,255,0,0.1)', padding:'2px 6px', borderRadius:4, border:`1px solid ${COLORS.success}` }}>Optimistic Lock Enabled</div>
				</div>
				<div style={{ display:'grid', gridTemplateColumns:'1fr 2fr 1fr', gap:8, borderBottom:'1px solid rgba(255,255,255,0.1)', paddingBottom:8, marginBottom:8, fontSize:10, color:COLORS.muted, fontWeight:700 }}>
					<div>id</div><div>title</div><div style={{ color: COLORS.success }}>version</div>
				</div>
				<div style={{ display:'grid', gridTemplateColumns:'1fr 2fr 1fr', gap:8, fontSize:13, fontWeight:700, color:COLORS.ink, transition: 'all 0.3s' }}>
					<div>task_1</div><div style={{ color: dbColor }}>{dbTitle}</div><div style={{ color: COLORS.success, fontWeight:900, fontSize:16 }}>{dbVersion}</div>
				</div>
			</div>

			{/* Fetch Phase */}
			<Arrow x1={nodes.bob.x + 140} y1={nodes.bob.y + 40} x2={nodes.db.x} y2={nodes.db.y + 60} color={COLORS.accent} label="SELECT * (v=1)" delay={fetchA} dashed />
			<Arrow x1={nodes.alice.x + 140} y1={nodes.alice.y + 40} x2={nodes.db.x} y2={nodes.db.y + 100} color={COLORS.warning} label="SELECT * (v=1)" delay={fetchB} dashed />

			{/* Bob Write */}
			<Arrow x1={nodes.bob.x + 140} y1={nodes.bob.y + 70} x2={nodes.db.x} y2={nodes.db.y + 80} color={COLORS.accent} label="UPDATE SET v=2 WHERE v=1" delay={sendA} />
			<StatusChip text="✅ 1 row affected" color={COLORS.success} top={nodes.db.y + 160} left={nodes.db.x + 100} delay={sendAOk} />

			{/* Alice Write */}
			<Arrow x1={nodes.alice.x + 140} y1={nodes.alice.y + 70} x2={nodes.db.x} y2={nodes.db.y + 120} color={COLORS.danger} label="UPDATE SET v=2 WHERE v=1" delay={sendB} />
			<StatusChip text="🚫 0 rows affected (Stale)" color={COLORS.danger} top={nodes.db.y + 160} left={nodes.db.x + 280} delay={sendBReject} />
			<StatusChip text="💥 409 Conflict: Please Refresh" color={COLORS.danger} top={nodes.alice.y + 120} left={nodes.alice.x + 240} delay={sendBReject + 10} />

			<Ban text="🛡️ SAFE: Alice's update is safely rejected, preventing the silent destruction of Bob's work." color={COLORS.success} delay={D(22)} />
		</Shell>
	);
};

/* ════════════════════════════════════════════════
   ROOT
════════════════════════════════════════════════ */
export const ConcurrencyControl: React.FC = () => {
	const { fps } = useVideoConfig();
	return (
		<AbsoluteFill style={{ background: GRADIENTS.bg }}>
			<Sequence from={0} durationInFrames={fps*2}>
				<TitleCard title="Concurrency Control" />
			</Sequence>
			<Sequence from={fps*2} durationInFrames={fps*25}>
				<LostUpdateSlide />
			</Sequence>
			<Sequence from={fps*27} durationInFrames={fps*25}>
				<ProtectedFlowSlide />
			</Sequence>
		</AbsoluteFill>
	);
};
