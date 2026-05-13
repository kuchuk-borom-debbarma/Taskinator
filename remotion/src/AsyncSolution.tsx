import React from 'react';
import { AbsoluteFill, useVideoConfig, useCurrentFrame, spring, interpolate } from 'remotion';
import { COLORS, GRADIENTS } from './components/Nodes';

const fr = (s: number, fps: number) => fps * s;
const sp = (f: number, delay: number, fps: number) =>
	spring({ frame: f - delay, fps, config: { damping: 14, stiffness: 110 } });

/* ── Glass card shell ── */
const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
	<AbsoluteFill style={{ background: GRADIENTS.bg }}>
		<AbsoluteFill style={{ padding: 20 }}>
			<div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'rgba(30,41,59,0.18)', backdropFilter: 'blur(30px)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 30px 80px rgba(0,0,0,0.55)' }}>
				{children}
			</div>
		</AbsoluteFill>
	</AbsoluteFill>
);

/* ── Header ── */
const Header: React.FC<{ tag: string; tagColor: string; title: string; sub: string; delay?: number }> = ({ tag, tagColor, title, sub, delay = 3 }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const s = sp(f, delay, fps);
	return (
		<div style={{ position: 'absolute', top: 26, left: 32, right: 400, opacity: s, transform: `translateY(${interpolate(s, [0, 1], [-12, 0])}px)` }}>
			<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
				<div style={{ width: 7, height: 7, borderRadius: '50%', background: tagColor, boxShadow: `0 0 8px ${tagColor}` }} />
				<span style={{ fontSize: 10, fontWeight: 800, color: tagColor, fontFamily: 'Inter', textTransform: 'uppercase', letterSpacing: 1.5 }}>{tag}</span>
			</div>
			<h2 style={{ fontSize: 24, fontWeight: 900, color: COLORS.ink, fontFamily: 'Inter', margin: '0 0 4px' }}>{title}</h2>
			<p style={{ fontSize: 12, color: COLORS.muted, fontFamily: 'Inter', margin: 0, lineHeight: 1.5 }}>{sub}</p>
		</div>
	);
};

/* ── System node ── */
const SNode: React.FC<{ icon: string; label: string; sub?: string; color: string; top: number; left: number; width?: number; delay: number; glow?: boolean }> = ({ icon, label, sub, color, top, left, width = 160, delay, glow }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const s = sp(f, delay, fps);
	const pulse = glow ? interpolate(Math.sin(f * 0.15), [-1, 1], [0, 1]) : 0;
	return (
		<div style={{ position: 'absolute', top, left, width, opacity: s, transform: `scale(${s})`, background: 'rgba(15,23,42,0.88)', border: `1.5px solid ${color}${glow ? 'cc' : '55'}`, borderRadius: 14, backdropFilter: 'blur(12px)', boxShadow: `0 8px 24px rgba(0,0,0,0.5)${glow ? `, 0 0 ${20 + 14 * pulse}px ${color}55` : ''}`, padding: '14px 16px', textAlign: 'center' }}>
			<div style={{ fontSize: 24 }}>{icon}</div>
			<div style={{ fontSize: 11, fontWeight: 800, color, letterSpacing: '1px', fontFamily: 'Inter', marginTop: 5 }}>{label}</div>
			{sub && <div style={{ fontSize: 9, color: COLORS.muted, fontFamily: 'Inter', marginTop: 2 }}>{sub}</div>}
		</div>
	);
};

/* ── Horizontal arrow ── */
const HArrow: React.FC<{ x1: number; x2: number; y: number; color: string; label?: string; labelBelow?: boolean; delay: number; dashed?: boolean }> = ({ x1, x2, y, color, label, labelBelow, delay, dashed }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const rtl = x2 < x1;
	const p  = spring({ frame: f - delay, fps, config: { damping: 16, stiffness: 100 } });
	const lp = spring({ frame: f - delay - 4, fps, config: { damping: 14 } });
	const tip = rtl ? x1 + (x2 - x1) * p : x1 + (x2 - x1) * p;
	const id = `h${x1}${y}${delay}`;
	return (
		<>
			<svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none', zIndex: 10 }}>
				<defs><marker id={id} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M 0 0 L 6 3 L 0 6 z" fill={color} /></marker></defs>
				<line x1={rtl ? x2 : x1} y1={y} x2={rtl ? x1 : x2} y2={y} stroke={color} strokeWidth={1} opacity={0.1} strokeDasharray={dashed ? '5 4' : '4 3'} />
				<line x1={x1} y1={y} x2={tip} y2={y} stroke={color} strokeWidth={2} strokeLinecap="round" markerEnd={p > 0.85 ? `url(#${id})` : undefined} strokeDasharray={dashed ? '8 4' : undefined} style={{ filter: `drop-shadow(0 0 3px ${color}66)` }} />
			</svg>
			{label && <div style={{ position: 'absolute', left: Math.min(x1, x2) + 8, top: labelBelow ? y + 8 : y - 26, opacity: lp, fontSize: 10, fontWeight: 700, color, fontFamily: 'monospace', background: 'rgba(15,23,42,0.88)', border: `1px solid ${color}44`, borderRadius: 6, padding: '3px 8px', whiteSpace: 'nowrap', zIndex: 20 }}>{label}</div>}
		</>
	);
};

/* ── Vertical arrow ── */
const VArrow: React.FC<{ x: number; y1: number; y2: number; color: string; label?: string; delay: number; dashed?: boolean }> = ({ x, y1, y2, color, label, delay, dashed }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const down = y2 > y1;
	const p  = spring({ frame: f - delay, fps, config: { damping: 16, stiffness: 100 } });
	const lp = spring({ frame: f - delay - 4, fps, config: { damping: 14 } });
	const tip = y1 + (y2 - y1) * p;
	const id = `v${x}${y1}${delay}`;
	return (
		<>
			<svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none', zIndex: 10 }}>
				<defs><marker id={id} markerWidth="6" markerHeight="6" refX="3" refY={down ? 5 : 1} orient={down ? '90' : '270'}><path d="M 0 0 L 6 3 L 0 6 z" fill={color} /></marker></defs>
				<line x1={x} y1={y1} x2={x} y2={y2} stroke={color} strokeWidth={1} opacity={0.1} strokeDasharray={dashed ? '5 4' : '4 3'} />
				<line x1={x} y1={y1} x2={x} y2={tip} stroke={color} strokeWidth={2} strokeLinecap="round" markerEnd={p > 0.85 ? `url(#${id})` : undefined} strokeDasharray={dashed ? '8 4' : undefined} style={{ filter: `drop-shadow(0 0 3px ${color}66)` }} />
			</svg>
			{label && <div style={{ position: 'absolute', left: x + 8, top: (y1 + y2) / 2 - 10, opacity: lp, fontSize: 10, fontWeight: 700, color, fontFamily: 'monospace', background: 'rgba(15,23,42,0.88)', border: `1px solid ${color}44`, borderRadius: 6, padding: '3px 8px', whiteSpace: 'nowrap', zIndex: 20 }}>{label}</div>}
		</>
	);
};

/* ── Step item (right panel) ── */
const StepItem: React.FC<{ num: number; label: string; sub: string; color: string; badge: 'SYNC' | 'ASYNC'; delay: number }> = ({ num, label, sub, color, badge, delay }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const s = sp(f, delay, fps);
	const bc = badge === 'SYNC' ? COLORS.success : COLORS.accent2;
	return (
		<div style={{ opacity: s, transform: `translateX(${interpolate(s, [0, 1], [20, 0])}px)`, display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
			<div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: '#000' }}>{num}</div>
			<div style={{ flex: 1, background: `${color}0d`, border: `1px solid ${color}33`, borderLeft: `3px solid ${color}`, borderRadius: 8, padding: '7px 10px' }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
					<div style={{ fontSize: 11, fontWeight: 700, color, fontFamily: 'Inter' }}>{label}</div>
					<div style={{ fontSize: 8, fontWeight: 900, color: bc, background: `${bc}22`, border: `1px solid ${bc}66`, borderRadius: 4, padding: '1px 5px', letterSpacing: 0.5 }}>{badge}</div>
				</div>
				<div style={{ fontSize: 10, color: COLORS.muted, fontFamily: 'monospace' }}>{sub}</div>
			</div>
		</div>
	);
};

/* ── Banner ── */
const Banner: React.FC<{ text: string; color: string; delay: number }> = ({ text, color, delay }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const s = sp(f, delay, fps);
	return (
		<div style={{ position: 'absolute', bottom: 22, left: 32, right: 32, opacity: s, transform: `translateY(${interpolate(s, [0, 1], [20, 0])}px)`, display: 'flex', justifyContent: 'center', zIndex: 30 }}>
			<div style={{ background: `${color}12`, border: `2px solid ${color}`, borderRadius: 12, padding: '11px 28px', fontSize: 13, fontWeight: 800, color, fontFamily: 'Inter', boxShadow: `0 0 28px ${color}44`, backdropFilter: 'blur(10px)' }}>{text}</div>
		</div>
	);
};

/* ════════════════════════════════════════════════════════
   INTRO SLIDE — The Solution: Async Architecture
════════════════════════════════════════════════════════ */
export const AsyncIntroSlide: React.FC = () => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const s1 = sp(f, 3, fps); const s2 = sp(f, 18, fps); const s3 = sp(f, 48, fps);

	const items = [
		{ icon: '⚡', title: 'Only Critical Writes Stay Sync', desc: 'INSERT the task or link — the core record must exist before we respond.', color: COLORS.success },
		{ icon: '📨', title: 'Side Effects Become Events', desc: 'Count updates, closure paths — emit an event and return 201 immediately.', color: COLORS.accent },
		{ icon: '🎧', title: 'Listeners Handle the Rest', desc: 'Event listeners consume messages and write side effects asynchronously.', color: COLORS.accent2 },
		{ icon: '🚀', title: 'Thread Freed Immediately', desc: 'The request thread is released as soon as the critical write is done.', color: COLORS.warning },
	];

	return (
		<Shell>
			<div style={{ position: 'absolute', top: 26, left: 32, right: 32, opacity: s1, transform: `translateY(${interpolate(s1, [0, 1], [-14, 0])}px)`, textAlign: 'center' }}>
				<div style={{ fontSize: 10, fontWeight: 800, color: COLORS.success, letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'Inter', marginBottom: 10 }}>Phase 2 · The Solution</div>
				<h1 style={{ fontSize: 36, fontWeight: 900, color: COLORS.ink, fontFamily: 'Inter', margin: '0 0 10px' }}>Async Architecture</h1>
				<p style={{ fontSize: 13, color: COLORS.muted, fontFamily: 'Inter', margin: '0 auto', lineHeight: 1.7, maxWidth: 660 }}>
					We split each operation into a <strong style={{ color: COLORS.success }}>synchronous critical path</strong> and <strong style={{ color: COLORS.accent }}>asynchronous side effects</strong> — freeing threads and eliminating the bottleneck.
				</p>
			</div>

			<div style={{ position: 'absolute', top: 170, left: 32, right: 32, display: 'flex', gap: 16, opacity: s2, transform: `translateY(${interpolate(s2, [0, 1], [20, 0])}px)` }}>
				{items.map((item, i) => (
					<div key={i} style={{ flex: 1, background: 'rgba(15,23,42,0.55)', border: `1px solid ${item.color}33`, borderTop: `3px solid ${item.color}`, borderRadius: 14, padding: '20px 16px' }}>
						<div style={{ fontSize: 26, marginBottom: 10 }}>{item.icon}</div>
						<div style={{ fontSize: 13, fontWeight: 800, color: item.color, fontFamily: 'Inter', marginBottom: 8, lineHeight: 1.3 }}>{item.title}</div>
						<div style={{ fontSize: 11, color: COLORS.muted, fontFamily: 'Inter', lineHeight: 1.6 }}>{item.desc}</div>
					</div>
				))}
			</div>

			<div style={{ position: 'absolute', bottom: 28, left: 32, right: 32, opacity: s3, transform: `translateY(${interpolate(s3, [0, 1], [10, 0])}px)`, display: 'flex', justifyContent: 'center' }}>
				<div style={{ background: 'rgba(0,229,255,0.07)', border: `1px solid ${COLORS.accent}44`, borderRadius: 10, padding: '12px 24px', fontSize: 13, color: COLORS.accent, fontFamily: 'Inter', fontWeight: 600 }}>
					→ &nbsp;We introduce a <strong>Message Broker</strong> + <strong>Event Listeners</strong> to handle side effects out-of-band
				</div>
			</div>
		</Shell>
	);
};

/* ════════════════════════════════════════════════════════
   REUSABLE ASYNC FLOW SLIDE
   Layout:
     Top row  (sync):  Client → Server → DB
     Bottom row (async): Server ↓ Broker → Listener → DB
     Right panel: step list
════════════════════════════════════════════════════════ */
// Node positions
const N = {
	client:   { left: 28,  top: 200, w: 148, cx: 102 },
	server:   { left: 262, top: 200, w: 165, cx: 344 },
	db:       { left: 548, top: 200, w: 148, cx: 622 },
	broker:   { left: 262, top: 385, w: 165, cx: 344 },
	listener: { left: 510, top: 385, w: 155, cx: 587 },
};
const NT_BOT = N.server.top + 110; // node bottom ~310
const NT_TOP = N.broker.top;        // broker top 385

interface FlowStep { num: number; label: string; sub: string; color: string; badge: 'SYNC' | 'ASYNC'; delay: number }

const AsyncFlowSlide: React.FC<{
	tag: string; title: string; sub: string; accent: string;
	reqLabel: string; syncLabel: string; eventName: string; asyncLabel: string;
	steps: FlowStep[];
	showReadProject?: boolean;
}> = ({ tag, title, sub, accent, reqLabel, syncLabel, eventName, asyncLabel, steps, showReadProject }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const D = (s: number) => fr(s, fps);

	return (
		<Shell>
			<Header tag={tag} tagColor={accent} title={title} sub={sub} />

			{/* Nodes */}
			<SNode icon="📱" label="Client"     color={COLORS.accent}  top={N.client.top}   left={N.client.left}   width={N.client.w}   delay={D(1)} />
			<SNode icon="⚙️" label="API Server" color={COLORS.success} top={N.server.top}   left={N.server.left}   width={N.server.w}   delay={D(1.5)} />
			<SNode icon="🗄️" label="PostgreSQL" color={COLORS.accent3} top={N.db.top}       left={N.db.left}       width={N.db.w}       delay={D(2)} />
			{!showReadProject && <>
				<SNode icon="📨" label="Msg Broker" sub="Kafka / Event Bus" color={COLORS.accent2} top={N.broker.top}   left={N.broker.left}   width={N.broker.w}   delay={D(7)} />
				<SNode icon="🎧" label="Listener"   color={COLORS.warning} top={N.listener.top} left={N.listener.left} width={N.listener.w} delay={D(9)} />
			</>}

			{/* ── Sync path ── */}
			<HArrow x1={N.client.cx + N.client.w/2}  x2={N.server.left}          y={220} color={COLORS.accent}  label={reqLabel}   delay={D(2)} />
			<HArrow x1={N.server.cx + N.server.w/2}  x2={N.db.left}              y={220} color={COLORS.success} label={syncLabel}  delay={D(3.5)} />
			{/* DB ack → Server */}
			<HArrow x1={N.db.left}                   x2={N.server.cx + N.server.w/2} y={250} color={COLORS.success} label="row inserted ✓" delay={D(5)} />
			{/* Server → Client 201 */}
			<HArrow x1={N.server.left}               x2={N.client.cx + N.client.w/2} y={250} color={COLORS.accent}  label="201 Created" delay={D(6)} />

			{!showReadProject && <>
				{/* ── Async path ── */}
				{/* Server ↓ Broker */}
				<VArrow x={N.server.cx} y1={NT_BOT} y2={NT_TOP} color={COLORS.accent2} label={`emit ${eventName}`} delay={D(7.5)} dashed />
				{/* Broker → Listener */}
				<HArrow x1={N.broker.cx + N.broker.w/2} x2={N.listener.left} y={415} color={COLORS.accent2} label="deliver event" delay={D(9.5)} dashed />
				{/* Listener → DB */}
				<VArrow x={N.db.cx} y1={NT_TOP} y2={NT_BOT} color={COLORS.warning} label={asyncLabel} delay={D(11)} dashed />
			</>}

			{/* Divider */}
			<div style={{ position: 'absolute', top: 120, bottom: 70, left: 856, width: 1, background: 'rgba(255,255,255,0.06)' }} />

			{/* Right panel */}
			<div style={{ position: 'absolute', top: 130, left: 866, right: 24 }}>
				<div style={{ fontSize: 9, fontWeight: 800, color: COLORS.muted, letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: 'Inter', marginBottom: 14 }}>Operation Steps</div>
				{steps.map(s => <StepItem key={s.num} {...s} />)}
			</div>

			<Banner text={showReadProject ? '✓ 1 query · instant read · no change needed' : `✓ 201 returned before async side-effects · thread freed immediately`} color={accent} delay={D(12.5)} />
		</Shell>
	);
};

/* ── Create Task ── */
export const AsyncCreateTask: React.FC = () => (
	<AsyncFlowSlide
		tag="Phase 2 · Async" title="Create Task — Async Flow" accent={COLORS.accent}
		sub="Only INSERT is synchronous. The count update is a fire-and-forget event."
		reqLabel="POST /api/projects/:id/tasks" syncLabel="INSERT project_task (sync)" eventName="TASK_CREATED" asyncLabel="UPDATE tasks_count"
		steps={[
			{ num: 1, label: 'Insert task record',   sub: 'INSERT INTO project_task … RETURNING *', color: COLORS.success, badge: 'SYNC',  delay: 45 },
			{ num: 2, label: 'Return 201 Created',   sub: 'Thread released immediately',            color: COLORS.accent,  badge: 'SYNC',  delay: 55 },
			{ num: 3, label: 'Emit TASK_CREATED',    sub: 'Publish event to message broker',        color: COLORS.accent2, badge: 'ASYNC', delay: 65 },
			{ num: 4, label: 'Listener: update count', sub: 'UPDATE project SET tasks_count += 1', color: COLORS.warning, badge: 'ASYNC', delay: 80 },
		]}
	/>
);

/* ── Create Task Link ── */
export const AsyncCreateTaskLink: React.FC = () => (
	<AsyncFlowSlide
		tag="Phase 2 · Async" title="Create Task Link — Async Flow" accent={COLORS.accent2}
		sub="Only INSERT is synchronous. The closure table paths are written asynchronously."
		reqLabel="POST /api/tasks/:id/links" syncLabel="INSERT task_link (sync)" eventName="TASK_LINK_CREATED" asyncLabel="INSERT closure paths"
		steps={[
			{ num: 1, label: 'Insert task link record', sub: 'INSERT INTO task_link … RETURNING *',   color: COLORS.success, badge: 'SYNC',  delay: 45 },
			{ num: 2, label: 'Return 201 Created',      sub: 'Thread released immediately',           color: COLORS.accent2, badge: 'SYNC',  delay: 55 },
			{ num: 3, label: 'Emit TASK_LINK_CREATED',  sub: 'Publish event to message broker',       color: COLORS.accent2, badge: 'ASYNC', delay: 65 },
			{ num: 4, label: 'Listener: write closure', sub: 'INSERT INTO closure_table … N rows',    color: COLORS.warning, badge: 'ASYNC', delay: 80 },
		]}
	/>
);

/* ── Read Project ── */
export const AsyncReadProject: React.FC = () => (
	<AsyncFlowSlide
		tag="Phase 2 · Async" title="Read Project — Unchanged" accent={COLORS.success}
		sub="No change needed. Counts are still pre-stored — reads are always a single SELECT."
		reqLabel="GET /api/projects/:id" syncLabel="SELECT * FROM project" eventName="" asyncLabel="" showReadProject
		steps={[
			{ num: 1, label: 'Fetch project row', sub: 'SELECT … tasks_count already stored',  color: COLORS.success, badge: 'SYNC', delay: 45 },
			{ num: 2, label: 'Return 200 OK',     sub: 'No JOINs, no aggregations, no broker', color: COLORS.accent,  badge: 'SYNC', delay: 55 },
		]}
	/>
);
