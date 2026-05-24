import React from "react";
import { useChapterFrame as useCurrentFrame } from "../ChapterFrameContext";
import { COLORS, FONTS, fadeIn, slideUp, ease, progress, float, scaleIn } from "../design";

// Animated service node
const ServiceNode: React.FC<{
  label: string; icon: string; color: string;
  x: number; y: number; frame: number; startFrame: number;
  isHighlighted?: boolean;
}> = ({ label, icon, color, x, y, frame, startFrame, isHighlighted }) => {
  const op = fadeIn(frame, startFrame, 20);
  const sc = scaleIn(frame, startFrame, 22);
  const f = float(frame + startFrame * 2, 6, 0.6);

  return (
    <div style={{
      position: 'absolute',
      left: x + '%', top: y + f + '%',
      transform: `translate(-50%, -50%) scale(${sc})`,
      opacity: op,
      textAlign: 'center',
      zIndex: isHighlighted ? 2 : 1,
    }}>
      <div style={{
        width: 80, height: 80,
        background: isHighlighted
          ? `linear-gradient(135deg, ${color}30, ${color}10)`
          : 'rgba(255,255,255,0.04)',
        border: `2px solid ${isHighlighted ? color : COLORS.border}`,
        borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 32,
        boxShadow: isHighlighted ? `0 0 30px ${color}40, 0 0 60px ${color}20` : 'none',
        margin: '0 auto 8px',
      }}>{icon}</div>
      <div style={{
        fontSize: 12, fontWeight: 700,
        color: isHighlighted ? color : COLORS.textMuted,
        background: isHighlighted ? `${color}15` : 'transparent',
        border: isHighlighted ? `1px solid ${color}30` : 'none',
        borderRadius: 6, padding: isHighlighted ? '3px 10px' : 0,
      }}>{label}</div>
    </div>
  );
};

// Animated event propagation line
const EventLine: React.FC<{
  x1: string; y1: string; x2: string; y2: string;
  color: string; frame: number; startFrame: number;
  label?: string; isDashed?: boolean;
}> = ({ x1, y1, x2, y2, color, frame, startFrame, label, isDashed }) => {
  const t = progress(frame, startFrame, startFrame + 40, ease.outCubic);
  if (t <= 0) return null;

  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
      <defs>
        <marker id={`arrow-${startFrame}`} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill={color} opacity={0.7} />
        </marker>
      </defs>
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={color}
        strokeWidth="2"
        strokeDasharray={isDashed ? "6 4" : "none"}
        strokeDashoffset={isDashed ? `${(1 - t) * 100}` : undefined}
        markerEnd={`url(#arrow-${startFrame})`}
        opacity={0.6 * t}
        style={{ pathLength: 1 }}
      />
      {label && t > 0.7 && (
        <text
          x={`${(parseFloat(x1) + parseFloat(x2)) / 2}%`}
          y={`${(parseFloat(y1) + parseFloat(y2)) / 2}%`}
          fill={color}
          fontSize="10"
          textAnchor="middle"
          dy="-6"
          opacity={0.8 * t}
        >{label}</text>
      )}
    </svg>
  );
};

// Event timeline item
const EventStep: React.FC<{
  step: number; icon: string; title: string; detail: string;
  color: string; frame: number; startFrame: number;
  isParallel?: boolean;
}> = ({ step, icon, title, detail, color, frame, startFrame, isParallel }) => {
  const op = fadeIn(frame, startFrame, 20);
  const x = progress(frame, startFrame, startFrame + 25, ease.outCubic);
  return (
    <div style={{
      opacity: op,
      transform: `translateX(${(1 - x) * -30}px)`,
      display: 'flex', gap: 14, alignItems: 'flex-start',
      marginBottom: 14,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
        background: `${color}20`,
        border: `2px solid ${color}50`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16,
        boxShadow: `0 0 12px ${color}30`,
      }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: isParallel ? COLORS.green : COLORS.text }}>{title}</div>
          {isParallel && (
            <div style={{
              fontSize: 9, color: COLORS.green, fontWeight: 700,
              background: `${COLORS.green}15`, border: `1px solid ${COLORS.green}30`,
              borderRadius: 999, padding: '1px 8px', letterSpacing: 1,
            }}>PARALLEL</div>
          )}
        </div>
        <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.5 }}>{detail}</div>
      </div>
    </div>
  );
};

export const ChoreographyScene: React.FC = () => {
  const frame = useCurrentFrame();
  const overallFade = frame > 1450 ? 1 - progress(frame, 1450, 1500, ease.inOutCubic) : 1;

  // Simulate deletion event flowing
  const deletionFired = frame > 200;
  const membersReacting = frame > 280;
  const teamsReacting = frame > 310;
  const tasksReacting = frame > 340;

  return (
    <div style={{
      width: '100%', height: '100%',
      background: `radial-gradient(ellipse at 50% 20%, #0e1628 0%, ${COLORS.bg} 70%)`,
      fontFamily: FONTS.sans, overflow: 'hidden',
      position: 'relative', opacity: overallFade,
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(rgba(99,102,241,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.025) 1px, transparent 1px)`,
        backgroundSize: '55px 55px',
      }} />

      <div style={{ display: 'flex', height: '100%' }}>
        {/* Left: visual diagram */}
        <div style={{ width: '50%', position: 'relative' }}>
          {/* Chapter header */}
          <div style={{
            position: 'absolute', top: 40, left: 55,
            opacity: fadeIn(frame, 5, 20), zIndex: 3,
          }}>
            <div style={{ fontSize: 12, color: COLORS.accent, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
              Chapter 5 — Event Choreography
            </div>
            <div style={{ fontSize: 36, fontWeight: 900, color: COLORS.text, letterSpacing: -1, lineHeight: 1.1 }}>
              Broadcast &<br />
              <span style={{ color: COLORS.accent }}>React Pattern</span>
            </div>
          </div>

          {/* Diagram */}
          <div style={{ position: 'absolute', top: 160, left: 0, right: 0, bottom: 0 }}>
            {/* Project service (producer) */}
            <ServiceNode
              label="ProjectService" icon="📁" color={COLORS.accent}
              x={50} y={18} frame={frame} startFrame={20}
              isHighlighted={deletionFired}
            />

            {/* Kafka */}
            <ServiceNode
              label="project-events" icon="⚡" color={COLORS.kafka}
              x={50} y={42} frame={frame} startFrame={60}
              isHighlighted={deletionFired}
            />

            {/* Consumers */}
            <ServiceNode
              label="member-cleanup-group" icon="👥" color={COLORS.cyan}
              x={15} y={70} frame={frame} startFrame={100}
              isHighlighted={membersReacting}
            />
            <ServiceNode
              label="team-cleanup-group" icon="🏷️" color={COLORS.orange}
              x={50} y={70} frame={frame} startFrame={115}
              isHighlighted={teamsReacting}
            />
            <ServiceNode
              label="task-cleanup-group" icon="✅" color={COLORS.green}
              x={85} y={70} frame={frame} startFrame={130}
              isHighlighted={tasksReacting}
            />

            {/* Lines */}
            {frame > 70 && (
              <EventLine x1="50%" y1="27%" x2="50%" y2="38%" color={COLORS.accent} frame={frame} startFrame={70} label="PROJECT_DELETED" />
            )}
            {membersReacting && (
              <EventLine x1="43%" y1="46%" x2="17%" y2="60%" color={COLORS.cyan} frame={frame} startFrame={280} isDashed />
            )}
            {teamsReacting && (
              <EventLine x1="50%" y1="46%" x2="50%" y2="60%" color={COLORS.orange} frame={frame} startFrame={310} isDashed />
            )}
            {tasksReacting && (
              <EventLine x1="57%" y1="46%" x2="83%" y2="60%" color={COLORS.green} frame={frame} startFrame={340} isDashed />
            )}

            {/* Result labels */}
            {frame > 500 && (
              <>
                {[
                  { x: '15%', y: '88%', label: 'DELETE project_members', color: COLORS.cyan },
                  { x: '50%', y: '88%', label: 'DELETE project_teams', color: COLORS.orange },
                  { x: '85%', y: '88%', label: 'DELETE project_tasks', color: COLORS.green },
                ].map((r, i) => {
                  const rOp = fadeIn(frame, 500 + i * 20, 15);
                  return (
                    <div key={i} style={{
                      position: 'absolute', left: r.x, top: r.y,
                      transform: 'translateX(-50%)',
                      opacity: rOp,
                      background: `${r.color}12`,
                      border: `1px solid ${r.color}30`,
                      borderRadius: 6, padding: '3px 8px',
                      fontSize: 9, color: r.color, fontFamily: FONTS.mono,
                      textAlign: 'center',
                    }}>{r.label}</div>
                  );
                })}
              </>
            )}

            {/* Parallelism arrow */}
            {frame > 600 && (
              <div style={{
                position: 'absolute', left: '5%', top: '73%',
                right: '5%',
                opacity: fadeIn(frame, 600, 20),
              }}>
                <div style={{
                  height: 2,
                  background: `linear-gradient(90deg, ${COLORS.green}, ${COLORS.cyan}, ${COLORS.orange})`,
                  borderRadius: 1,
                  boxShadow: `0 0 8px ${COLORS.accent}40`,
                }} />
                <div style={{
                  textAlign: 'center', marginTop: 6,
                  fontSize: 11, color: COLORS.green, fontWeight: 700,
                  letterSpacing: 1,
                }}>⚡ ALL THREE RUN IN PARALLEL — No dependency chain</div>
              </div>
            )}
          </div>
        </div>

        {/* Right: event flow explanation */}
        <div style={{ width: '50%', padding: '45px 55px 40px 20px', display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'hidden' }}>
          <div style={{ opacity: fadeIn(frame, 15, 20) }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: COLORS.text, marginBottom: 6 }}>
              Why Choreography over Orchestration?
            </div>
            <div style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.6 }}>
              When a project is deleted, the Project service broadcasts one event.
              Every affected domain reacts independently — no coordinator, no coupling.
            </div>
          </div>

          {/* Event steps */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <EventStep step={1} icon="📢" title="Project service fires PROJECT_DELETED"
              detail="Single Kafka message published with projectId. That's all it knows. That's all it should know."
              color={COLORS.accent} frame={frame} startFrame={30} />
            <EventStep step={2} icon="👥" title="member-cleanup-group reacts"
              detail="Independently deletes all rows from project_members. Located in Team domain — owns its own cleanup."
              color={COLORS.cyan} frame={frame} startFrame={100} isParallel />
            <EventStep step={3} icon="🏷️" title="team-cleanup-group reacts"
              detail="Deletes all teams for the project. Doesn't wait for member cleanup. No dependency."
              color={COLORS.orange} frame={frame} startFrame={140} isParallel />
            <EventStep step={4} icon="✅" title="task-cleanup-group reacts"
              detail="Deletes all tasks for the project. Zero coupling with the above. Each service owns its data."
              color={COLORS.green} frame={frame} startFrame={180} isParallel />
          </div>

          {/* Benefits */}
          {frame > 550 && (
            <div style={{
              opacity: fadeIn(frame, 550, 20),
              background: COLORS.bgCard,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 14, padding: '18px 20px',
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, marginBottom: 14 }}>
                🎯 Why this is better
              </div>
              {[
                { icon: '⚡', label: 'Parallelism', text: 'All 3 cleanups run simultaneously vs. sequential cascade' },
                { icon: '🛡️', label: 'Resilience', text: 'Task DB down? Member + Team cleanup still succeed independently' },
                { icon: '🚫', label: 'No Event Storms', text: 'One PROJECT_DELETED vs. thousands of cascading TASK_DELETED events' },
                { icon: '🔌', label: 'Extensible', text: 'New Notification service? Just add a consumer group — zero code changes to existing services' },
              ].map((b, i) => {
                const bOp = fadeIn(frame, 560 + i * 15, 15);
                return (
                  <div key={i} style={{
                    opacity: bOp, display: 'flex', gap: 10,
                    alignItems: 'flex-start', marginBottom: 10,
                  }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{b.icon}</span>
                    <div>
                      <span style={{ color: COLORS.text, fontWeight: 600, fontSize: 13 }}>{b.label}: </span>
                      <span style={{ color: COLORS.textMuted, fontSize: 12 }}>{b.text}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Surgical vs Global callout */}
          {frame > 900 && (
            <div style={{
              opacity: fadeIn(frame, 900, 20),
              background: `linear-gradient(135deg, ${COLORS.purple}12, ${COLORS.accent}08)`,
              border: `1px solid ${COLORS.purple}25`,
              borderRadius: 12, padding: '14px 18px',
              fontSize: 13, color: COLORS.textMuted, lineHeight: 1.6,
            }}>
              <strong style={{ color: COLORS.purple }}>Hybrid strategy:</strong>{" "}
              Global cleanup (broadcast for PROJECT_DELETED) + Surgical cleanup (targeted events for individual Team/Member deletions).
              Best of both worlds — bulk parallelism vs. precise day-to-day updates.
            </div>
          )}
        </div>
      </div>

      {/* Subtitle */}
      <div style={{
        position: 'absolute', bottom: 20, left: '50%',
        transform: 'translateX(-50%)',
        opacity: fadeIn(frame, 10, 20),
      }}>
        <div style={{
          background: 'rgba(0,0,0,0.6)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 999, padding: '8px 24px',
          fontSize: 15, color: COLORS.text,
          backdropFilter: 'blur(12px)',
        }}>
          Project service just broadcasts. It doesn't care who's listening. Three independent consumer groups clean up in parallel.
        </div>
      </div>
    </div>
  );
};
