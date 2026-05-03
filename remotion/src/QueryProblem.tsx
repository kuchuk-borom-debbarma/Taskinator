import React from 'react';
import {
	AbsoluteFill, useVideoConfig, useCurrentFrame,
	spring, interpolate
} from 'remotion';
import { COLORS, GRADIENTS } from './components/Nodes';

/* ── Shared ──────────────────────────────────────────── */
const glassBg: React.CSSProperties = {
	flex: 1,
	background: 'rgba(30, 41, 59, 0.2)',
	backdropFilter: 'blur(30px)',
	borderRadius: '20px',
	border: '1px solid rgba(255, 255, 255, 0.1)',
	boxShadow: '0 30px 80px rgba(0, 0, 0, 0.5), inset 0 0 40px rgba(255,23,68,0.04)',
	position: 'relative',
	overflow: 'hidden',
};

/* ── Appear helper ───────────────────────────────────── */
const Appear: React.FC<{ at: number; children: React.ReactNode; x?: number; y?: number }> = ({ at, children, x = 0, y = 20 }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const s = spring({ frame: frame - at, fps, config: { damping: 14, stiffness: 100 } });
	return (
		<div style={{
			opacity: s,
			transform: `translate(${interpolate(s, [0, 1], [x, 0])}px, ${interpolate(s, [0, 1], [y, 0])}px)`,
		}}>
			{children}
		</div>
	);
};

/* ── Animated arrow (left→right horizontal) ─────────── */
const FlowArrow: React.FC<{ at: number; color?: string }> = ({ at, color = COLORS.accent }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const p = spring({ frame: frame - at, fps, config: { damping: 16, stiffness: 110 } });
	const w = 60;
	return (
		<svg width={w} height={24} style={{ overflow: 'visible', flexShrink: 0 }}>
			<defs>
				<marker id={`arr-${color.replace('#','')}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
					<path d="M 0 0 L 6 3 L 0 6 z" fill={color} />
				</marker>
			</defs>
			<line
				x1={0} y1={12}
				x2={w * p} y2={12}
				stroke={color} strokeWidth={2} strokeLinecap="round"
				markerEnd={p > 0.8 ? `url(#arr-${color.replace('#','')})` : undefined}
				style={{ filter: `drop-shadow(0 0 4px ${color}88)` }}
			/>
		</svg>
	);
};

/* ── Query row (numbered, sequential) ───────────────── */
const QueryRow: React.FC<{
	num: number;
	sql: string;
	label: string;
	at: number;
	color?: string;
}> = ({ num, sql, label, at, color = COLORS.warning }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const s = spring({ frame: frame - at, fps, config: { damping: 13, stiffness: 110 } });
	return (
		<div style={{
			opacity: s,
			transform: `translateX(${interpolate(s, [0, 1], [60, 0])}px)`,
			display: 'flex', alignItems: 'center', gap: 14,
		}}>
			{/* Number badge */}
			<div style={{
				width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
				background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
				fontFamily: 'Inter', fontWeight: 900, fontSize: 13, color: '#0d1219',
				boxShadow: `0 0 12px ${color}88`,
			}}>{num}</div>

			{/* Query card */}
			<div style={{
				flex: 1, background: 'rgba(15,23,42,0.8)',
				border: `1px solid ${color}30`, borderLeft: `3px solid ${color}`,
				borderRadius: 10, padding: '10px 16px',
				backdropFilter: 'blur(8px)',
			}}>
				<div style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: 1, marginBottom: 4, textTransform: 'uppercase' }}>{label}</div>
				<div style={{ fontSize: 12, fontFamily: 'monospace', color: COLORS.ink, lineHeight: 1.4 }}>{sql}</div>
			</div>
		</div>
	);
};

/* ════════════════════════════════════════════════════════ */
export const QueryProblem: React.FC = () => {
	const { fps } = useVideoConfig();
	const frame = useCurrentFrame();

	const steps = [
		{ frame: 0,        text: 'Client Sends Request...' },
		{ frame: fps * 1.5,text: 'API Fires Query 1...' },
		{ frame: fps * 3,  text: 'Query 2...' },
		{ frame: fps * 4.5,text: 'Query 3...' },
		{ frame: fps * 6,  text: 'Query 4...' },
		{ frame: fps * 8,  text: 'N+1 Problem!' },
	];
	const current = [...steps].reverse().find(s => frame >= s.frame) || steps[0];

	const showWarning = spring({ frame: frame - fps * 8, fps, config: { damping: 12, stiffness: 120 } });

	return (
		<AbsoluteFill style={{ background: GRADIENTS.bg }}>
			<AbsoluteFill style={{ padding: '20px' }}>
				<div style={glassBg}>

					{/* ── Progress chip ───────────── */}
					<div style={{
						position: 'absolute', top: 28, left: 30, zIndex: 100,
						background: 'rgba(15,23,42,0.65)', padding: '10px 18px',
						borderRadius: 12, border: '1px solid rgba(255,23,68,0.25)',
						backdropFilter: 'blur(14px)', boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
						display: 'flex', alignItems: 'center', gap: 10,
					}}>
						<div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.danger, boxShadow: `0 0 8px ${COLORS.danger}` }} />
						<span style={{ fontSize: 12, fontWeight: 700, color: COLORS.ink, fontFamily: 'Inter', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
							{current.text}
						</span>
					</div>

					{/* ── Headline ────────────────── */}
					<div style={{ position: 'absolute', top: 86, left: 50, right: 50 }}>
						<Appear at={0} y={-15}>
							<h2 style={{ color: COLORS.warning, fontFamily: 'Inter', fontSize: 28, margin: 0, fontWeight: 900 }}>
								The Read Amplification Problem
							</h2>
							<p style={{ color: COLORS.muted, fontFamily: 'Inter', fontSize: 14, margin: '8px 0 0', lineHeight: 1.6 }}>
								One API request triggers <em>multiple sequential database queries</em> — one per aggregate count.
							</p>
						</Appear>
					</div>

					{/* ── Left column: Client request ── */}
					<div style={{ position: 'absolute', top: 195, left: 50, width: 310 }}>
						<Appear at={fps * 0.3} x={-30} y={0}>
							{/* Client App label */}
							<div style={{
								background: 'rgba(15,23,42,0.85)', border: `1px solid ${COLORS.accent}44`,
								borderRadius: 14, overflow: 'hidden', fontFamily: 'Inter',
								boxShadow: `0 8px 28px rgba(0,0,0,0.5), 0 0 20px ${COLORS.accent}14`,
							}}>
								<div style={{
									background: `linear-gradient(90deg, ${COLORS.accent}28, transparent)`,
									borderBottom: `1px solid ${COLORS.accent}44`,
									padding: '12px 18px', fontWeight: 800, fontSize: 14,
									letterSpacing: '1px', color: COLORS.accent,
									display: 'flex', alignItems: 'center', gap: 10,
								}}>
									<span style={{ fontSize: 20 }}>📱</span> Client Request
								</div>

								{/* Method line */}
								<div style={{ padding: '14px 18px 0', fontSize: 13, fontFamily: 'monospace', color: COLORS.success }}>
									GET /api/projects/proj-1
								</div>

								{/* Expected fields */}
								<div style={{ padding: '10px 18px 14px' }}>
									<div style={{ fontSize: 11, fontWeight: 700, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
										Response expects:
									</div>
									{[
										{ field: 'id, name, description', color: COLORS.ink },
										{ field: 'members_count', color: COLORS.warning },
										{ field: 'tasks_count', color: COLORS.warning },
										{ field: 'teams_count', color: COLORS.warning },
									].map((item, i) => (
										<div key={i} style={{
											display: 'flex', alignItems: 'center', gap: 8,
											padding: '4px 0',
											borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.04)' : 'none',
										}}>
											<div style={{ width: 5, height: 5, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
											<span style={{ fontSize: 12, fontFamily: 'monospace', color: item.color }}>{item.field}</span>
										</div>
									))}
								</div>
							</div>

							{/* Note below */}
							<div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(255,23,68,0.08)', border: '1px solid rgba(255,23,68,0.2)', borderRadius: 10, fontSize: 12, color: COLORS.muted, fontFamily: 'Inter', lineHeight: 1.6 }}>
								The aggregate counts (<span style={{ color: COLORS.warning }}>members_count</span>, <span style={{ color: COLORS.warning }}>tasks_count</span>, <span style={{ color: COLORS.warning }}>teams_count</span>) are <strong style={{ color: COLORS.danger }}>not stored</strong> anywhere — so the API must compute them.
							</div>
						</Appear>
					</div>

					{/* ── Center arrow ────────────── */}
					<div style={{ position: 'absolute', top: 256, left: 375, display: 'flex', alignItems: 'center' }}>
						<FlowArrow at={fps * 1} color={COLORS.accent} />
					</div>

					{/* ── Right column: Queries ──── */}
					<div style={{ position: 'absolute', top: 195, left: 455, right: 50, display: 'flex', flexDirection: 'column', gap: 14 }}>
						<QueryRow num={1} label="Project Info" sql="SELECT * FROM project WHERE id = ?" at={fps * 1.5} color={COLORS.accent3} />
						<QueryRow num={2} label="Members Count" sql="SELECT COUNT(*) FROM project_member WHERE fk_project_id = ?" at={fps * 3} color={COLORS.warning} />
						<QueryRow num={3} label="Teams Count" sql="SELECT COUNT(*) FROM project_team WHERE fk_project_id = ?" at={fps * 4.5} color={COLORS.warning} />
						<QueryRow num={4} label="Tasks Count" sql="SELECT COUNT(*) FROM project_task WHERE fk_project_id = ?" at={fps * 6} color={COLORS.warning} />
					</div>

					{/* ── Warning banner ───────────── */}
					<div style={{
						position: 'absolute', bottom: 30, left: 50, right: 50,
						opacity: showWarning,
						transform: `translateY(${interpolate(showWarning, [0, 1], [40, 0])}px)`,
						display: 'flex', justifyContent: 'center', zIndex: 30,
					}}>
						<div style={{
							background: 'rgba(255,23,68,0.15)', border: `2px solid ${COLORS.danger}`,
							color: COLORS.ink, padding: '14px 32px', borderRadius: 12,
							fontSize: 17, fontWeight: 800, fontFamily: 'Inter',
							boxShadow: `0 0 40px rgba(255,23,68,0.4)`, backdropFilter: 'blur(10px)',
							letterSpacing: '0.5px',
						}}>
							🚨 &nbsp;4 database queries per single project request — Read Amplification
						</div>
					</div>

				</div>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
