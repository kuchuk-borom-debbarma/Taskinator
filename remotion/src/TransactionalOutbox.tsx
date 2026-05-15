import React from 'react';
import { AbsoluteFill, Sequence, useVideoConfig, useCurrentFrame, spring, interpolate, interpolateColors, Easing } from 'remotion';
import { COLORS, GRADIENTS } from './components/Nodes';
import { TitleCard } from './components/TitleCard';

const SP = (f: number, d: number, fps: number) => spring({ frame: f - d, fps, config: { damping: 16, stiffness: 80 } });
const F  = (s: number) => 30 * s; 
const tx = (s: number) => `translateY(${interpolate(s, [0, 1], [-20, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) })}px)`;

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
		<div style={{ position:'absolute', top, left, width:w, opacity:s, transform:`scale(${s}) translateY(${interpolate(s, [0, 1], [10, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) })}px)`, background:'rgba(15,23,42,0.95)', border:`2px solid ${color}66`, borderRadius:20, padding:'18px 20px', textAlign:'center', boxShadow: glow ? `0 0 40px ${color}22` : '0 15px 40px rgba(0,0,0,0.6)', zIndex:20 }}>
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
					opacity: p, 
					transform: `translate(-50%, -50%) rotate(${angle}deg)`, 
					transformOrigin: 'center',
					zIndex:25 
				}}>
					<div style={{ transform: `rotate(${-angle}deg)`, background:'rgba(15,23,42,0.95)', border:`1.5px solid ${color}55`, borderRadius:8, padding:'4px 12px', fontSize:11, fontWeight:800, color, fontFamily:'monospace', whiteSpace:'nowrap', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}>
						{label}
					</div>
				</div>
			)}
		</>
	);
};

const StatusChip: React.FC<{ text:string; color:string; top:number; left:number; delay:number }> = ({ text,color,top,left,delay }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const s = SP(f, delay, fps);
	return <div style={{ position:'absolute', top, left, opacity:s, transform: `scale(${s}) translateY(${interpolate(s, [0, 1], [10, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) })}px)`, background:`${color}25`, border:`2px solid ${color}`, borderRadius:12, padding:'10px 20px', fontSize:13, fontWeight:900, color, fontFamily:'Inter', whiteSpace:'nowrap', zIndex:30, backdropFilter:'blur(15px)', boxShadow:`0 10px 40px ${color}44` }}>{text}</div>;
};

const Ban: React.FC<{ text:string; color:string; delay:number }> = ({ text,color,delay }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const s = SP(f, delay, fps);
	return (
		<div style={{ position:'absolute', bottom:40, left:60, right:60, opacity:s, transform:`translateY(${interpolate(s, [0, 1], [20, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.175, 0.885, 0.32, 1.275) })}px)`, display:'flex', justifyContent:'center', zIndex:40 }}>
			<div style={{ background:`${color}15`, border:`2px solid ${color}`, borderRadius:20, padding:'14px 48px', fontSize:16, fontWeight:900, color, fontFamily:'Inter', boxShadow:`0 0 50px ${color}33`, backdropFilter:'blur(20px)' }}>{text}</div>
		</div>
	);
};

/* ════════════════════════════════════════════════
   SLIDE 1 — The Problem
════════════════════════════════════════════════ */
const ProblemSlide: React.FC = () => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const D = (s: number) => F(s);
	const s0 = SP(f, D(0.5), fps);
	
	const nodes = {
		client: { x: 150, y: 360, w: 200 },
		server: { x: 450, y: 360, w: 220 },
		db:     { x: 850, y: 220, w: 220 },
		broker: { x: 850, y: 500, w: 220 }
	};

	return (
		<Shell>
			<div style={{ position:'absolute', top:40, left:50, right:50, opacity:s0, transform:tx(s0) }}>
				<div style={{ fontSize:12, fontWeight:900, color:COLORS.danger, letterSpacing:3, textTransform:'uppercase', fontFamily:'Inter', marginBottom:10 }}>Architectural Risk</div>
				<h2 style={{ fontSize:36, fontWeight:900, color:COLORS.ink, fontFamily:'Inter', margin:'0 0 8px' }}>The Dual-Write Failure</h2>
				<p style={{ fontSize:16, color:COLORS.muted, fontFamily:'Inter', margin:0, maxWidth:800, lineHeight:1.6 }}>When two separate systems are updated sequentially, any failure in the second step creates a permanent, irrecoverable state of corruption.</p>
			</div>

			<SNode icon="📱" label="Client" color={COLORS.accent} top={nodes.client.y - 45} left={nodes.client.x - 100} w={nodes.client.w} delay={D(1)} />
			<SNode icon="⚙️" label="API Server" color={COLORS.success} top={nodes.server.y - 45} left={nodes.server.x - 110} w={nodes.server.w} delay={D(1.5)} />
			<SNode icon="🗄️" label="PostgreSQL" color={COLORS.accent3} top={nodes.db.y - 45} left={nodes.db.x - 110} w={nodes.db.w} delay={D(2)} />
			<SNode icon="💥" label="Broker" sub="DISCONNECTED" color={COLORS.danger} top={nodes.broker.y - 45} left={nodes.broker.x - 110} w={nodes.broker.w} delay={D(4.5)} glow />

			<Arrow x1={nodes.client.x + 100} y1={nodes.client.y} x2={nodes.server.x - 110} y2={nodes.server.y} color={COLORS.accent} label="POST /create-task" delay={D(2)} />
			<Arrow x1={nodes.server.x + 110} y1={nodes.server.y - 20} x2={nodes.db.x - 110} y2={nodes.db.y} color={COLORS.success} label="COMMIT task row" delay={D(2.5)} />
			<Arrow x1={nodes.server.x + 110} y1={nodes.server.y + 20} x2={nodes.broker.x - 110} y2={nodes.broker.y} color={COLORS.danger} label="publish event (FAIL)" delay={D(4.5)} dashed />

			<StatusChip text="💀 Permanent Data Loss" color={COLORS.danger} top={nodes.broker.y - 120} left={nodes.broker.x - 100} delay={D(6.5)} />
		</Shell>
	);
};

/* ════════════════════════════════════════════════
   SLIDE 2 — The Solution: Atomic Outbox
════════════════════════════════════════════════ */
const SolutionIntroSlide: React.FC = () => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const D = (s: number) => F(s);
	const s0 = SP(f, D(0.5), fps);

	return (
		<Shell>
			<div style={{ position:'absolute', top:40, left:50, right:50, opacity:s0, transform:tx(s0) }}>
				<div style={{ fontSize:12, fontWeight:900, color:COLORS.success, letterSpacing:3, textTransform:'uppercase', fontFamily:'Inter', marginBottom:10 }}>The Solution: Step 1</div>
				<h2 style={{ fontSize:36, fontWeight:900, color:COLORS.ink, fontFamily:'Inter', margin:'0 0 8px' }}>Transactional Atomicity</h2>
				<p style={{ fontSize:16, color:COLORS.muted, fontFamily:'Inter', margin:0, maxWidth:800, lineHeight:1.6 }}>We treat the "Intent to Publish" as data. By storing the event in an <strong>Outbox Table</strong>, we leverage the Database's own transaction engine to guarantee consistency.</p>
			</div>

			<div style={{ position:'absolute', top:220, left:100, right:100, display:'flex', gap:40, opacity:SP(f, D(1.5), fps) }}>
				{/* Code Panel */}
				<div style={{ flex:1.5, background:'rgba(10,15,30,0.98)', border:'2px solid rgba(255,255,255,0.1)', borderRadius:24, padding:32, boxShadow:'0 40px 80px rgba(0,0,0,0.5)' }}>
					<div style={{ fontFamily:'"Fira Code", monospace', fontSize:14, lineHeight:1.8 }}>
						<div style={{ color:COLORS.accent2 }}>WITH <span style={{ color:COLORS.accent }}>inserted_task</span> AS (</div>
						<div style={{ color:COLORS.success, paddingLeft:24 }}>INSERT INTO tasks (...) RETURNING id, project_id</div>
						<div style={{ color:COLORS.accent2 }}>), <span style={{ color:COLORS.warning }}>inserted_outbox</span> AS (</div>
						<div style={{ color:COLORS.warning, paddingLeft:24 }}>INSERT INTO outbox_events (topic, payload)</div>
						<div style={{ color:COLORS.warning, paddingLeft:24 }}>SELECT 'task-created', jsonb_build_object('id', id)</div>
						<div style={{ color:COLORS.warning, paddingLeft:24 }}>FROM inserted_task</div>
						<div style={{ color:COLORS.accent2 }}>)</div>
						<div style={{ color:COLORS.accent2 }}>SELECT * FROM inserted_task;</div>
					</div>
				</div>

				{/* Rule Panel */}
				<div style={{ flex:1, display:'flex', flexDirection:'column', gap:24 }}>
					<div style={{ background:'rgba(0,229,255,0.1)', border:`2px solid ${COLORS.accent}44`, borderRadius:20, padding:24 }}>
						<div style={{ color:COLORS.accent, fontWeight:900, fontSize:14, marginBottom:8 }}>✅ ONE TRANSACTION</div>
						<div style={{ color:COLORS.muted, fontSize:13, lineHeight:1.6 }}>Both records share a single COMMIT. Zero risk of partial success.</div>
					</div>
					<div style={{ background:'rgba(0,230,118,0.1)', border:`2px solid ${COLORS.success}44`, borderRadius:20, padding:24 }}>
						<div style={{ color:COLORS.success, fontWeight:900, fontSize:14, marginBottom:8 }}>✅ NO NETWORK CALLS</div>
						<div style={{ color:COLORS.muted, fontSize:13, lineHeight:1.6 }}>Writing to the outbox is a local DB operation. No latency, no crash risk.</div>
					</div>
				</div>
			</div>
		</Shell>
	);
};

/* ════════════════════════════════════════════════
   SLIDE 3 — The Relay: Reactive & Scalable
════════════════════════════════════════════════ */
const RelaySlide: React.FC = () => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const D = (s: number) => F(s);
	const s0 = SP(f, D(0.5), fps);

	const nodes = {
		db:     { x: 180, y: 360, w: 220 },
		podA:   { x: 640, y: 220, w: 240 },
		podB:   { x: 640, y: 500, w: 240 },
		kafka:  { x: 1100, y: 360, w: 220 }
	};

	return (
		<Shell>
			<div style={{ position:'absolute', top:40, left:50, right:50, opacity:s0, transform:tx(s0) }}>
				<div style={{ fontSize:12, fontWeight:900, color:COLORS.accent2, letterSpacing:3, textTransform:'uppercase', fontFamily:'Inter', marginBottom:10 }}>The Solution: Step 2</div>
				<h2 style={{ fontSize:36, fontWeight:900, color:COLORS.ink, fontFamily:'Inter', margin:'0 0 8px' }}>High-Concurrency Relay</h2>
				<p style={{ fontSize:16, color:COLORS.muted, fontFamily:'Inter', margin:0, maxWidth:800, lineHeight:1.6 }}>A separate fleet of workers monitors the outbox using <strong>LISTEN/NOTIFY</strong>. They use <strong>SKIP LOCKED</strong> to process batches in parallel without duplication.</p>
			</div>

			<SNode icon="🗄️" label="PostgreSQL" sub="Outbox Buffer" color={COLORS.accent3} top={nodes.db.y - 55} left={nodes.db.x - 110} w={nodes.db.w} delay={D(1)} />
			<SNode icon="📡" label="Relay Pod A" sub="Worker #1" color={COLORS.accent} top={nodes.podA.y - 55} left={nodes.podA.x - 120} w={nodes.podA.w} delay={D(1.5)} glow />
			<SNode icon="📡" label="Relay Pod B" sub="Worker #2" color={COLORS.accent} top={nodes.podB.y - 55} left={nodes.podB.x - 120} w={nodes.podB.w} delay={D(2)} />
			<SNode icon="⚡" label="Kafka" sub="Event Bus" color={COLORS.warning} top={nodes.kafka.y - 55} left={nodes.kafka.x - 110} w={nodes.kafka.w} delay={D(2.5)} glow />

			{/* Phase 1: Notify */}
			<Arrow x1={nodes.db.x + 110} y1={nodes.db.y - 30} x2={nodes.podA.x - 120} y2={nodes.podA.y} color={COLORS.accent3} label="🔔 NOTIFY" delay={D(3)} labelPos={0.25} />
			<Arrow x1={nodes.db.x + 110} y1={nodes.db.y + 30} x2={nodes.podB.x - 120} y2={nodes.podB.y} color={COLORS.accent3} label="🔔 NOTIFY" delay={D(3.2)} labelPos={0.25} />

			{/* Phase 2: Concurrent Fetch */}
			<Arrow x1={nodes.podA.x - 120} y1={nodes.podA.y + 30} x2={nodes.db.x + 110} y2={nodes.db.y - 15} color={COLORS.accent} label="SELECT SKIP LOCKED" delay={D(4.5)} labelPos={0.55} labelOffset={-25} />
			<Arrow x1={nodes.podB.x - 120} y1={nodes.podB.y - 30} x2={nodes.db.x + 110} y2={nodes.db.y + 15} color={COLORS.muted} label="SELECT SKIP LOCKED" delay={D(5.5)} dashed labelPos={0.55} labelOffset={25} />

			{/* Concurrency Detail */}
			<StatusChip text="📦 Locked: Batch 01" color={COLORS.accent} top={nodes.podA.y - 25} left={nodes.podA.x + 135} delay={D(6)} />
			<StatusChip text="📦 Locked: Batch 02" color={COLORS.accent2} top={nodes.podB.y - 25} left={nodes.podB.x + 135} delay={D(7)} />

			{/* Phase 3: Publish */}
			<Arrow x1={nodes.podA.x + 120} y1={nodes.podA.y} x2={nodes.kafka.x - 110} y2={nodes.kafka.y - 10} color={COLORS.warning} label="publish()" delay={D(8.5)} labelPos={0.7} />
			<Arrow x1={nodes.podB.x + 120} y1={nodes.podB.y} x2={nodes.kafka.x - 110} y2={nodes.kafka.y + 10} color={COLORS.warning} label="publish()" delay={D(9.5)} dashed labelPos={0.7} />

			{/* Phase 4: Finalize */}
			<Arrow x1={nodes.podA.x - 120} y1={nodes.podA.y + 55} x2={nodes.db.x + 110} y2={nodes.db.y} color={COLORS.danger} label="DELETE processed" delay={D(11)} labelPos={0.8} labelOffset={35} />

			<Ban text="🚀 Decoupled, Atomic, and Fault-Tolerant event distribution architecture" color={COLORS.success} delay={D(12.5)} />
		</Shell>
	);
};

/* ════════════════════════════════════════════════
   SLIDE 4 — The Relay Hazard
   Sequence: 50s - 70s (1500 - 2100 frames)
════════════════════════════════════════════════ */
const DuplicateProblemSlide: React.FC = () => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const D = (s: number) => F(s);
	const s0 = SP(f, D(0.5), fps);
	
	const nodes = {
		db:     { x: 180, y: 360, w: 220 },
		podA:   { x: 640, y: 220, w: 240 },
		podB:   { x: 640, y: 500, w: 240 },
		kafka:  { x: 1100, y: 360, w: 220 }
	};

	return (
		<Shell>
			<div style={{ position:'absolute', top:40, left:50, right:50, opacity:s0, transform:tx(s0) }}>
				<div style={{ fontSize:12, fontWeight:900, color:COLORS.danger, letterSpacing:3, textTransform:'uppercase', fontFamily:'Inter', marginBottom:10 }}>The Relay Hazard</div>
				<h2 style={{ fontSize:36, fontWeight:900, color:COLORS.ink, fontFamily:'Inter', margin:'0 0 8px' }}>At-Least-Once Delivery</h2>
				<p style={{ fontSize:16, color:COLORS.muted, fontFamily:'Inter', margin:0, maxWidth:800, lineHeight:1.6 }}>If a Relay worker crashes after publishing to Kafka but before deleting the Outbox row, the visibility timeout expires. Another worker will pick up the same row, creating <strong>duplicate events</strong>.</p>
			</div>

			<SNode icon="🗄️" label="PostgreSQL" sub="Outbox (Events 99, 100)" color={COLORS.accent3} top={nodes.db.y - 55} left={nodes.db.x - 110} w={nodes.db.w} delay={D(1)} />
			<SNode icon="📡" label="Relay Pod A" sub="Worker #1" color={COLORS.accent} top={nodes.podA.y - 55} left={nodes.podA.x - 120} w={nodes.podA.w} delay={D(1.5)} />
			<SNode icon="📡" label="Relay Pod B" sub="Worker #2" color={COLORS.accent} top={nodes.podB.y - 55} left={nodes.podB.x - 120} w={nodes.podB.w} delay={D(2)} />
			<SNode icon="⚡" label="Kafka Topic" sub="[Empty]" color={COLORS.warning} top={nodes.kafka.y - 55} left={nodes.kafka.x - 110} w={nodes.kafka.w} delay={D(2.5)} />

			{/* Phase 1: Fetch */}
			<Arrow x1={nodes.podA.x - 120} y1={nodes.podA.y + 30} x2={nodes.db.x + 110} y2={nodes.db.y - 15} color={COLORS.accent} label="SELECT SKIP LOCKED" delay={D(3)} labelPos={0.55} labelOffset={-25} />
			<StatusChip text="📦 Locked: Batch [99, 100]" color={COLORS.accent} top={nodes.podA.y - 25} left={nodes.podA.x + 135} delay={D(4)} />

			{/* Phase 2: Publish */}
			<Arrow x1={nodes.podA.x + 120} y1={nodes.podA.y - 15} x2={nodes.kafka.x - 110} y2={nodes.kafka.y - 30} color={COLORS.warning} label="publish(99)" delay={D(5)} labelPos={0.6} />
			<Arrow x1={nodes.podA.x + 120} y1={nodes.podA.y + 15} x2={nodes.kafka.x - 110} y2={nodes.kafka.y - 10} color={COLORS.warning} label="publish(100)" delay={D(6)} labelPos={0.6} />
			
			{/* Phase 3: Crash */}
			<StatusChip text="💥 Kernel Panic! (Crash)" color={COLORS.danger} top={nodes.podA.y - 90} left={nodes.podA.x - 100} delay={D(7.5)} />
			<Arrow x1={nodes.podA.x - 120} y1={nodes.podA.y + 55} x2={nodes.db.x + 110} y2={nodes.db.y} color={COLORS.danger} label="DELETE IN (99,100) FAILED" delay={D(8)} dashed labelPos={0.8} labelOffset={35} />

			{/* Phase 4: Redelivery */}
			<StatusChip text="⏱️ Lock Expires (30s)" color={COLORS.muted} top={nodes.db.y + 70} left={nodes.db.x - 80} delay={D(10)} />
			<Arrow x1={nodes.podB.x - 120} y1={nodes.podB.y - 30} x2={nodes.db.x + 110} y2={nodes.db.y + 15} color={COLORS.danger} label="SELECT SKIP LOCKED" delay={D(11.5)} labelPos={0.55} labelOffset={25} />
			<StatusChip text="⚠️ Fetches [99, 100] Again" color={COLORS.danger} top={nodes.podB.y - 25} left={nodes.podB.x + 135} delay={D(12.5)} />
			
			<Arrow x1={nodes.podB.x + 120} y1={nodes.podB.y - 15} x2={nodes.kafka.x - 110} y2={nodes.kafka.y + 10} color={COLORS.danger} label="publish(99) AGAIN" delay={D(14)} dashed labelPos={0.6} />
			<Arrow x1={nodes.podB.x + 120} y1={nodes.podB.y + 15} x2={nodes.kafka.x - 110} y2={nodes.kafka.y + 30} color={COLORS.danger} label="publish(100) AGAIN" delay={D(15)} dashed labelPos={0.6} />

			<Ban text="❌ Result: The consumer will now receive these events twice." color={COLORS.danger} delay={D(17)} />
		</Shell>
	);
};

/* ════════════════════════════════════════════════
   SLIDE 5 — The Solution: Idempotent Consumer
   Sequence: 70s - 94s (2100 - 2820 frames)
════════════════════════════════════════════════ */
const IdempotencySlide: React.FC = () => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const D = (s: number) => F(s);
	const s0 = SP(f, D(0.5), fps);
	
	const nodes = {
		kafka:    { x: 120, y: 360, w: 200 },
		consumer: { x: 450, y: 360, w: 220 },
		db:       { x: 820, y: 180, w: 380 }
	};

	// Timeline
	const rcvA = D(3);
	const insertA = D(4.5);
	const insertASuccess = D(5.5);
	const updateA = D(7);
	const updateASuccess = D(8);
	const commitA = D(9.5);
	
	const rcvB = D(11.5);
	const insertB = D(13);
	const conflictB = D(14);
	const skipB = D(16);
	const commitB = D(17.5);

	return (
		<Shell>
			<div style={{ position:'absolute', top:40, left:50, right:50, opacity:s0, transform:tx(s0) }}>
				<div style={{ fontSize:12, fontWeight:900, color:COLORS.success, letterSpacing:3, textTransform:'uppercase', fontFamily:'Inter', marginBottom:10 }}>The Consumer Solution</div>
				<h2 style={{ fontSize:36, fontWeight:900, color:COLORS.ink, fontFamily:'Inter', margin:'0 0 8px' }}>Transactional Inbox (Idempotency)</h2>
				<p style={{ fontSize:16, color:COLORS.muted, fontFamily:'Inter', margin:0, maxWidth:800, lineHeight:1.6 }}>By making the "deduplication check" and the "business logic" share the same atomic database transaction, we guarantee that the domain state is updated <strong>exactly once</strong>, even if the worker receives duplicates.</p>
			</div>

			<SNode icon="📦" label="Kafka Topic" sub="[#99 (Copy A), #99 (Copy B)]" color={COLORS.warning} top={nodes.kafka.y - 45} left={nodes.kafka.x - 100} w={nodes.kafka.w} delay={D(1)} />
			<SNode icon="⚙️" label="Task Service" sub="Consumer Pod" color={COLORS.accent} top={nodes.consumer.y - 45} left={nodes.consumer.x - 110} w={nodes.consumer.w} delay={D(1.5)} />
			
			{/* Custom Database UI */}
			<div style={{ position:'absolute', top:nodes.db.y, left:nodes.db.x, width:nodes.db.w, opacity:SP(f, D(2), fps), background:'rgba(15,23,42,0.95)', border:`2px solid ${COLORS.accent3}66`, borderRadius:24, padding:24, boxShadow:'0 20px 50px rgba(0,0,0,0.5)', zIndex:20 }}>
				<div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
					<div style={{ fontSize:14, fontWeight:900, color:COLORS.accent3, letterSpacing:2, textTransform:'uppercase' }}>PostgreSQL</div>
					<div style={{ background:'rgba(0,229,255,0.1)', border:`1px solid ${COLORS.accent3}66`, padding:'4px 8px', borderRadius:8, fontSize:10, color:COLORS.accent3, fontWeight:800 }}>ATOMIC TRANSACTION</div>
				</div>
				
				{/* Processed Events Table */}
				<div style={{ marginBottom:20 }}>
					<div style={{ fontSize:12, color:COLORS.muted, marginBottom:8, display:'flex', justifyContent:'space-between' }}>
						<span>Table: <strong>processed_event</strong></span>
						<span style={{ color:COLORS.warning }}>PK (event_id)</span>
					</div>
					<div style={{ border:`1px solid rgba(255,255,255,0.1)`, borderRadius:8, overflow:'hidden', background:'rgba(0,0,0,0.3)' }}>
						<div style={{ background:'rgba(255,255,255,0.05)', padding:'8px 12px', fontSize:11, color:COLORS.muted, borderBottom:`1px solid rgba(255,255,255,0.1)` }}>event_id</div>
						{/* Row 99 */}
						<div style={{ 
							padding:'8px 12px', fontSize:12, color:COLORS.ink, fontFamily:'monospace',
							background: interpolateColors(f, [insertASuccess, insertASuccess+10, conflictB, conflictB+10, conflictB+30], ['transparent', 'rgba(0,230,118,0.1)', 'rgba(0,230,118,0.1)', 'rgba(255,50,50,0.3)', 'rgba(0,230,118,0.1)']),
							opacity: SP(f, insertASuccess, fps)
						}}>
							'evt_99'
						</div>
					</div>
				</div>

				{/* Tasks Table */}
				<div>
					<div style={{ fontSize:12, color:COLORS.muted, marginBottom:8 }}>Table: <strong>tasks</strong> (Domain State)</div>
					<div style={{ border:`1px solid rgba(255,255,255,0.1)`, borderRadius:8, overflow:'hidden', background:'rgba(0,0,0,0.3)' }}>
						<div style={{ display:'flex', background:'rgba(255,255,255,0.05)', padding:'8px 12px', fontSize:11, color:COLORS.muted, borderBottom:`1px solid rgba(255,255,255,0.1)` }}>
							<div style={{ flex:1 }}>id</div>
							<div style={{ flex:1 }}>status</div>
						</div>
						<div style={{ display:'flex', padding:'8px 12px', fontSize:12, color:COLORS.ink, fontFamily:'monospace' }}>
							<div style={{ flex:1 }}>'task_1'</div>
							<div style={{ flex:1, fontWeight:900, color: interpolateColors(f, [updateASuccess, updateASuccess+10], [COLORS.warning, COLORS.success]) }}>
								{f < updateASuccess ? 'PENDING' : 'DONE'}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Phase 1: Copy A */}
			<div style={{ opacity: interpolate(f, [rcvB - 15, rcvB - 5], [1, 0], { extrapolateRight: 'clamp' }) }}>
				<Arrow x1={nodes.kafka.x + 100} y1={nodes.kafka.y} x2={nodes.consumer.x - 110} y2={nodes.consumer.y} color={COLORS.warning} label="1. poll() -> #99 (A)" delay={rcvA} />
				<Arrow x1={nodes.consumer.x + 110} y1={nodes.consumer.y - 40} x2={nodes.db.x} y2={nodes.db.y + 110} color={COLORS.accent3} label="2. INSERT ON CONFLICT" delay={insertA} labelPos={0.5} labelOffset={-20} />
				<StatusChip text="✅ Row Created" color={COLORS.success} top={nodes.db.y + 110} left={nodes.db.x - 100} delay={insertASuccess} />
				
				<Arrow x1={nodes.consumer.x + 110} y1={nodes.consumer.y} x2={nodes.db.x} y2={nodes.db.y + 240} color={COLORS.success} label="3. UPDATE tasks" delay={updateA} labelPos={0.5} />
				<StatusChip text="🔄 State Changed" color={COLORS.success} top={nodes.db.y + 240} left={nodes.db.x - 100} delay={updateASuccess} />
				
				<Arrow x1={nodes.consumer.x + 110} y1={nodes.consumer.y + 40} x2={nodes.db.x} y2={nodes.db.y + 300} color={COLORS.accent2} label="4. COMMIT" delay={commitA} labelPos={0.5} labelOffset={20} />
			</div>

			{/* Phase 2: Copy B (Duplicate) */}
			{f >= rcvB - 5 && (
				<>
					<Arrow x1={nodes.kafka.x + 100} y1={nodes.kafka.y} x2={nodes.consumer.x - 110} y2={nodes.consumer.y} color={COLORS.danger} label="5. poll() -> #99 (B)" delay={rcvB} dashed />
					<Arrow x1={nodes.consumer.x + 110} y1={nodes.consumer.y - 40} x2={nodes.db.x} y2={nodes.db.y + 110} color={COLORS.danger} label="6. INSERT ON CONFLICT" delay={insertB} labelPos={0.5} labelOffset={-20} dashed />
					
					<StatusChip text="💥 Conflict! (0 rows)" color={COLORS.danger} top={nodes.db.y + 110} left={nodes.db.x - 100} delay={conflictB} />
					
					<Arrow x1={nodes.consumer.x + 110} y1={nodes.consumer.y} x2={nodes.db.x} y2={nodes.db.y + 240} color={COLORS.muted} label="7. UPDATE tasks (SKIPPED)" delay={skipB} labelPos={0.5} dashed />
					<Arrow x1={nodes.consumer.x + 110} y1={nodes.consumer.y + 40} x2={nodes.db.x} y2={nodes.db.y + 300} color={COLORS.muted} label="8. ROLLBACK / COMMIT" delay={commitB} labelPos={0.5} labelOffset={20} dashed />
				</>
			)}

			<Ban text="🛡️ Zero extra reads, zero partial states, mathematically perfect idempotency." color={COLORS.success} delay={D(20)} />
		</Shell>
	);
};

/* ════════════════════════════════════════════════
   ROOT — Total Duration: 94s = 2820 frames
════════════════════════════════════════════════ */
export const TransactionalOutbox: React.FC = () => {
	const { fps } = useVideoConfig();
	return (
		<AbsoluteFill style={{ background: GRADIENTS.bg }}>
			<Sequence from={0} durationInFrames={fps*3} layout="none">
				<TitleCard title="The Transactional Outbox Pattern" />
			</Sequence>
			<Sequence from={fps*3} durationInFrames={fps*12} layout="none">
				<ProblemSlide />
			</Sequence>
			<Sequence from={fps*15} durationInFrames={fps*16} layout="none">
				<SolutionIntroSlide />
			</Sequence>
			<Sequence from={fps*31} durationInFrames={fps*19} layout="none">
				<RelaySlide />
			</Sequence>
			<Sequence from={fps*50} durationInFrames={fps*20} layout="none">
				<DuplicateProblemSlide />
			</Sequence>
			<Sequence from={fps*70} durationInFrames={fps*24} layout="none">
				<IdempotencySlide />
			</Sequence>
		</AbsoluteFill>
	);
};
