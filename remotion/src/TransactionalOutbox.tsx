import React from 'react';
import { AbsoluteFill, Sequence, useVideoConfig, useCurrentFrame, spring, interpolate } from 'remotion';
import { COLORS, GRADIENTS } from './components/Nodes';
import { TitleCard } from './components/TitleCard';

const SP = (f: number, d: number, fps: number) => spring({ frame: f - d, fps, config: { damping: 14, stiffness: 110 } });
const F  = (s: number, fps: number) => fps * s;
const tx = (s: number) => `translateY(${interpolate(s,[0,1],[-14,0])}px)`;

/* ── Shell ── */
const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
	<AbsoluteFill style={{ background: GRADIENTS.bg }}>
		<AbsoluteFill style={{ padding: 20 }}>
			<div style={{ flex:1, position:'relative', overflow:'hidden', background:'rgba(30,41,59,0.18)', backdropFilter:'blur(30px)', borderRadius:20, border:'1px solid rgba(255,255,255,0.08)', boxShadow:'0 30px 80px rgba(0,0,0,0.55)' }}>
				{children}
			</div>
		</AbsoluteFill>
	</AbsoluteFill>
);

/* ── Shared node config ── */
const NP = { client:{l:28,t:220,w:148,cx:102}, server:{l:262,t:220,w:165,cx:344}, db:{l:548,t:220,w:148,cx:622}, broker:{l:262,t:400,w:165,cx:344}, outbox:{l:548,t:400,w:148,cx:622}, listener:{l:730,t:400,w:155,cx:807} };
const NB = 220 + 76;

const SNode: React.FC<{ icon:string; label:string; sub?:string; color:string; top:number; left:number; w:number; delay:number; glow?:boolean }> = ({ icon,label,sub,color,top,left,w,delay,glow }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const s = SP(f, delay, fps);
	return (
		<div style={{ position:'absolute', top, left, width:w, opacity:s, transform:`scale(${s})`, background:'rgba(15,23,42,0.88)', border:`1.5px solid ${color}55`, borderRadius:14, padding:'11px 12px', textAlign:'center', boxShadow: glow ? `0 0 24px ${color}44` : '0 8px 24px rgba(0,0,0,0.5)' }}>
			<div style={{ fontSize:20 }}>{icon}</div>
			<div style={{ fontSize:10, fontWeight:800, color, letterSpacing:'1px', fontFamily:'Inter', marginTop:4 }}>{label}</div>
			{sub && <div style={{ fontSize:8, color:COLORS.muted, fontFamily:'Inter', marginTop:2 }}>{sub}</div>}
		</div>
	);
};

const HA: React.FC<{ x1:number; x2:number; y:number; color:string; label?:string; below?:boolean; delay:number; dashed?:boolean }> = ({ x1,x2,y,color,label,below,delay,dashed }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const p  = spring({ frame:f-delay, fps, config:{damping:16,stiffness:100} });
	const lp = spring({ frame:f-delay-4, fps, config:{damping:14} });
	const tip = x1+(x2-x1)*p;
	const id  = `ha${x1}${y}${delay}`;
	return (
		<>
			<svg style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', overflow:'visible', pointerEvents:'none', zIndex:10 }}>
				<defs><marker id={id} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M 0 0 L 6 3 L 0 6 z" fill={color}/></marker></defs>
				<line x1={Math.min(x1,x2)} y1={y} x2={Math.max(x1,x2)} y2={y} stroke={color} strokeWidth={1} opacity={0.08} strokeDasharray="4 3"/>
				<line x1={x1} y1={y} x2={tip} y2={y} stroke={color} strokeWidth={2} strokeLinecap="round" markerEnd={p>.85?`url(#${id})`:undefined} strokeDasharray={dashed?'8 4':undefined} style={{filter:`drop-shadow(0 0 3px ${color}66)`}}/>
			</svg>
			{label && <div style={{ position:'absolute', left:Math.min(x1,x2)+8, top:below?y+8:y-24, opacity:lp, fontSize:10, fontWeight:700, color, fontFamily:'monospace', background:'rgba(15,23,42,0.9)', border:`1px solid ${color}44`, borderRadius:6, padding:'2px 7px', whiteSpace:'nowrap', zIndex:20 }}>{label}</div>}
		</>
	);
};

const VA: React.FC<{ x:number; y1:number; y2:number; color:string; label?:string; delay:number; dashed?:boolean }> = ({ x,y1,y2,color,label,delay,dashed }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const p  = spring({ frame:f-delay, fps, config:{damping:16,stiffness:100} });
	const lp = spring({ frame:f-delay-4, fps, config:{damping:14} });
	const tip = y1+(y2-y1)*p;
	const id  = `va${x}${y1}${delay}`;
	const down = y2 > y1;
	return (
		<>
			<svg style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', overflow:'visible', pointerEvents:'none', zIndex:10 }}>
				<defs><marker id={id} markerWidth="6" markerHeight="6" refX="3" refY={down?5:1} orient={down?'90':'270'}><path d="M 0 0 L 6 3 L 0 6 z" fill={color}/></marker></defs>
				<line x1={x} y1={y1} x2={x} y2={y2} stroke={color} strokeWidth={1} opacity={0.08} strokeDasharray="4 3"/>
				<line x1={x} y1={y1} x2={x} y2={tip} stroke={color} strokeWidth={2} strokeLinecap="round" markerEnd={p>.85?`url(#${id})`:undefined} strokeDasharray={dashed?'8 4':undefined} style={{filter:`drop-shadow(0 0 3px ${color}66)`}}/>
			</svg>
			{label && <div style={{ position:'absolute', left:x+8, top:(y1+y2)/2-10, opacity:lp, fontSize:10, fontWeight:700, color, fontFamily:'monospace', background:'rgba(15,23,42,0.9)', border:`1px solid ${color}44`, borderRadius:6, padding:'2px 7px', whiteSpace:'nowrap', zIndex:20 }}>{label}</div>}
		</>
	);
};

const Chip: React.FC<{ text:string; color:string; top:number; left:number; delay:number }> = ({ text,color,top,left,delay }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const s = SP(f, delay, fps);
	return <div style={{ position:'absolute', top, left, opacity:s, transform:`scale(${s})`, background:`${color}18`, border:`2px solid ${color}`, borderRadius:10, padding:'7px 14px', fontSize:11, fontWeight:800, color, fontFamily:'Inter', whiteSpace:'nowrap', zIndex:25, backdropFilter:'blur(8px)', boxShadow:`0 0 20px ${color}44` }}>{text}</div>;
};

const Ban: React.FC<{ text:string; color:string; delay:number }> = ({ text,color,delay }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const s = SP(f, delay, fps);
	return (
		<div style={{ position:'absolute', bottom:22, left:32, right:32, opacity:s, transform:`translateY(${interpolate(s,[0,1],[20,0])}px)`, display:'flex', justifyContent:'center', zIndex:30 }}>
			<div style={{ background:`${color}12`, border:`2px solid ${color}`, borderRadius:12, padding:'10px 28px', fontSize:13, fontWeight:800, color, fontFamily:'Inter', boxShadow:`0 0 28px ${color}44` }}>{text}</div>
		</div>
	);
};

/* ════════════════════════════════════════════════
   SLIDE 1 — Problem recap: broker crash
════════════════════════════════════════════════ */
const ProblemRecap: React.FC = () => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const D = (s: number) => F(s, fps);
	const s0 = SP(f, D(0.5), fps);
	return (
		<Shell>
			<div style={{ position:'absolute', top:26, left:32, right:32, opacity:s0, transform:tx(s0) }}>
				<div style={{ fontSize:10, fontWeight:800, color:COLORS.danger, letterSpacing:2, textTransform:'uppercase', fontFamily:'Inter', marginBottom:6 }}>The Problem — Recap</div>
				<h2 style={{ fontSize:26, fontWeight:900, color:COLORS.ink, fontFamily:'Inter', margin:'0 0 4px' }}>Message Loss: The Dual-Write Failure</h2>
				<p style={{ fontSize:12, color:COLORS.muted, fontFamily:'Inter', margin:0 }}>The client hits the API, the task is written to the DB — but the broker publish is a separate step with no atomicity guarantee.</p>
			</div>

			{/* All 4 nodes */}
			<SNode icon="📱" label="Client" color={COLORS.accent} top={NP.client.t} left={NP.client.l} w={NP.client.w} delay={D(1)} />
			<SNode icon="⚙️" label="API Server" color={COLORS.success} top={NP.server.t} left={NP.server.l} w={NP.server.w} delay={D(1.5)} />
			<SNode icon="🗄️" label="PostgreSQL" color={COLORS.accent3} top={NP.db.t} left={NP.db.l} w={NP.db.w} delay={D(2)} />
			<SNode icon="💥" label="Msg Broker" sub="CRASHED" color={COLORS.danger} top={NP.broker.t} left={NP.broker.l} w={NP.broker.w} delay={D(4.5)} glow />

			{/* Step 1: client → server */}
			<HA x1={NP.client.cx+NP.client.w/2} x2={NP.server.l} y={236} color={COLORS.accent} label="POST /api/tasks" delay={D(2)} />
			{/* Step 2: server → db */}
			<HA x1={NP.server.cx+NP.server.w/2} x2={NP.db.l} y={236} color={COLORS.success} label="INSERT task" delay={D(3)} />
			{/* Step 3: db ack → server */}
			<HA x1={NP.db.l} x2={NP.server.cx+NP.server.w/2} y={256} color={COLORS.success} label="commit ✓" delay={D(4)} />
			{/* Step 4: 201 back to client */}
			<HA x1={NP.server.l} x2={NP.client.cx+NP.client.w/2} y={256} color={COLORS.accent} label="201 Created" delay={D(4.5)} />
			{/* Step 5: server tries to publish — crashes */}
			<VA x={NP.server.cx} y1={NB} y2={NP.broker.t} color={COLORS.danger} label="publish to Kafka..." delay={D(5)} dashed />

			<Chip text="💥 Broker crashed — publish fails" color={COLORS.danger} top={NP.broker.t+82} left={NP.broker.l-10} delay={D(6.5)} />
			<Chip text="⚠️ Task in DB — event never sent" color={COLORS.danger} top={NP.db.t+82} left={NP.db.l-20} delay={D(7.5)} />

			<Ban text="💀 Task exists in DB but downstream systems never hear about it" color={COLORS.danger} delay={D(8.5)} />
		</Shell>
	);
};

/* ════════════════════════════════════════════════
   SLIDE 2 — Introducing outbox_events table
════════════════════════════════════════════════ */
const OutboxIntroSlide: React.FC = () => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const D = (s: number) => F(s, fps);
	const s0 = SP(f, D(0.5), fps);
	const cols = [
		{ name:'id',          type:'UUID',      note:'Primary key', color:COLORS.accent },
		{ name:'kafka_topic', type:'TEXT',      note:"e.g. 'task-events'", color:COLORS.warning },
		{ name:'kafka_key',   type:'TEXT',      note:'projectId — sets partition', color:COLORS.warning },
		{ name:'payload',     type:'JSONB',     note:'Full event body', color:COLORS.warning },
		{ name:'created_at',  type:'TIMESTAMPTZ', note:'For ordering & TTL', color:COLORS.muted },
	];
	const idea = SP(f, D(5), fps);
	return (
		<Shell>
			<div style={{ position:'absolute', top:26, left:32, right:32, opacity:s0, transform:tx(s0) }}>
				<div style={{ fontSize:10, fontWeight:800, color:COLORS.warning, letterSpacing:2, textTransform:'uppercase', fontFamily:'Inter', marginBottom:6 }}>The Fix — Introducing a New Table</div>
				<h2 style={{ fontSize:26, fontWeight:900, color:COLORS.ink, fontFamily:'Inter', margin:'0 0 4px' }}>Meet <code style={{ color:COLORS.warning }}>outbox_events</code></h2>
				<p style={{ fontSize:12, color:COLORS.muted, fontFamily:'Inter', margin:0, lineHeight:1.6 }}>Instead of calling Kafka directly, we write the event as a row into a dedicated table — inside the same database transaction as the business write.</p>
			</div>

			{/* Table visual */}
			<div style={{ position:'absolute', top:128, left:60, width:560 }}>
				{/* Header */}
				<div style={{ display:'flex', background:'rgba(255,171,0,0.12)', borderRadius:'10px 10px 0 0', border:`1px solid ${COLORS.warning}44`, padding:'8px 16px', opacity:SP(f, D(1.5), fps) }}>
					<div style={{ flex:1.2, fontSize:10, fontWeight:800, color:COLORS.warning, fontFamily:'monospace' }}>COLUMN</div>
					<div style={{ flex:1, fontSize:10, fontWeight:800, color:COLORS.warning, fontFamily:'monospace' }}>TYPE</div>
					<div style={{ flex:2, fontSize:10, fontWeight:800, color:COLORS.warning, fontFamily:'monospace' }}>NOTE</div>
				</div>
				{cols.map((c, i) => (
					<div key={i} style={{ display:'flex', background: i%2===0 ? 'rgba(15,23,42,0.7)' : 'rgba(15,23,42,0.5)', border:`1px solid rgba(255,255,255,0.05)`, borderTop:'none', padding:'9px 16px', opacity:SP(f, D(2+i*0.5), fps), borderRadius: i===cols.length-1 ? '0 0 10px 10px' : 0 }}>
						<div style={{ flex:1.2, fontSize:11, fontWeight:700, color:c.color, fontFamily:'monospace' }}>{c.name}</div>
						<div style={{ flex:1, fontSize:11, color:COLORS.accent2, fontFamily:'monospace' }}>{c.type}</div>
						<div style={{ flex:2, fontSize:11, color:COLORS.muted, fontFamily:'Inter' }}>{c.note}</div>
					</div>
				))}
			</div>

			{/* Key insight card */}
			<div style={{ position:'absolute', top:128, left:660, right:22, opacity:idea, transform:tx(idea) }}>
				<div style={{ background:'rgba(0,229,255,0.07)', border:`1px solid ${COLORS.accent}33`, borderRadius:14, padding:'18px 20px', marginBottom:16 }}>
					<div style={{ fontSize:12, fontWeight:800, color:COLORS.accent, fontFamily:'Inter', marginBottom:8 }}>💡 Why a table and not direct Kafka?</div>
					<div style={{ fontSize:11, color:COLORS.muted, fontFamily:'Inter', lineHeight:1.8 }}>
						PostgreSQL gives us <strong style={{ color:COLORS.ink }}>ACID transactions</strong>.<br/>
						Kafka does <em>not</em>.<br/><br/>
						If we write to this table inside the same <code style={{ color:COLORS.warning }}>BEGIN...COMMIT</code> block as the task insert, both rows are guaranteed to either <span style={{ color:COLORS.success }}>both commit</span> or <span style={{ color:COLORS.danger }}>both rollback</span>.
					</div>
				</div>
				<div style={{ background:'rgba(0,230,118,0.07)', border:`1px solid ${COLORS.success}33`, borderRadius:14, padding:'14px 18px' }}>
					<div style={{ fontSize:11, fontWeight:800, color:COLORS.success, fontFamily:'Inter', marginBottom:6 }}>✅ The contract</div>
					<div style={{ fontSize:11, color:COLORS.muted, fontFamily:'Inter', lineHeight:1.7 }}>A separate <strong style={{ color:COLORS.ink }}>Relay process</strong> reads rows from this table and publishes them to Kafka — with retries, batching, and SKIP LOCKED concurrency control.</div>
				</div>
			</div>

			<Ban text="📋 outbox_events is the bridge between the DB transaction world and the Kafka streaming world" color={COLORS.warning} delay={D(7)} />
		</Shell>
	);
};

/* ════════════════════════════════════════════════
   SLIDE 2 — wCTE: atomic write
════════════════════════════════════════════════ */
const CodeLine: React.FC<{ text:string; color?:string; indent?:number; delay:number; bold?:boolean }> = ({ text,color=COLORS.muted,indent=0,delay,bold }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const s = SP(f, delay, fps);
	return <div style={{ opacity:s, transform:`translateX(${interpolate(s,[0,1],[-8,0])}px)`, fontSize:11, fontFamily:'monospace', color, fontWeight:bold?800:400, paddingLeft:indent*16, lineHeight:1.7, whiteSpace:'nowrap' }}>{text}</div>;
};

const WCTESlide: React.FC = () => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const D = (s: number) => F(s, fps);
	const s0 = SP(f, D(0.5), fps);
	const bracket = SP(f, D(9), fps);
	const chip1   = SP(f, D(5), fps);
	const chip2   = SP(f, D(8.5), fps);

	return (
		<Shell>
			<div style={{ position:'absolute', top:26, left:32, right:420, opacity:s0, transform:tx(s0) }}>
				<div style={{ fontSize:10, fontWeight:800, color:COLORS.success, letterSpacing:2, textTransform:'uppercase', fontFamily:'Inter', marginBottom:6 }}>Solution — Step 1</div>
				<h2 style={{ fontSize:24, fontWeight:900, color:COLORS.ink, fontFamily:'Inter', margin:'0 0 4px' }}>wCTE: The Atomic Write</h2>
				<p style={{ fontSize:11, color:COLORS.muted, fontFamily:'Inter', margin:0, lineHeight:1.6 }}>Both inserts live inside a single PostgreSQL transaction. They succeed together or fail together — no partial state possible.</p>
			</div>

			{/* Code panel */}
			<div style={{ position:'absolute', top:110, left:32, width:570, background:'rgba(8,12,24,0.9)', borderRadius:14, border:'1px solid rgba(255,255,255,0.08)', padding:'16px 20px' }}>
				<CodeLine text="WITH" color={COLORS.accent2} delay={D(1.5)} />
				<CodeLine text="-- CTE 1: Insert the task row" color='#555' indent={1} delay={D(2)} />
				<CodeLine text="inserted_task AS (" color={COLORS.accent} indent={1} delay={D(2.2)} />
				<CodeLine text="INSERT INTO project_task (fk_project_id, title, status, ...)" color={COLORS.success} indent={2} delay={D(2.5)} />
				<CodeLine text="SELECT ... WHERE EXISTS (SELECT 1 FROM authorized)" color={COLORS.success} indent={2} delay={D(2.8)} />
				<CodeLine text="RETURNING id, projectId, title, status" color={COLORS.success} indent={2} delay={D(3.1)} />
				<CodeLine text=")," color={COLORS.accent} indent={1} delay={D(3.3)} />
				<CodeLine text="-- CTE 2: Write the event to outbox in SAME transaction" color='#555' indent={1} delay={D(4)} />
				<CodeLine text="inserted_outbox AS (" color={COLORS.warning} indent={1} delay={D(4.2)} bold />
				<CodeLine text="INSERT INTO outbox_events (kafka_topic, kafka_key, payload)" color={COLORS.warning} indent={2} delay={D(4.5)} bold />
				<CodeLine text="SELECT 'task-events', projectId::text," color={COLORS.warning} indent={3} delay={D(4.8)} />
				<CodeLine text="  jsonb_build_object('type','task.created', 'taskId', id, ...)" color={COLORS.warning} indent={3} delay={D(5.1)} />
				<CodeLine text="FROM inserted_task" color={COLORS.warning} indent={2} delay={D(5.4)} />
				<CodeLine text=")" color={COLORS.warning} indent={1} delay={D(5.6)} bold />
				<CodeLine text="SELECT * FROM inserted_task;" color={COLORS.accent} delay={D(6)} />
			</div>

			{/* Right panel */}
			<div style={{ position:'absolute', top:110, right:22, width:360 }}>
				<div style={{ background:'rgba(0,229,255,0.06)', border:`1px solid ${COLORS.accent}33`, borderRadius:14, padding:'16px 18px', marginBottom:14 }}>
					<div style={{ fontSize:11, fontWeight:800, color:COLORS.accent, fontFamily:'Inter', marginBottom:8 }}>🔒 Why This Works</div>
					<div style={{ opacity:chip1, fontSize:11, color:COLORS.muted, fontFamily:'Inter', lineHeight:1.7 }}>
						The <span style={{ color:COLORS.success }}>task INSERT</span> and <span style={{ color:COLORS.warning }}>outbox INSERT</span> share the same <strong style={{ color:COLORS.ink }}>BEGIN...COMMIT</strong> block.
						<br/><br/>
						If the server crashes at any point — both rows are rolled back. The event is never orphaned.
					</div>
				</div>

				<div style={{ opacity:chip2, background:'rgba(0,230,118,0.06)', border:`1px solid ${COLORS.success}33`, borderRadius:14, padding:'16px 18px' }}>
					<div style={{ fontSize:11, fontWeight:800, color:COLORS.success, fontFamily:'Inter', marginBottom:8 }}>✅ Real Code — From the Codebase</div>
					<div style={{ fontSize:10, color:COLORS.muted, fontFamily:'Inter', lineHeight:1.7 }}>
						<code style={{ color:COLORS.warning }}>outbox_events</code> table holds:<br/>
						<code style={{ color:COLORS.accent2, fontSize:9 }}>kafka_topic</code> → <code style={{ color:'#aaa', fontSize:9 }}>'task-events'</code><br/>
						<code style={{ color:COLORS.accent2, fontSize:9 }}>kafka_key</code> → <code style={{ color:'#aaa', fontSize:9 }}>projectId</code><br/>
						<code style={{ color:COLORS.accent2, fontSize:9 }}>payload</code> → <code style={{ color:'#aaa', fontSize:9 }}>JSONB event body</code>
					</div>
				</div>

				<div style={{ opacity:bracket, marginTop:14, background:`${COLORS.danger}10`, border:`2px dashed ${COLORS.danger}55`, borderRadius:12, padding:'12px 16px', fontSize:11, fontWeight:700, color:COLORS.danger, fontFamily:'Inter' }}>
					💥 If broker crashes after this commit — the row is <em>already in the outbox</em>. It will be retried.
				</div>
			</div>

			<Ban text="⚛️ One transaction. Two inserts. Zero dual-write failures." color={COLORS.success} delay={D(11)} />
		</Shell>
	);
};

/* ════════════════════════════════════════════════
   SLIDE 3 — Relay: LISTEN/NOTIFY + SKIP LOCKED → Kafka
════════════════════════════════════════════════ */
const RelaySlide: React.FC = () => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const D = (s: number) => F(s, fps);
	const s0 = SP(f, D(0.5), fps);

	const kafka = { l:920, t:300, w:148, cx:994 };

	return (
		<Shell>
			<div style={{ position:'absolute', top:26, left:32, right:32, opacity:s0, transform:tx(s0) }}>
				<div style={{ fontSize:10, fontWeight:800, color:COLORS.accent2, letterSpacing:2, textTransform:'uppercase', fontFamily:'Inter', marginBottom:6 }}>Solution — Step 2</div>
				<h2 style={{ fontSize:24, fontWeight:900, color:COLORS.ink, fontFamily:'Inter', margin:'0 0 4px' }}>The Outbox Relay: LISTEN/NOTIFY + SKIP LOCKED</h2>
				<p style={{ fontSize:11, color:COLORS.muted, fontFamily:'Inter', margin:0 }}>A background relay reads from the outbox and publishes to Kafka — reactively and without polling.</p>
			</div>

			{/* Nodes */}
			<SNode icon="🗄️" label="PostgreSQL" sub="outbox_events" color={COLORS.accent3} top={NP.db.t} left={NP.db.l} w={NP.db.w} delay={D(1)} />
			<SNode icon="📡" label="Relay Pod A" sub="LISTEN active" color={COLORS.accent} top={390} left={140} w={148} delay={D(1.5)} glow />
			<SNode icon="📡" label="Relay Pod B" sub="LISTEN active" color={COLORS.accent} top={500} left={140} w={148} delay={D(2)} />
			<SNode icon="⚡" label="Apache Kafka" sub="task-events" color={COLORS.warning} top={kafka.t} left={kafka.l} w={kafka.w} delay={D(2.5)} glow />

			{/* pg_notify fires */}
			<Chip text="🔔 pg_notify: 'outbox_event_notification'" color={COLORS.accent3} top={195} left={NP.db.l-30} delay={D(2)} />

			{/* Both pods wake up */}
			<HA x1={NP.db.l} x2={214} y={258} color={COLORS.accent3} label="notification" delay={D(3)} />

			{/* Pod A grabs rows (SKIP LOCKED) */}
			<HA x1={214} x2={NP.db.cx+NP.db.w/2} y={420} color={COLORS.accent} label="SELECT ... FOR UPDATE SKIP LOCKED LIMIT 100" delay={D(4)} />
			<Chip text="🔒 Pod A locks rows 1–100" color={COLORS.accent} top={370} left={NP.db.l-30} delay={D(5.5)} />

			{/* Pod B tries — skips locked rows */}
			<HA x1={214} x2={NP.db.cx+NP.db.w/2} y={530} color={COLORS.muted} label="SELECT ... SKIP LOCKED → rows 101–200" delay={D(6)} dashed />
			<Chip text="⏭️ Pod B skips to rows 101–200" color={COLORS.muted} top={480} left={NP.db.l-30} delay={D(7)} />

			{/* Pods publish to Kafka */}
			<HA x1={NP.db.cx+NP.db.w/2} x2={kafka.l} y={420} color={COLORS.warning} label="publish(task-events, projectId, payload)" delay={D(8)} />
			<HA x1={NP.db.cx+NP.db.w/2} x2={kafka.l} y={530} color={COLORS.warning} label="publish batch 2..." delay={D(9)} dashed />

			{/* Delete from outbox after publish */}
			<Chip text="🗑️ DELETE FROM outbox_events WHERE id IN (...)" color={COLORS.danger} top={300} left={NP.db.l-10} delay={D(10)} />

			<Ban text="✅ No polling, no thundering herd, no duplicates — just reactive, lock-free publishing" color={COLORS.success} delay={D(11.5)} />
		</Shell>
	);
};

/* ════════════════════════════════════════════════
   ROOT — 3+10+8+16+14 = 51s = 1530 frames
════════════════════════════════════════════════ */
export const TransactionalOutbox: React.FC = () => {
	const { fps } = useVideoConfig();
	return (
		<AbsoluteFill style={{ background: GRADIENTS.bg }}>
			<Sequence from={0} durationInFrames={fps*3}>
				<TitleCard title="The Transactional Outbox Pattern" />
			</Sequence>
			<Sequence from={fps*3} durationInFrames={fps*10}>
				<ProblemRecap />
			</Sequence>
			<Sequence from={fps*13} durationInFrames={fps*8}>
				<OutboxIntroSlide />
			</Sequence>
			<Sequence from={fps*21} durationInFrames={fps*16}>
				<WCTESlide />
			</Sequence>
			<Sequence from={fps*37}>
				<RelaySlide />
			</Sequence>
		</AbsoluteFill>
	);
};
