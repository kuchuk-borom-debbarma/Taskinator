import React from 'react';
import { AbsoluteFill, Sequence, useVideoConfig, useCurrentFrame, spring, interpolate, Easing } from 'remotion';
import { COLORS, GRADIENTS } from './components/Nodes';
import { TitleCard } from './components/TitleCard';
import { BlockingSlideA, BlockingSlideB } from './BlockingProblem';
import { AsyncIntroSlide, AsyncCreateTask, AsyncCreateTaskLink, AsyncReadProject } from './AsyncSolution';

/* ────────────────────────────────────────────────────────
   LAYOUT  — nodes fit in left 840px, step panel right 350px
──────────────────────────────────────────────────────── */
const CX   = { client: 115, server: 405, db: 700 };
const NT   = 230;   // node top
const NW   = 170;   // node width
const REQ  = 190;   // request arrow y (above nodes)
const REQ2 = 218;   // second server→db arrow y
const RSP  = 395;   // response arrow y (below nodes)

/* ── Node ─────────────────────────────────────────────── */
const Node: React.FC<{ icon: string; label: string; color: string; at: number }> = ({ icon, label, color, at }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const s = spring({ frame: f - at, fps, config: { damping: 14, stiffness: 110 } });
	return (
		<div style={{ opacity: s, transform: `scale(${s})`, width: NW, background: 'rgba(15,23,42,0.88)', border: `1.5px solid ${color}55`, borderRadius: 14, backdropFilter: 'blur(12px)', boxShadow: `0 8px 28px rgba(0,0,0,0.5), 0 0 20px ${color}18`, padding: '16px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
			<div style={{ fontSize: 28 }}>{icon}</div>
			<div style={{ fontSize: 12, fontWeight: 800, color, letterSpacing: '1px', fontFamily: 'Inter', textAlign: 'center' }}>{label}</div>
		</div>
	);
};

/* ── Arrow ────────────────────────────────────────────── */
const Arrow: React.FC<{ x1: number; x2: number; y: number; label: string; color: string; dir?: 'ltr' | 'rtl' }> = ({ x1, x2, y, label, color, dir = 'ltr' }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const p  = spring({ frame: f,     fps, config: { damping: 16, stiffness: 100 } });
	const lp = spring({ frame: f - 4, fps, config: { damping: 14 } });
	const tip = dir === 'ltr' ? x1 + (x2 - x1) * p : x2 + (x1 - x2) * p;
	const id  = `m${y}${dir}`;
	return (
		<>
			<svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none', zIndex: 10 }}>
				<defs><marker id={id} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M 0 0 L 7 3.5 L 0 7 z" fill={color} /></marker></defs>
				<line x1={dir==='ltr'?x1:x2} y1={y} x2={dir==='ltr'?x2:x1} y2={y} stroke={color} strokeWidth={1} opacity={0.1} strokeDasharray="4 3" />
				{dir === 'ltr'
					? <line x1={x1} y1={y} x2={tip} y2={y} stroke={color} strokeWidth={2} strokeLinecap="round" markerEnd={p>.85?`url(#${id})`:undefined} style={{filter:`drop-shadow(0 0 3px ${color}66)`}} />
					: <line x1={x2+(x1-x2)*p} y1={y} x2={x2} y2={y} stroke={color} strokeWidth={2} strokeLinecap="round" markerEnd={p>.85?`url(#${id})`:undefined} style={{filter:`drop-shadow(0 0 3px ${color}66)`}} />
				}
				<circle cx={tip} cy={y} r={3} fill={color} opacity={p} style={{filter:`drop-shadow(0 0 5px ${color})`}} />
			</svg>
			<div style={{ position: 'absolute', left: Math.min(x1,x2)+14, top: dir==='ltr' ? y-30 : y+12, opacity: lp, transform: `translateY(${interpolate(lp,[0,1],[dir==='ltr'?-6:6,0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) })}px)`, background: 'rgba(15,23,42,0.88)', border: `1px solid ${color}44`, borderRadius: 7, padding: '4px 10px', fontSize: 11, fontWeight: 700, color, fontFamily: 'monospace', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', backdropFilter: 'blur(8px)', zIndex: 20 }}>
				{label}
			</div>
		</>
	);
};

/* ── DB Step ──────────────────────────────────────────── */
const DbStep: React.FC<{ num: number; label: string; sub: string; color: string; at: number }> = ({ num, label, sub, color, at }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const s = spring({ frame: f - at, fps, config: { damping: 13, stiffness: 110 } });
	return (
		<div style={{ opacity: s, transform: `translateX(${interpolate(s,[0,1],[30,0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) })}px)`, display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
			<div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: '#000', boxShadow: `0 0 10px ${color}88` }}>{num}</div>
			<div style={{ flex: 1, background: `${color}0e`, border: `1px solid ${color}33`, borderLeft: `3px solid ${color}`, borderRadius: 8, padding: '7px 11px' }}>
				<div style={{ fontSize: 12, fontWeight: 700, color, fontFamily: 'Inter' }}>{label}</div>
				<div style={{ fontSize: 10, color: COLORS.muted, fontFamily: 'monospace', marginTop: 2 }}>{sub}</div>
			</div>
		</div>
	);
};

/* ── Success banner ───────────────────────────────────── */
const Banner: React.FC<{ text: string; at: number }> = ({ text, at }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const s = spring({ frame: f - at, fps, config: { damping: 12, stiffness: 120 } });
	return (
		<div style={{ position: 'absolute', bottom: 26, left: 28, right: 28, opacity: s, transform: `translateY(${interpolate(s,[0,1],[30,0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.175, 0.885, 0.32, 1.275) })}px)`, display: 'flex', justifyContent: 'center', zIndex: 30 }}>
			<div style={{ background: 'rgba(0,230,118,0.1)', border: `2px solid ${COLORS.success}`, color: COLORS.ink, padding: '11px 28px', borderRadius: 12, fontSize: 14, fontWeight: 800, fontFamily: 'Inter', boxShadow: '0 0 32px rgba(0,230,118,0.3)', backdropFilter: 'blur(10px)' }}>✓ &nbsp;{text}</div>
		</div>
	);
};

/* ── Slide shell ──────────────────────────────────────── */
const Shell: React.FC<{ tag: string; title: string; sub: string; accent: string; children: React.ReactNode }> = ({ tag, title, sub, accent, children }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const s = spring({ frame: f, fps, config: { damping: 14 } });
	return (
		<AbsoluteFill style={{ background: GRADIENTS.bg }}>
			<AbsoluteFill style={{ padding: 20 }}>
				<div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'rgba(30,41,59,0.18)', backdropFilter: 'blur(30px)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)', boxShadow: `0 30px 80px rgba(0,0,0,0.55), inset 0 0 60px ${accent}08` }}>
					{/* Header */}
					<div style={{ position: 'absolute', top: 26, left: 28, right: 390, opacity: s, transform: `translateY(${interpolate(s,[0,1],[-12,0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) })}px)` }}>
						<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
							<div style={{ width: 7, height: 7, borderRadius: '50%', background: accent, boxShadow: `0 0 8px ${accent}` }} />
							<span style={{ fontSize: 10, fontWeight: 800, color: accent, fontFamily: 'Inter', textTransform: 'uppercase', letterSpacing: 1.5 }}>{tag}</span>
						</div>
						<h2 style={{ fontSize: 24, fontWeight: 900, color: COLORS.ink, fontFamily: 'Inter', margin: '0 0 4px' }}>{title}</h2>
						<p style={{ fontSize: 12, color: COLORS.muted, fontFamily: 'Inter', margin: 0, lineHeight: 1.5 }}>{sub}</p>
					</div>

					{/* Nodes */}
					<div style={{ position: 'absolute', top: NT, left: CX.client - NW/2 }}><Node icon="📱" label="Client App" color={COLORS.accent} at={2} /></div>
					<div style={{ position: 'absolute', top: NT, left: CX.server - NW/2 }}><Node icon="⚙️" label="API Server" color={COLORS.success} at={5} /></div>
					<div style={{ position: 'absolute', top: NT, left: CX.db - NW/2 }}><Node icon="🗄️" label="PostgreSQL" color={COLORS.accent3} at={8} /></div>

					{/* Track lines */}
					<svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
						<line x1={CX.client+NW/2} y1={300} x2={CX.server-NW/2} y2={300} stroke="rgba(255,255,255,0.05)" strokeWidth={1} strokeDasharray="5 4" />
						<line x1={CX.server+NW/2} y1={300} x2={CX.db-NW/2}     y2={300} stroke="rgba(255,255,255,0.05)" strokeWidth={1} strokeDasharray="5 4" />
					</svg>

					{/* Divider between flow and step panel */}
					<div style={{ position: 'absolute', top: 120, bottom: 80, left: 850, width: 1, background: 'rgba(255,255,255,0.06)' }} />

					{children}
				</div>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};

/* ════════════════════════════════════════════════════════
   SLIDE 1 — CREATE TASK
   Timeline:
     t=1.5  Client→Server arrow (2s)
     t=3.5  Server→DB arrow — arrives (stays 2s)
     t=5.5  DB step 1: INSERT task
     t=8    DB step 2: UPDATE tasks_count
     t=10   DB→Server response arrow (2s)
     t=12   Server→Client 201 (stays)
     t=13.5 Success banner
════════════════════════════════════════════════════════ */
const CreateTask: React.FC = () => {
	const { fps } = useVideoConfig();
	const t = (s: number) => fps * s;
	return (
		<Shell tag="Phase 1 · Synchronous" title="Flow 1 — Create Task" sub="Two sequential writes: insert the task row, then increment the project's denormalized task count." accent={COLORS.accent}>
			{/* Phase A: request travels to DB */}
			<Sequence from={t(1.5)} premountFor={1 * fps} layout="none">
				<Arrow x1={CX.client+NW/2} x2={CX.server-NW/2} y={REQ} label="POST /api/projects/:id/tasks" color={COLORS.accent} />
			</Sequence>
			<Sequence from={t(3.5)} premountFor={1 * fps} layout="none">
				<Arrow x1={CX.server+NW/2} x2={CX.db-NW/2} y={REQ} label="Arriving at database…" color={COLORS.success} />
			</Sequence>

			{/* Phase B: DB operations */}
			<Sequence from={t(5.5)} premountFor={1 * fps} layout="none">
				<div style={{ position: 'absolute', top: 155, left: 866, right: 26 }}>
					<div style={{ fontSize: 10, fontWeight: 800, color: COLORS.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12, fontFamily: 'Inter' }}>Database Operations</div>
					<DbStep num={1} label="Insert task record" sub="INSERT INTO project_task (...) RETURNING *" color={COLORS.success} at={0} />
					<Sequence from={t(2.5)} premountFor={1 * fps} layout="none">
						<DbStep num={2} label="Increment task count" sub="UPDATE project SET tasks_count = tasks_count + 1" color={COLORS.warning} at={0} />
					</Sequence>
				</div>
			</Sequence>

			{/* Phase C: response travels back */}
			<Sequence from={t(10)} premountFor={1 * fps} layout="none">
				<Arrow x1={CX.db-NW/2} x2={CX.server+NW/2} y={RSP} label="task created · count updated ✓" color={COLORS.success} dir="rtl" />
			</Sequence>
			<Sequence from={t(12)} premountFor={1 * fps} layout="none">
				<Arrow x1={CX.server-NW/2} x2={CX.client+NW/2} y={RSP} label="201 Created  { id, title, status }" color={COLORS.accent} dir="rtl" />
			</Sequence>

			<Banner text="Task created · tasks_count incremented · 201 returned" at={t(13.5)} />
		</Shell>
	);
};

/* ════════════════════════════════════════════════════════
   SLIDE 2 — CREATE TASK LINK
   Same timing shape, DB steps: INSERT link + closure paths
════════════════════════════════════════════════════════ */
const CreateTaskLink: React.FC = () => {
	const { fps } = useVideoConfig();
	const t = (s: number) => fps * s;
	return (
		<Shell tag="Phase 1 · Synchronous" title="Flow 2 — Create Task Link" sub="Two writes: the link record itself, then closure table path rows for O(1) reachability." accent={COLORS.accent2}>
			<Sequence from={t(1.5)} premountFor={1 * fps} layout="none">
				<Arrow x1={CX.client+NW/2} x2={CX.server-NW/2} y={REQ} label="POST /api/tasks/:id/links" color={COLORS.accent2} />
			</Sequence>
			<Sequence from={t(3.5)} premountFor={1 * fps} layout="none">
				<Arrow x1={CX.server+NW/2} x2={CX.db-NW/2} y={REQ} label="Arriving at database…" color={COLORS.success} />
			</Sequence>

			<Sequence from={t(5.5)} premountFor={1 * fps} layout="none">
				<div style={{ position: 'absolute', top: 155, left: 866, right: 26 }}>
					<div style={{ fontSize: 10, fontWeight: 800, color: COLORS.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12, fontFamily: 'Inter' }}>Database Operations</div>
					<DbStep num={1} label="Insert task link record" sub="INSERT INTO task_link (...) RETURNING *" color={COLORS.success} at={0} />
					<Sequence from={t(2.5)} premountFor={1 * fps} layout="none">
						<DbStep num={2} label="Write closure table paths" sub="INSERT INTO closure_table ... (N ancestor rows)" color={COLORS.warning} at={0} />
					</Sequence>
				</div>
			</Sequence>

			<Sequence from={t(10)} premountFor={1 * fps} layout="none">
				<Arrow x1={CX.db-NW/2} x2={CX.server+NW/2} y={RSP} label="link created · closure paths written ✓" color={COLORS.success} dir="rtl" />
			</Sequence>
			<Sequence from={t(12)} premountFor={1 * fps} layout="none">
				<Arrow x1={CX.server-NW/2} x2={CX.client+NW/2} y={RSP} label="201 Created  { id, source_task_id, target_task_id }" color={COLORS.accent2} dir="rtl" />
			</Sequence>

			<Banner text="Link created · closure table updated · 201 returned" at={t(13.5)} />
		</Shell>
	);
};

/* ════════════════════════════════════════════════════════
   SLIDE 3 — READ PROJECT
   Simpler: 1 DB query, no step panel needed
   t=1.5  Client→Server
   t=3.5  Server→DB SELECT
   t=5.5  DB processes (show query chip)
   t=7.5  DB→Server row
   t=9.5  Server→Client 200
   t=11   Success
════════════════════════════════════════════════════════ */
const ReadProject: React.FC = () => {
	const { fps } = useVideoConfig();
	const f = useCurrentFrame();
	const t = (s: number) => fps * s;
	const chip = spring({ frame: f - t(5.5), fps, config: { damping: 13 } });
	return (
		<Shell tag="Phase 1 · Synchronous" title="Flow 3 — Read Project" sub="A single SELECT — counts are pre-stored so no JOINs or aggregations are needed at read time." accent={COLORS.success}>
			<Sequence from={t(1.5)} premountFor={1 * fps} layout="none">
				<Arrow x1={CX.client+NW/2} x2={CX.server-NW/2} y={REQ} label="GET /api/projects/:id" color={COLORS.accent} />
			</Sequence>
			<Sequence from={t(3.5)} premountFor={1 * fps} layout="none">
				<Arrow x1={CX.server+NW/2} x2={CX.db-NW/2} y={REQ} label="SELECT * FROM project WHERE id = ?" color={COLORS.success} />
			</Sequence>

			{/* DB processing chip */}
			<div style={{ position: 'absolute', top: 130, left: 866, right: 26, opacity: chip, transform: `translateX(${interpolate(chip,[0,1],[30,0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) })}px)` }}>
				<div style={{ fontSize: 11, fontWeight: 800, color: COLORS.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14, fontFamily: 'Inter' }}>Database Operations</div>
				<DbStep num={1} label="Fetch project row" sub="SELECT id, name, tasks_count, members_count, teams_count FROM project WHERE id = ?" color={COLORS.accent3} at={0} />
			</div>

			<Sequence from={t(7.5)} premountFor={1 * fps} layout="none">
				<Arrow x1={CX.db-NW/2} x2={CX.server+NW/2} y={RSP} label="{ id, name, tasks_count, members_count, ... }" color={COLORS.accent3} dir="rtl" />
			</Sequence>
			<Sequence from={t(9.5)} premountFor={1 * fps} layout="none">
				<Arrow x1={CX.server-NW/2} x2={CX.client+NW/2} y={RSP} label="200 OK  { project }" color={COLORS.success} dir="rtl" />
			</Sequence>

			<Banner text="1 query · no JOINs · counts read directly from row · 200 OK" at={t(11)} />
		</Shell>
	);
};

/* ════════════════════════════════════════════════════════
   ROADMAP SLIDE — shown after title, before Flow 1
════════════════════════════════════════════════════════ */
const RoadmapSlide: React.FC = () => {
	const f = useCurrentFrame();
	const { fps } = useVideoConfig();
	const s  = spring({ frame: f - 5,  fps, config: { damping: 14 } });
	const s2 = spring({ frame: f - 22, fps, config: { damping: 14 } });
	const s3 = spring({ frame: f - 55, fps, config: { damping: 14 } });

	const steps = [
		{ icon: '🔁', phase: '01', label: 'Show the Flow', desc: 'Walk through 3 core operations end-to-end: Create Task, Create Task Link, and Read Project.', color: COLORS.accent },
		{ icon: '⚠️', phase: '02', label: 'Identify the Problem', desc: 'Reveal the scaling bottleneck or architectural weakness introduced by the current design.', color: COLORS.warning },
		{ icon: '✅', phase: '03', label: 'Introduce the Solution', desc: 'Evolve the system with a targeted change that addresses the problem at scale.', color: COLORS.success },
		{ icon: '🚀', phase: '04', label: 'Repeat — Next Phase', desc: 'The improved architecture becomes the new baseline. We raise the bar and repeat.', color: COLORS.accent2 },
	];

	return (
		<AbsoluteFill style={{ background: GRADIENTS.bg }}>
			<AbsoluteFill style={{ padding: 20 }}>
				<div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'rgba(30,41,59,0.18)', backdropFilter: 'blur(30px)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 30px 80px rgba(0,0,0,0.55)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '50px 60px' }}>

					{/* Headline */}
					<div style={{ opacity: s, transform: `translateY(${interpolate(s,[0,1],[-20,0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) })}px)`, textAlign: 'center', marginBottom: 48 }}>
						<div style={{ fontSize: 11, fontWeight: 800, color: COLORS.accent, letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'Inter', marginBottom: 12 }}>The Structure</div>
						<h1 style={{ fontSize: 38, fontWeight: 900, color: COLORS.ink, fontFamily: 'Inter', margin: '0 0 14px', lineHeight: 1.2 }}>Here's How This Works</h1>
						<p style={{ color: COLORS.muted, fontFamily: 'Inter', fontSize: 15, margin: 0, lineHeight: 1.7, maxWidth: 620 }}>
							We start simple, expose a real problem, then evolve the system. Every phase follows the same pattern.
						</p>
					</div>

					{/* Cards */}
					<div style={{ opacity: s2, transform: `translateY(${interpolate(s2,[0,1],[24,0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) })}px)`, display: 'flex', gap: 18, width: '100%', maxWidth: 1060 }}>
						{steps.map((step, i) => (
							<div key={i} style={{ flex: 1, background: 'rgba(15,23,42,0.55)', border: `1px solid ${step.color}33`, borderTop: `3px solid ${step.color}`, borderRadius: 14, padding: '22px 18px', position: 'relative' }}>
								<div style={{ fontSize: 28, marginBottom: 10 }}>{step.icon}</div>
								<div style={{ fontSize: 10, fontWeight: 800, color: step.color, letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: 'Inter', marginBottom: 8 }}>Step {step.phase}</div>
								<div style={{ fontSize: 14, fontWeight: 800, color: COLORS.ink, fontFamily: 'Inter', marginBottom: 8, lineHeight: 1.3 }}>{step.label}</div>
								<div style={{ fontSize: 12, color: COLORS.muted, fontFamily: 'Inter', lineHeight: 1.6 }}>{step.desc}</div>
								{/* connector arrow */}
								{i < steps.length - 1 && (
									<div style={{ position: 'absolute', right: -14, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: 'rgba(255,255,255,0.2)', zIndex: 10 }}>›</div>
								)}
							</div>
						))}
					</div>

					{/* Bottom note */}
					<div style={{ opacity: s3, transform: `translateY(${interpolate(s3,[0,1],[10,0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) })}px)`, marginTop: 32 }}>
						<div style={{ background: 'rgba(0,229,255,0.06)', border: `1px solid ${COLORS.accent}33`, borderRadius: 10, padding: '11px 22px', fontSize: 13, color: COLORS.accent, fontFamily: 'Inter', fontWeight: 600 }}>
							→ &nbsp;Starting now with Phase 1 — the simplest possible synchronous flow
						</div>
					</div>

				</div>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};

/* ════════════════════════════════════════════════════════
   ROOT  —  3s title + 8s roadmap + 15s + 15s + 13s = 54s = 1620 frames
════════════════════════════════════════════════════════ */
export const SyncArchitecture: React.FC = () => {
	const { fps } = useVideoConfig();
	return (
		<AbsoluteFill style={{ background: GRADIENTS.bg }}>
			<Sequence from={0} durationInFrames={fps * 3} premountFor={1 * fps} layout="none">
				<TitleCard title="The Architecture: An Evolutionary Flow" />
			</Sequence>
			<Sequence from={fps * 3} durationInFrames={fps * 8} premountFor={1 * fps} layout="none">
				<RoadmapSlide />
			</Sequence>
			<Sequence from={fps * 11} durationInFrames={fps * 15} premountFor={1 * fps} layout="none">
				<CreateTask />
			</Sequence>
			<Sequence from={fps * 26} durationInFrames={fps * 15} premountFor={1 * fps} layout="none">
				<CreateTaskLink />
			</Sequence>
			<Sequence from={fps * 41} durationInFrames={fps * 13} premountFor={1 * fps} layout="none">
				<ReadProject />
			</Sequence>
			<Sequence from={fps * 54} durationInFrames={fps * 12} premountFor={1 * fps} layout="none">
				<BlockingSlideA />
			</Sequence>
			<Sequence from={fps * 66} durationInFrames={fps * 12} premountFor={1 * fps} layout="none">
				<BlockingSlideB />
			</Sequence>
			{/* ── Phase 2: Async Solution ── */}
			<Sequence from={fps * 78} durationInFrames={fps * 7} premountFor={1 * fps} layout="none">
				<AsyncIntroSlide />
			</Sequence>
			<Sequence from={fps * 85} durationInFrames={fps * 15} premountFor={1 * fps} layout="none">
				<AsyncCreateTask />
			</Sequence>
			<Sequence from={fps * 100} durationInFrames={fps * 15} premountFor={1 * fps} layout="none">
				<AsyncCreateTaskLink />
			</Sequence>
			<Sequence from={fps * 115} premountFor={1 * fps} layout="none">
				<AsyncReadProject />
			</Sequence>
		</AbsoluteFill>
	);
};
