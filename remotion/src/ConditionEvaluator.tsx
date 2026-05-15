import React from 'react';
import { AbsoluteFill, Sequence, useVideoConfig, useCurrentFrame, spring } from 'remotion';
import { COLORS, GRADIENTS } from './components/Nodes';
import { TitleCard } from './components/TitleCard';

const F  = (s: number) => 30 * s;
const SP = (f: number, d: number, fps: number) => spring({ frame: f - d, fps, config: { damping: 15, stiffness: 80 } });

/* ── Shell ── */
const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
	<AbsoluteFill style={{ background: GRADIENTS.bg }}>
		<AbsoluteFill style={{ padding: 30 }}>
			<div style={{ 
				flex: 1, position: 'relative', overflow: 'hidden',
				background: 'rgba(15, 23, 42, 0.3)', backdropFilter: 'blur(50px)',
				borderRadius: 30, border: '1.5px solid rgba(255, 255, 255, 0.08)',
				boxShadow: '0 50px 120px rgba(0, 0, 0, 0.7)' 
			}}>
				{children}
			</div>
		</AbsoluteFill>
	</AbsoluteFill>
);

/* ── Boolean Tree Node ── */
const TreeNode: React.FC<{ label: string; operator?: boolean; top: number; left: number; delay: number; state: 'pending' | 'true' | 'false' }> = ({ label, operator = false, top, left, delay, state }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const s = SP(f, delay, fps);

	let statusColor = COLORS.muted;
	let statusText = '🕒 PENDING';
	if (state === 'true') { statusColor = COLORS.success; statusText = '✅ TRUE'; }
	if (state === 'false') { statusColor = COLORS.danger; statusText = '❌ FALSE'; }

	const borderClr = operator ? 'rgba(0, 229, 255, 0.4)' : 'rgba(255, 255, 255, 0.1)';
	const displayBorder = state !== 'pending' ? `${statusColor}cc` : borderClr;

	return (
		<div style={{
			position: 'absolute', top, left, width: 240, transform: `translate(-50%, -50%) scale(${s})`, opacity: s,
			background: operator ? 'rgba(0, 229, 255, 0.08)' : 'rgba(15, 23, 42, 0.9)',
			border: `2px solid ${displayBorder}`, borderRadius: 16, padding: 18, textAlign: 'center', zIndex: 20,
			boxShadow: state !== 'pending' ? `0 0 30px ${statusColor}22` : '0 8px 32px rgba(0,0,0,0.4)',
			backdropFilter: 'blur(10px)', transition: 'all 0.3s ease'
		}}>
			{operator && <div style={{ fontSize: 10, fontWeight: 900, color: COLORS.accent, letterSpacing: 2, marginBottom: 4 }}>LOGIC OPERATOR</div>}
			<div style={{ fontSize: 15, fontWeight: 800, color: COLORS.ink, fontFamily: 'Inter' }}>{label}</div>
			<div style={{ fontSize: 9, fontWeight: 900, color: statusColor, fontFamily: 'monospace', marginTop: 8, letterSpacing: 0.5, transition: 'color 0.3s' }}>
				{statusText}
			</div>
		</div>
	);
};

/* ── Tree Connector Path ── */
const TreeLink: React.FC<{ x1: number; y1: number; x2: number; y2: number; delay: number; state: 'pending' | 'true' | 'false' }> = ({ x1, y1, x2, y2, delay, state }) => {
	const f = useCurrentFrame(); const { fps } = useVideoConfig();
	const p = spring({ frame: f - delay, fps, config: { damping: 22, stiffness: 60 } });
	
	const midY = y1 + (y2 - y1) / 2;
	const path = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
	const dx = x2 - x1; const dy = y2 - y1;
	const len = Math.sqrt(dx * dx + dy * dy) * 1.2;
	const dash = len * (1 - p);

	let color = '#475569'; // Default gray-slate
	if (state === 'true') color = COLORS.success;
	if (state === 'false') color = COLORS.danger;

	return (
		<svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none', zIndex: 10 }}>
			<path d={path} fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="2" />
			<path
				d={path} fill="none" stroke={color} strokeWidth="3"
				strokeDasharray={len} strokeDashoffset={dash} strokeLinecap="round"
				style={{ filter: state !== 'pending' ? `drop-shadow(0 0 4px ${color}aa)` : 'none', transition: 'stroke 0.4s, filter 0.4s' }}
			/>
		</svg>
	);
};

/* ── Evaluator Slide ── */
const TreeSlide: React.FC = () => {
	const f = useCurrentFrame();

	// Grid Coordinates
	const nodes = {
		root: { x: 610, y: 160 },
		leftB: { x: 320, y: 340 },
		rightB: { x: 900, y: 340 },
		rightSubA: { x: 750, y: 520 },
		rightSubB: { x: 1050, y: 520 }
	};

	// Timing timeline keys (Wave sequences)
	const tInNodes = F(1.5);
	
	const tEvalSubA = F(5);     // Condition 2 -> False (Red)
	const tEvalSubB = F(7.5);   // Condition 3 -> True (Green)
	const tEvalRightB = F(10);  // OR evaluated -> True (Green)
	
	const tEvalLeftB = F(12.5); // Condition 1 -> True (Green)
	
	const tEvalRoot = F(15);    // Root AND -> True (Green)

	// State maps based on current frame
	const sSubA: 'pending'|'true'|'false' = f > tEvalSubA ? 'false' : 'pending';
	const sSubB: 'pending'|'true'|'false' = f > tEvalSubB ? 'true' : 'pending';
	const sRightB: 'pending'|'true'|'false' = f > tEvalRightB ? 'true' : 'pending';
	const sLeftB: 'pending'|'true'|'false' = f > tEvalLeftB ? 'true' : 'pending';
	const sRoot: 'pending'|'true'|'false' = f > tEvalRoot ? 'true' : 'pending';

	return (
		<Shell>
			{/* Header */}
			<div style={{ position: 'absolute', top: 40, left: 50 }}>
				<div style={{ fontSize: 12, fontWeight: 800, color: COLORS.accent, letterSpacing: 2 }}>BOOLEAN LOGIC EVALUATION</div>
				<div style={{ fontSize: 32, fontWeight: 900, color: COLORS.ink, fontFamily: 'Inter', marginTop: 4 }}>Condition Evaluation Tree</div>
				<div style={{ fontSize: 14, color: COLORS.muted, fontFamily: 'Inter', marginTop: 4, maxWidth: 600 }}>
					Live evaluation of recursive logic branches dynamically determines action execution with minimal latency.
				</div>
			</div>

			{/* Tree Connectors */}
			{/* Root -> Branches */}
			<TreeLink x1={nodes.root.x} y1={nodes.root.y} x2={nodes.leftB.x} y2={nodes.leftB.y} delay={tInNodes + 20} state={sLeftB} />
			<TreeLink x1={nodes.root.x} y1={nodes.root.y} x2={nodes.rightB.x} y2={nodes.rightB.y} delay={tInNodes + 25} state={sRightB} />
			{/* Right Branch -> Sub Leafs */}
			<TreeLink x1={nodes.rightB.x} y1={nodes.rightB.y} x2={nodes.rightSubA.x} y2={nodes.rightSubA.y} delay={tInNodes + 30} state={sSubA} />
			<TreeLink x1={nodes.rightB.x} y1={nodes.rightB.y} x2={nodes.rightSubB.x} y2={nodes.rightSubB.y} delay={tInNodes + 35} state={sSubB} />

			{/* Base Tree Nodes */}
			<TreeNode label="AND OPERATOR" operator top={nodes.root.y} left={nodes.root.x} delay={tInNodes} state={sRoot} />
			
			<TreeNode label="PROJECT IS ACTIVE" top={nodes.leftB.y} left={nodes.leftB.x} delay={tInNodes + 10} state={sLeftB} />
			<TreeNode label="OR OPERATOR" operator top={nodes.rightB.y} left={nodes.rightB.x} delay={tInNodes + 15} state={sRightB} />

			<TreeNode label="TASKS OPEN > 50" top={nodes.rightSubA.y} left={nodes.rightSubA.x} delay={tInNodes + 25} state={sSubA} />
			<TreeNode label="USER IS ADMIN" top={nodes.rightSubB.y} left={nodes.rightSubB.x} delay={tInNodes + 30} state={sSubB} />

			{/* Dynamic Explainer Overlay */}
			{f > tEvalRoot && (
				<div style={{
					position: 'absolute', bottom: 40, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 30
				}}>
					<div style={{
						background: `${COLORS.success}15`, border: `2px solid ${COLORS.success}`, borderRadius: 16,
						padding: '16px 40px', textAlign: 'center', color: COLORS.success, fontWeight: 800,
						fontSize: 14, fontFamily: 'Inter', boxShadow: `0 0 40px ${COLORS.success}22`, backdropFilter: 'blur(10px)'
					}}>
						⚡ LOGIC RESOLVED: Node evaluated successfully. Proceeding to Action Chain pipeline...
					</div>
				</div>
			)}
		</Shell>
	);
};

/* ── Root Sequence ── */
export const ConditionEvaluator: React.FC = () => {
	const { fps } = useVideoConfig();
	return (
		<AbsoluteFill style={{ background: GRADIENTS.bg }}>
			<Sequence from={0} durationInFrames={fps * 3} layout="none">
				<TitleCard title="Visual Boolean Evaluator" />
			</Sequence>
			<Sequence from={fps * 3} durationInFrames={fps * 37} layout="none">
				<TreeSlide />
			</Sequence>
		</AbsoluteFill>
	);
};
