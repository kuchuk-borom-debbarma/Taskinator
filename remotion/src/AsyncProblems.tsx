import React from 'react';
import { AbsoluteFill, Sequence, useVideoConfig, useCurrentFrame, spring, interpolate } from 'remotion';
import { COLORS, GRADIENTS } from './components/Nodes';
import { TitleCard } from './components/TitleCard';

const F = (s: number, fps: number) => fps * s;
const SP = (f: number, d: number, fps: number) => spring({ frame: f - d, fps, config: { damping: 14, stiffness: 110 } });



const GlassShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
	<AbsoluteFill style={{ background: GRADIENTS.bg }}>
		<AbsoluteFill style={{ padding: 20 }}>
			<div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'rgba(30,41,59,0.18)', backdropFilter: 'blur(30px)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 30px 80px rgba(0,0,0,0.55)' }}>
				{children}
			</div>
		</AbsoluteFill>
	</AbsoluteFill>
);

const Hdr: React.FC<{ tag: string; color: string; title: string; sub: string }> = ({ tag, color, title, sub }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const s = SP(f, 3, fps);
	return (
		<div style={{ position: 'absolute', top: 26, left: 32, right: 32, opacity: s, transform: `translateY(${interpolate(s,[0,1],[-12,0])}px)` }}>
			<div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
				<div style={{ width:7, height:7, borderRadius:'50%', background:color, boxShadow:`0 0 8px ${color}` }}/>
				<span style={{ fontSize:10, fontWeight:800, color, fontFamily:'Inter', textTransform:'uppercase', letterSpacing:1.5 }}>{tag}</span>
			</div>
			<h2 style={{ fontSize:26, fontWeight:900, color:COLORS.ink, fontFamily:'Inter', margin:'0 0 4px' }}>{title}</h2>
			<p style={{ fontSize:12, color:COLORS.muted, fontFamily:'Inter', margin:0, lineHeight:1.5 }}>{sub}</p>
		</div>
	);
};

const Ban: React.FC<{ text: string; color: string; delay: number }> = ({ text, color, delay }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const s = SP(f, delay, fps);
	return (
		<div style={{ position:'absolute', bottom:22, left:32, right:32, opacity:s, transform:`translateY(${interpolate(s,[0,1],[20,0])}px)`, display:'flex', justifyContent:'center', zIndex:30 }}>
			<div style={{ background:`${color}12`, border:`2px solid ${color}`, borderRadius:12, padding:'11px 28px', fontSize:13, fontWeight:800, color, fontFamily:'Inter', boxShadow:`0 0 28px ${color}44` }}>{text}</div>
		</div>
	);
};

// Shared node positions
const NP = {
	client:   { l:28,  t:210, w:148, cx:102 },
	server:   { l:262, t:210, w:165, cx:344 },
	db:       { l:548, t:210, w:148, cx:622 },
	broker:   { l:262, t:395, w:165, cx:344 },
	listener: { l:510, t:395, w:155, cx:587 },
};

const SN: React.FC<{ icon:string; label:string; sub?:string; color:string; top:number; left:number; w:number; delay:number; red?:boolean }> = ({ icon, label, sub, color, top, left, w, delay, red }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const s = SP(f, delay, fps);
	const pulse = red ? interpolate(Math.sin(f * 0.18),[-1,1],[0,1]) : 0;
	return (
		<div style={{ position:'absolute', top, left, width:w, opacity:s, transform:`scale(${s})`, background:'rgba(15,23,42,0.88)', border:`1.5px solid ${red ? COLORS.danger : color}55`, borderRadius:14, backdropFilter:'blur(12px)', boxShadow:`0 8px 24px rgba(0,0,0,0.5)${red?`, 0 0 ${18+14*pulse}px ${COLORS.danger}55`:''}`, padding:'13px 14px', textAlign:'center' }}>
			<div style={{ fontSize:22 }}>{icon}</div>
			<div style={{ fontSize:10, fontWeight:800, color:red?COLORS.danger:color, letterSpacing:'1px', fontFamily:'Inter', marginTop:5 }}>{label}</div>
			{sub && <div style={{ fontSize:8, color:COLORS.muted, fontFamily:'Inter', marginTop:2 }}>{sub}</div>}
		</div>
	);
};

const HA: React.FC<{ x1:number; x2:number; y:number; color:string; label?:string; below?:boolean; delay:number; dashed?:boolean }> = ({ x1, x2, y, color, label, below, delay, dashed }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const p  = spring({ frame:f-delay, fps, config:{damping:16,stiffness:100} });
	const lp = spring({ frame:f-delay-4, fps, config:{damping:14} });
	const tip = x1 + (x2-x1)*p;
	const id = `h${x1}${y}${delay}`;
	return (
		<>
			<svg style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', overflow:'visible', pointerEvents:'none', zIndex:10 }}>
				<defs><marker id={id} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M 0 0 L 6 3 L 0 6 z" fill={color}/></marker></defs>
				<line x1={Math.min(x1,x2)} y1={y} x2={Math.max(x1,x2)} y2={y} stroke={color} strokeWidth={1} opacity={0.08} strokeDasharray="4 3"/>
				<line x1={x1} y1={y} x2={tip} y2={y} stroke={color} strokeWidth={2} strokeLinecap="round" markerEnd={p>.85?`url(#${id})`:undefined} strokeDasharray={dashed?'8 4':undefined} style={{filter:`drop-shadow(0 0 3px ${color}66)`}}/>
			</svg>
			{label && <div style={{ position:'absolute', left:Math.min(x1,x2)+8, top:below?y+8:y-26, opacity:lp, fontSize:10, fontWeight:700, color, fontFamily:'monospace', background:'rgba(15,23,42,0.9)', border:`1px solid ${color}44`, borderRadius:6, padding:'3px 8px', whiteSpace:'nowrap', zIndex:20 }}>{label}</div>}
		</>
	);
};

const VA: React.FC<{ x:number; y1:number; y2:number; color:string; label?:string; delay:number; dashed?:boolean }> = ({ x, y1, y2, color, label, delay, dashed }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const p  = spring({ frame:f-delay, fps, config:{damping:16,stiffness:100} });
	const lp = spring({ frame:f-delay-4, fps, config:{damping:14} });
	const tip = y1+(y2-y1)*p;
	const id = `v${x}${y1}${delay}`;
	return (
		<>
			<svg style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', overflow:'visible', pointerEvents:'none', zIndex:10 }}>
				<defs><marker id={id} markerWidth="6" markerHeight="6" refX="3" refY={y2>y1?5:1} orient={y2>y1?'90':'270'}><path d="M 0 0 L 6 3 L 0 6 z" fill={color}/></marker></defs>
				<line x1={x} y1={y1} x2={x} y2={y2} stroke={color} strokeWidth={1} opacity={0.08} strokeDasharray="4 3"/>
				<line x1={x} y1={y1} x2={x} y2={tip} stroke={color} strokeWidth={2} strokeLinecap="round" markerEnd={p>.85?`url(#${id})`:undefined} strokeDasharray={dashed?'8 4':undefined} style={{filter:`drop-shadow(0 0 3px ${color}66)`}}/>
			</svg>
			{label && <div style={{ position:'absolute', left:x+8, top:(y1+y2)/2-10, opacity:lp, fontSize:10, fontWeight:700, color, fontFamily:'monospace', background:'rgba(15,23,42,0.9)', border:`1px solid ${color}44`, borderRadius:6, padding:'3px 8px', whiteSpace:'nowrap', zIndex:20 }}>{label}</div>}
		</>
	);
};

const Chip: React.FC<{ text:string; color:string; top:number; left:number; delay:number }> = ({ text, color, top, left, delay }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const s = SP(f, delay, fps);
	return (
		<div style={{ position:'absolute', top, left, opacity:s, transform:`scale(${s})`, background:`${color}18`, border:`2px solid ${color}`, borderRadius:10, padding:'8px 14px', fontSize:12, fontWeight:800, color, fontFamily:'Inter', whiteSpace:'nowrap', zIndex:25, backdropFilter:'blur(8px)', boxShadow:`0 0 20px ${color}44` }}>
			{text}
		</div>
	);
};

/* ─────────────────────────────────────────────────────
   SLIDE 1 — Overview (3 problems, no solutions)
───────────────────────────────────────────────────── */
const OverviewSlide: React.FC = () => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const s1 = SP(f, 4, fps); const s2 = SP(f, 18, fps);
	const problems = [
		{ icon:'⏳', title:'Eventual Consistency', desc:'A read immediately after a write may return stale data — the listener hasn\'t run yet.', color:COLORS.warning },
		{ icon:'📬', title:'Message Loss', desc:'If the broker crashes before delivery, the side effect never runs — the state stays inconsistent forever.', color:COLORS.danger },
		{ icon:'🔁', title:'Duplicate Processing', desc:'At-least-once delivery means a listener may process the same event twice, corrupting state silently.', color:'#ff6b6b' },
	];
	return (
		<GlassShell>
			<div style={{ position:'absolute', top:26, left:32, right:32, textAlign:'center', opacity:s1, transform:`translateY(${interpolate(s1,[0,1],[-14,0])}px)` }}>
				<div style={{ fontSize:10, fontWeight:800, color:COLORS.warning, letterSpacing:2, textTransform:'uppercase', fontFamily:'Inter', marginBottom:10 }}>The Trade-off</div>
				<h1 style={{ fontSize:34, fontWeight:900, color:COLORS.ink, fontFamily:'Inter', margin:'0 0 10px' }}>Async Solves One Problem, Introduces Three</h1>
				<p style={{ fontSize:12, color:COLORS.muted, fontFamily:'Inter', margin:'0 auto', lineHeight:1.7, maxWidth:660 }}>
					Moving to event-driven freed our threads — but distributed systems come with their own failure modes.
				</p>
			</div>
			<div style={{ position:'absolute', top:170, left:32, right:32, display:'flex', gap:20, opacity:s2, transform:`translateY(${interpolate(s2,[0,1],[20,0])}px)` }}>
				{problems.map((p,i) => (
					<div key={i} style={{ flex:1, background:'rgba(15,23,42,0.55)', border:`1px solid ${p.color}33`, borderTop:`3px solid ${p.color}`, borderRadius:14, padding:'24px 20px' }}>
						<div style={{ fontSize:32, marginBottom:12 }}>{p.icon}</div>
						<div style={{ fontSize:14, fontWeight:800, color:p.color, fontFamily:'Inter', marginBottom:10 }}>{p.title}</div>
						<div style={{ fontSize:12, color:COLORS.muted, fontFamily:'Inter', lineHeight:1.7 }}>{p.desc}</div>
					</div>
				))}
			</div>
		</GlassShell>
	);
};

/* ─────────────────────────────────────────────────────
   SLIDE 2 — Eventual Consistency (animated flow)
───────────────────────────────────────────────────── */
const EventualConsistencySlide: React.FC = () => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const D = (s:number) => F(s, fps);
	const NB = NP.server.t + 108; // node bottom
	return (
		<GlassShell>
			<Hdr tag="Problem 1" color={COLORS.warning} title="Eventual Consistency" sub="Between the 201 response and listener completion, any read returns the old stale value." />

			{/* Nodes */}
			<SN icon="📱" label="Client"     color={COLORS.accent}  top={NP.client.t}   left={NP.client.l}   w={NP.client.w}   delay={D(1)} />
			<SN icon="⚙️" label="API Server" color={COLORS.success} top={NP.server.t}   left={NP.server.l}   w={NP.server.w}   delay={D(1.5)} />
			<SN icon="🗄️" label="PostgreSQL" color={COLORS.accent3} top={NP.db.t}       left={NP.db.l}       w={NP.db.w}       delay={D(2)} />
			<SN icon="📨" label="Msg Broker" color={COLORS.accent2} top={NP.broker.t}   left={NP.broker.l}   w={NP.broker.w}   delay={D(6)} />
			<SN icon="🎧" label="Listener"   sub="not yet started"  color={COLORS.muted} top={NP.listener.t} left={NP.listener.l} w={NP.listener.w} delay={D(6.5)} />

			{/* Step 1–3: create task (sync) */}
			<HA x1={NP.client.cx+NP.client.w/2}  x2={NP.server.l}               y={228} color={COLORS.accent}  label="POST /api/tasks"        delay={D(2)} />
			<HA x1={NP.server.cx+NP.server.w/2}  x2={NP.db.l}                   y={228} color={COLORS.success} label="INSERT task (sync)"     delay={D(3.5)} />
			<HA x1={NP.db.l}                     x2={NP.server.cx+NP.server.w/2} y={252} color={COLORS.success} label="row inserted ✓"         delay={D(5)} />

			{/* 201 back immediately */}
			<HA x1={NP.server.l}                 x2={NP.client.cx+NP.client.w/2} y={252} color={COLORS.accent}  label="201 Created"            delay={D(6)} />

			{/* Server emits event */}
			<VA x={NP.server.cx} y1={NB} y2={NP.broker.t} color={COLORS.accent2} label="emit TASK_CREATED" delay={D(7)} dashed />

			{/* Client immediately reads project */}
			<HA x1={NP.client.cx+NP.client.w/2}  x2={NP.server.l}               y={275} color={COLORS.warning} label="GET /api/projects/:id"  delay={D(8)} />
			<HA x1={NP.server.cx+NP.server.w/2}  x2={NP.db.l}                   y={275} color={COLORS.warning} label="SELECT project"          delay={D(9)} />
			<HA x1={NP.db.l}                     x2={NP.server.cx+NP.server.w/2} y={298} color={COLORS.danger}  label="tasks_count = 4 (old!)" delay={D(10)} />
			<HA x1={NP.server.l}                 x2={NP.client.cx+NP.client.w/2} y={298} color={COLORS.danger}  label="200 OK { tasks_count: 4 }" delay={D(11)} />

			{/* Stale chip */}
			<Chip text="⚠️ STALE DATA" color={COLORS.danger} top={165} left={28} delay={D(11.5)} />

			{/* Listener still idle */}
			<Chip text="🎧 Listener: not yet started" color={COLORS.muted} top={430} left={490} delay={D(8)} />

			<Ban text="⏳ The client got tasks_count = 4 but a new task was just created — listener hasn't run yet" color={COLORS.warning} delay={D(12.5)} />
		</GlassShell>
	);
};

/* ─────────────────────────────────────────────────────
   SLIDE 3 — Message Loss (broker crashes)
───────────────────────────────────────────────────── */
const MessageLossSlide: React.FC = () => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const D = (s:number) => F(s, fps);
	const NB = NP.server.t + 108;
	const crashS = SP(f, D(5), fps);
	const pulse   = interpolate(Math.sin(f * 0.2),[-1,1],[0,1]);
	return (
		<GlassShell>
			<Hdr tag="Problem 2" color={COLORS.danger} title="Message Loss" sub="If the broker crashes after the API responds but before the listener consumes the event, the side effect is gone forever." />

			<SN icon="⚙️" label="API Server" color={COLORS.success} top={NP.server.t}   left={NP.server.l}   w={NP.server.w}   delay={D(1)} />
			<SN icon="📱" label="Client"     color={COLORS.accent}  top={NP.client.t}   left={NP.client.l}   w={NP.client.w}   delay={D(1)} />
			<SN icon="🗄️" label="PostgreSQL" color={COLORS.accent3} top={NP.db.t}       left={NP.db.l}       w={NP.db.w}       delay={D(1.5)} />

			{/* Broker node — turns red on crash */}
			<SN icon="💥" label="Msg Broker" sub="CRASHED" color={COLORS.danger} top={NP.broker.t} left={NP.broker.l} w={NP.broker.w} delay={D(4.5)} red />

			{/* Normal sync flow */}
			<HA x1={NP.client.cx+NP.client.w/2}  x2={NP.server.l}               y={228} color={COLORS.accent}  label="POST /api/tasks"    delay={D(1.5)} />
			<HA x1={NP.server.cx+NP.server.w/2}  x2={NP.db.l}                   y={228} color={COLORS.success} label="INSERT task (sync)" delay={D(2.5)} />
			<HA x1={NP.db.l}                     x2={NP.server.cx+NP.server.w/2} y={252} color={COLORS.success} label="row inserted ✓"     delay={D(3.5)} />
			<HA x1={NP.server.l}                 x2={NP.client.cx+NP.client.w/2} y={252} color={COLORS.accent}  label="201 Created"        delay={D(4)} />

			{/* Server tries to emit event */}
			<VA x={NP.server.cx} y1={NB} y2={NP.broker.t} color={COLORS.danger} label="emit TASK_CREATED" delay={D(5)} dashed />

			{/* Crash indicator */}
			<div style={{ position:'absolute', top:NP.broker.t+20, left:NP.broker.l-10, opacity:crashS, transform:`scale(${crashS})`, fontSize:36, zIndex:30 }}>💥</div>

			{/* Event lost chip */}
			<Chip text="📭 Event Lost — Never Delivered" color={COLORS.danger} top={NP.broker.t+115} left={NP.broker.l-10} delay={D(6)} />

			{/* DB state chip */}
			<Chip text="🗄️ tasks_count never updated" color={COLORS.danger} top={NP.db.t+115} left={NP.db.l-20} delay={D(7)} />

			{/* Listener never starts */}
			<div style={{ position:'absolute', top:NP.listener.t, left:NP.listener.l, width:NP.listener.w, opacity:SP(f, D(7.5), fps) }}>
				<div style={{ background:'rgba(15,23,42,0.5)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:'13px 14px', textAlign:'center' }}>
					<div style={{ fontSize:22 }}>🎧</div>
					<div style={{ fontSize:10, fontWeight:800, color:COLORS.muted, fontFamily:'Inter', marginTop:5 }}>Listener</div>
					<div style={{ fontSize:8, color:COLORS.danger, fontFamily:'Inter', marginTop:2 }}>never receives event</div>
				</div>
			</div>

			<Ban text="💀 Data is now permanently inconsistent — tasks_count will never reflect the new task" color={COLORS.danger} delay={D(9)} />
		</GlassShell>
	);
};

/* ─────────────────────────────────────────────────────
   SLIDE 4 — Duplicate Processing
───────────────────────────────────────────────────── */
const DuplicateSlide: React.FC = () => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const D = (s:number) => F(s, fps);
	const NB = NP.server.t + 108; // node bottom
	return (
		<GlassShell>
			<Hdr tag="Problem 3" color="#ff6b6b" title="Duplicate Processing" sub="At-least-once delivery guarantees the event arrives — but it may arrive more than once." />

			{/* Nodes */}
			<SN icon="📱" label="Client"     color={COLORS.accent}  top={NP.client.t}   left={NP.client.l}   w={NP.client.w}   delay={D(1)} />
			<SN icon="⚙️" label="API Server" color={COLORS.success} top={NP.server.t}   left={NP.server.l}   w={NP.server.w}   delay={D(1.5)} />
			<SN icon="🗄️" label="PostgreSQL" color={COLORS.accent3} top={NP.db.t}       left={NP.db.l}       w={NP.db.w}       delay={D(2)} />
			<SN icon="📨" label="Msg Broker" color={COLORS.accent2} top={NP.broker.t}   left={NP.broker.l}   w={NP.broker.w}   delay={D(2.5)} />
			<SN icon="🎧" label="Listener"   color={COLORS.warning} top={NP.listener.t} left={NP.listener.l} w={NP.listener.w} delay={D(3)} />

			{/* Step 1–3: initial flow (faster context) */}
			<HA x1={NP.client.cx+NP.client.w/2}  x2={NP.server.l}               y={228} color={COLORS.accent}  label="POST /tasks" delay={D(2.5)} />
			<HA x1={NP.server.cx+NP.server.w/2}  x2={NP.db.l}                   y={228} color={COLORS.success} label="INSERT task"  delay={D(3.5)} />
			<VA x={NP.server.cx} y1={NB} y2={NP.broker.t} color={COLORS.accent2} label="emit EVENT" delay={D(4.5)} dashed />

			{/* Delivery 1 */}
			<HA x1={NP.broker.cx+NP.broker.w/2} x2={NP.listener.l} y={412} color={COLORS.accent2} label="Deliver (Attempt 1)" delay={D(6)} />
			<VA x={NP.listener.cx} y1={NP.listener.t} y2={NP.db.t+NP.db.w/2} color={COLORS.warning} label="UPDATE tasks_count += 1" delay={D(7.5)} />
			<Chip text="tasks_count: 5 ✓" color={COLORS.success} top={NP.db.t+50} left={NP.db.l-30} delay={D(8.5)} />

			{/* The Reason: Crash before ACK */}
			<div style={{ position:'absolute', top:NP.listener.t+20, left:NP.listener.cx-20, opacity:SP(f, D(9.5), fps), transform:`scale(${SP(f, D(9.5), fps)})`, fontSize:32, zIndex:35 }}>💥</div>
			<Chip text="Crash before sending ACK!" color={COLORS.danger} top={NP.listener.t+105} left={NP.listener.l-10} delay={D(9.8)} />

			{/* Delivery 2 (Duplicate) */}
			<HA x1={NP.broker.cx+NP.broker.w/2} x2={NP.listener.l} y={435} color={COLORS.danger} label="Retry (No ACK received)" delay={D(11.5)} dashed />
			<VA x={NP.listener.cx+20} y1={NP.listener.t} y2={NP.db.t+NP.db.w/2} color={COLORS.danger} label="UPDATE tasks_count += 1 AGAIN" delay={D(12.8)} dashed />
			<Chip text="tasks_count: 6 ❌ WRONG" color={COLORS.danger} top={NP.db.t+90} left={NP.db.l-30} delay={D(13.8)} />

			{/* Expected vs got */}
			<div style={{ position:'absolute', top:NP.client.t, left:NP.client.l, width:220, opacity:SP(f, D(14.5), fps) }}>
				<div style={{ background:'rgba(255,23,68,0.1)', border:`2px solid ${COLORS.danger}`, borderRadius:12, padding:'14px 16px' }}>
					<div style={{ fontSize:11, fontWeight:800, color:COLORS.danger, fontFamily:'Inter', marginBottom:6 }}>🔁 Silent Corruption</div>
					<div style={{ fontSize:11, color:COLORS.muted, fontFamily:'Inter', lineHeight:1.6 }}>
						<span style={{ color:COLORS.success }}>Expected:</span> tasks_count = 5<br/>
						<span style={{ color:COLORS.danger }}>Got:</span> tasks_count = 6
					</div>
				</div>
			</div>

			<Ban text="🔁 At-least-once delivery means retries can cause the same side-effect twice" color="#ff6b6b" delay={D(16)} />
		</GlassShell>
	);
};

/* ─────────────────────────────────────────────────────
   ROOT  —  3+7+14+13+17 = 54s = 1620 frames
───────────────────────────────────────────────────── */
export const AsyncProblems: React.FC = () => {
	const { fps } = useVideoConfig();
	return (
		<AbsoluteFill style={{ background: GRADIENTS.bg }}>
			<Sequence from={0} durationInFrames={fps*3}>
				<TitleCard title="Trading Threads for Complexity" />
			</Sequence>
			<Sequence from={fps*3} durationInFrames={fps*7}>
				<OverviewSlide />
			</Sequence>
			<Sequence from={fps*10} durationInFrames={fps*14}>
				<EventualConsistencySlide />
			</Sequence>
			<Sequence from={fps*24} durationInFrames={fps*13}>
				<MessageLossSlide />
			</Sequence>
			<Sequence from={fps*37}>
				<DuplicateSlide />
			</Sequence>
		</AbsoluteFill>
	);
};
