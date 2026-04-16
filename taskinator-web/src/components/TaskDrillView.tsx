import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  Circle, 
  ChevronRight, 
  ChevronLeft,
  MoreVertical, 
  Plus, 
  Share2,
  Users2, 
  User, 
  Target,
  ArrowRight
} from 'lucide-react';
import { cn } from '../utils/cn';
import { RelationshipPill } from './RelationshipPill';
import { RelationshipLines } from './RelationshipLines';
import type { Task } from '../types';

interface TaskDrillViewProps {
  tasks: Task[];
  focusedTaskId: string | null;
  onFocusTask: (taskId: string | null) => void;
  onOpenDetails: (taskId: string) => void;
  onToggleStatus: (task: Task) => void;
  onCreateTask: () => void;
}

import { MindMapTaskNode } from './MindMapTaskNode';

export const TaskDrillView: React.FC<TaskDrillViewProps> = ({
  tasks,
  focusedTaskId,
  onFocusTask,
  onOpenDetails,
  onToggleStatus,
  onCreateTask
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [nodePositions, setNodePositions] = useState<{ [key: string]: { x: number, y: number } }>({});
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  
  // Center of the 4000x4000 canvas
  const CANVAS_SIZE = 4000;
  const cx = CANVAS_SIZE / 2;
  const cy = CANVAS_SIZE / 2;

  // 1. Resolve Links
  const focalTask = useMemo(() => tasks.find(t => t.id === focusedTaskId) || null, [tasks, focusedTaskId]);
  
  const allConnections = useMemo(() => {
    if (!focusedTaskId) return [];
    const conns: any[] = [];
    const seenLinks = new Set<string>();

    // Inbound: Tasks linking to focus
    tasks.forEach(t => {
        t.links?.forEach(l => {
            if (l.toTaskId === focusedTaskId && !seenLinks.has(l.id)) {
                conns.push({ id: l.id, type: l.type, sourceId: t.id, targetId: focusedTaskId, direction: 'in' });
                seenLinks.add(l.id);
            }
        });
    });

    // Outbound: Focus linking to tasks
    focalTask?.links?.forEach(l => {
        if (!seenLinks.has(l.id)) {
            conns.push({ id: l.id, type: l.type, sourceId: focusedTaskId, targetId: l.toTaskId, direction: 'out' });
            seenLinks.add(l.id);
        }
    });

    return conns;
  }, [tasks, focusedTaskId, focalTask]);

  const inboundNeighbors = useMemo(() => {
    const list: any[] = [];
    const seen = new Set<string>();
    allConnections.filter(c => c.direction === 'in').forEach(c => {
        if (!seen.has(c.sourceId) && c.sourceId !== focusedTaskId) {
            const t = tasks.find(task => task.id === c.sourceId);
            if (t) {
                list.push(t);
                seen.add(t.id);
            }
        }
    });
    return list;
  }, [allConnections, tasks, focusedTaskId]);

  const outboundNeighbors = useMemo(() => {
    const list: any[] = [];
    const seen = new Set<string>();
    allConnections.filter(c => c.direction === 'out').forEach(c => {
        if (!seen.has(c.targetId) && c.targetId !== focusedTaskId) {
            const t = tasks.find(task => task.id === c.targetId);
            if (t) {
                list.push(t);
                seen.add(t.id);
            }
        }
    });
    return list;
  }, [allConnections, tasks, focusedTaskId]);

  // 2. Initial Radial Layout & Centering Logic
  useEffect(() => {
    if (!focusedTaskId) return;

    // Reset layout around canvas center
    const newPositions: { [key: string]: { x: number, y: number } } = {};
    newPositions[focusedTaskId] = { x: cx - 150, y: cy - 60 };

    inboundNeighbors.forEach((task, index) => {
        const offset = inboundNeighbors.length > 1 ? (index - (inboundNeighbors.length - 1) / 2) : 0;
        const angle = (Math.PI * 0.5 * offset) / Math.max(inboundNeighbors.length - 1, 1) + Math.PI;
        const radius = 500;
        newPositions[task.id] = {
            x: cx + Math.cos(angle) * radius - 110,
            y: cy + Math.sin(angle) * radius - 40
        };
    });

    outboundNeighbors.forEach((task, index) => {
        const offset = outboundNeighbors.length > 1 ? (index - (outboundNeighbors.length - 1) / 2) : 0;
        const angle = (Math.PI * 0.5 * offset) / Math.max(outboundNeighbors.length - 1, 1);
        const radius = 500;
        newPositions[task.id] = {
            x: cx + Math.cos(angle) * radius - 110,
            y: cy + Math.sin(angle) * radius - 40
        };
    });

    setNodePositions(newPositions);

    // Initial Pan to Center
    if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCanvasOffset({
            x: rect.width / 2 - cx,
            y: rect.height / 2 - cy
        });
    }
  }, [focusedTaskId, inboundNeighbors.length, outboundNeighbors.length]);

  // 3. Coordinate Handling for SVG
  const connectionPaths = useMemo(() => {
    if (!focusedTaskId || !nodePositions) return [];

    return allConnections.map(conn => {
        const startNodePos = nodePositions[conn.sourceId];
        const endNodePos = nodePositions[conn.targetId];

        if (!startNodePos || !endNodePos) return null;

        // Visual offsets based on node type
        const isStartFocal = conn.sourceId === focusedTaskId;
        const isEndFocal = conn.targetId === focusedTaskId;

        return {
            id: conn.id,
            type: conn.type,
            start: { 
                x: startNodePos.x + (isStartFocal ? 300 : 220), 
                y: startNodePos.y + (isStartFocal ? 60 : 40) 
            },
            end: { 
                x: endNodePos.x + (isEndFocal ? 0 : 0), 
                y: endNodePos.y + (isEndFocal ? 60 : 40) 
            },
            direction: conn.direction
        };
    }).filter(c => !!c);
  }, [nodePositions, focusedTaskId, allConnections]);

  const handleNodeDrag = (id: string, point: { x: number, y: number }) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    // Translate screen point to lattice coordinate (compensating for pan)
    setNodePositions(prev => ({ 
        ...prev, 
        [id]: { 
            x: point.x - rect.left - canvasOffset.x - (id === focusedTaskId ? 150 : 110), 
            y: point.y - rect.top - canvasOffset.y - (id === focusedTaskId ? 60 : 40)
        } 
    }));
  };

  if (!focusedTaskId || !focalTask) {
    return (
      <div className="flex flex-col items-center justify-center h-full max-w-5xl mx-auto px-10">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
            <div className="w-24 h-24 rounded-[2rem] bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-8 text-primary shadow-2xl shadow-primary/20 animate-pulse">
                <Target size={48} />
            </div>
            <h2 className="text-4xl font-black mb-3 tracking-tighter italic">NEURAL LATTICE</h2>
            <p className="text-muted-foreground mb-12 text-lg font-medium opacity-60 italic">Synthesize your project structure into an organic mental map.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl px-4">
                {tasks.slice(0, 8).map(task => (
                    <button key={task.id} onClick={() => onFocusTask(task.id)} className="glass-card p-6 rounded-2xl border border-white/5 hover:border-primary/40 transition-all text-left group">
                        <div className="font-black text-lg truncate group-hover:text-primary transition-colors tracking-tight italic">{task.title}</div>
                        <div className="flex items-center gap-2 mt-2">
                             <div className="text-[9px] text-muted-foreground/60 uppercase font-black tracking-widest">
                                {task.links?.length || 0} Synapses Detected
                            </div>
                        </div>
                    </button>
                ))}
            </div>
            
            <button onClick={onCreateTask} className="mt-16 px-8 py-4 bg-primary text-white rounded-2xl font-black hover:scale-105 transition-all flex items-center gap-3 mx-auto shadow-xl shadow-primary/30">
                <Plus size={20} /> Initialize New Node
            </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full w-full mx-auto overflow-hidden bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.01)_0%,_transparent_70%)]">
      
      {/* Header Overlay */}
      <div className="absolute top-0 inset-x-0 flex items-center justify-between px-10 py-8 shrink-0 z-50 pointer-events-none">
         <div className="flex items-center gap-8 pointer-events-auto">
            <button onClick={() => onFocusTask(null)} className="p-3 rounded-2xl border border-white/5 glass hover:bg-white/10 text-muted-foreground transition-all">
                <ChevronLeft size={22} />
            </button>
            <div>
                <div className="text-[10px] text-primary/60 uppercase font-black tracking-[0.3em] mb-1">Neural Perspective</div>
                <h1 className="text-2xl font-black tracking-tighter italic">{focalTask.title}</h1>
            </div>
         </div>
         <div className="flex items-center gap-4 pointer-events-auto">
             <button onClick={() => onOpenDetails(focalTask.id)} className="p-3 glass rounded-2xl border border-white/5 text-muted-foreground transition-all">
                <Plus size={20} className="text-primary mr-2 inline" />
                <span className="text-[10px] font-black uppercase tracking-widest">Connect Node</span>
            </button>
         </div>
      </div>

      <div ref={containerRef} className="flex-1 relative cursor-move overflow-hidden">
        {/* Pannable Canvas */}
        <motion.div
            drag
            dragMomentum={false}
            animate={{ x: canvasOffset.x, y: canvasOffset.y }}
            onDrag={(_, info) => {
                setCanvasOffset(prev => ({
                    x: prev.x + info.delta.x,
                    y: prev.y + info.delta.y
                }));
            }}
            className="absolute top-0 left-0 w-[4000px] h-[4000px]"
        >
            <div className="relative w-full h-full bg-[radial-gradient(#ffffff05_1px,_transparent_1px)] [background-size:40px_40px]">
                {/* SVG Connections Plane */}
                <RelationshipLines connections={connectionPaths as any} />

                {/* Task Nodes */}
                <AnimatePresence>
                    {/* Neighbor Nodes (Unique List) */}
                    {[...inboundNeighbors, ...outboundNeighbors].filter((t, i, arr) => arr.findIndex(x => x.id === t.id) === i).map((task) => (
                        nodePositions[task.id] && task.id !== focusedTaskId && (
                            <MindMapTaskNode
                                key={task.id}
                                task={task}
                                onFocus={onFocusTask}
                                onToggleStatus={onToggleStatus}
                                style={{ 
                                    left: nodePositions[task.id].x, 
                                    top: nodePositions[task.id].y 
                                }}
                                onDrag={handleNodeDrag}
                            />
                        )
                    ))}

                    {/* Focal Node */}
                    {nodePositions[focusedTaskId] && (
                        <MindMapTaskNode
                            task={focalTask!}
                            isFocus
                            onFocus={onFocusTask}
                            onToggleStatus={onToggleStatus}
                            style={{ 
                                left: nodePositions[focusedTaskId].x, 
                                top: nodePositions[focusedTaskId].y 
                            }}
                            onDrag={handleNodeDrag}
                        />
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
      </div>

      {/* Control Overlay */}
      <div className="absolute bottom-8 right-10 flex flex-col gap-3 z-50">
          <div className="glass px-4 py-3 rounded-2xl border border-white/5 flex items-center gap-4 shadow-2xl">
              <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Lattice Active</span>
              </div>
              <div className="h-4 w-[1px] bg-white/10" />
              <div className="text-[10px] font-black uppercase tracking-widest opacity-40">
                  {inboundNeighbors.length + outboundNeighbors.length} Connections Traceable
              </div>
          </div>
      </div>
    </div>
  );
};
