import React, { useMemo } from 'react';
import type { Task } from '../types';
import { CheckCircle2, Circle, Plus, ChevronDown, ChevronRight, Trash2, Hash, User } from 'lucide-react';
import { cn } from '../utils/cn';

interface TaskTreeProps {
    tasks: Task[];
    onToggleStatus: (task: Task) => void;
    onCreateSubtask: (parentId: string) => void;
    onClickTask: (task: Task) => void;
    onDeleteTask: (taskId: string) => void;
}

interface TreeItemProps {
    task: Task;
    children?: Task[];
    depth: number;
    onToggleStatus: (task: Task) => void;
    onCreateSubtask: (parentId: string) => void;
    onClickTask: (task: Task) => void;
    onDeleteTask: (taskId: string) => void;
    treeMap: Record<string, Task[]>;
}

const formatDate = (dateStr: string) => {
    try {
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat('en-US', { 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).format(date);
    } catch {
        return '---';
    }
};

const TreeItem: React.FC<TreeItemProps> = ({ 
    task, children, depth, onToggleStatus, onCreateSubtask, onClickTask, onDeleteTask, treeMap
}) => {
    const [isExpanded, setIsExpanded] = React.useState(true);
    const hasChildren = children && children.length > 0;

    return (
        <div className="flex flex-col">
            <div 
                className={cn(
                    "flex items-center gap-4 group py-2 px-3 hover:bg-secondary/40 rounded-lg transition-all cursor-pointer border border-transparent hover:border-border/40 min-w-max sm:min-w-0",
                    task.status === 'DONE' && "opacity-60"
                )}
                style={{ marginLeft: `${depth * 20}px` }}
                onClick={() => onClickTask(task)}
            >
                {/* Title & Chevron */}
                <div className="flex items-center gap-3 w-[300px] shrink-0 min-w-0">
                    <div className="flex items-center justify-center w-5 h-5 shrink-0">
                        {hasChildren && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} 
                                className="text-muted-foreground hover:text-foreground p-0.5 rounded hover:bg-secondary transition-colors"
                            >
                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                        )}
                    </div>
                    
                    <button 
                        onClick={(e) => { e.stopPropagation(); onToggleStatus(task); }} 
                        className={cn(
                            "shrink-0 transition-colors",
                            task.status === 'DONE' ? "text-primary" : "text-muted-foreground hover:text-primary"
                        )}
                    >
                        {task.status === 'DONE' ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                    </button>
                    
                    <span className={cn(
                        "text-[13px] font-semibold truncate",
                        task.status === 'DONE' && "line-through text-muted-foreground font-normal"
                    )}>
                        {task.title}
                    </span>
                </div>

                {/* Team ID */}
                <div className="w-32 shrink-0 hidden md:block">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                        <div className="w-4 h-4 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                            <Hash size={10} className="text-blue-500" />
                        </div>
                        <span className="text-[11px] text-muted-foreground truncate font-medium">
                            {task.teamId ? `Team ${task.teamId.substring(0, 4)}` : '---'}
                        </span>
                    </div>
                </div>

                {/* Member ID */}
                <div className="w-32 shrink-0 hidden lg:block">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                        <div className="w-4 h-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                            <User size={10} className="text-emerald-500" />
                        </div>
                        <span className="text-[11px] text-muted-foreground truncate font-medium">
                            {task.memberId || 'Unassigned'}
                        </span>
                    </div>
                </div>

                {/* Status */}
                <div className="w-24 shrink-0 hidden sm:block">
                    <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full border tracking-wide uppercase",
                        task.status === 'DONE' 
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                            : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    )}>
                        {task.status}
                    </span>
                </div>

                {/* Timestamps */}
                <div className="flex items-center gap-6 shrink-0 ml-auto mr-4 hidden xl:flex">
                    <div className="flex flex-col items-end w-24">
                        <span className="text-[9px] uppercase font-bold text-muted-foreground/50 tracking-tighter">Created</span>
                        <span className="text-[10px] text-muted-foreground/80 font-medium tabular-nums whitespace-nowrap">{formatDate(task.createdAt)}</span>
                    </div>
                    <div className="flex flex-col items-end w-24">
                        <span className="text-[9px] uppercase font-bold text-muted-foreground/50 tracking-tighter">Updated</span>
                        <span className="text-[10px] text-muted-foreground/80 font-medium tabular-nums whitespace-nowrap">{formatDate(task.updatedAt)}</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0 ml-auto sm:ml-0">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onCreateSubtask(task.id); }}
                        className="p-1.5 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground transition-colors"
                        title="Add subtask"
                    >
                        <Plus size={14} />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }}
                        className="p-1.5 hover:bg-red-500/10 rounded-md text-muted-foreground hover:text-red-500 transition-colors"
                        title="Delete task"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            {isExpanded && hasChildren && (
                <div className="flex flex-col relative before:absolute before:left-[10px] before:top-0 before:bottom-2 before:w-[1px] before:bg-border/50">
                    {children.map(child => (
                        <TreeItem 
                            key={child.id} 
                            task={child} 
                            children={treeMap[child.id]} 
                            depth={depth + 1}
                            onToggleStatus={onToggleStatus}
                            onCreateSubtask={onCreateSubtask}
                            onClickTask={onClickTask}
                            onDeleteTask={onDeleteTask}
                            treeMap={treeMap}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export const TaskTree: React.FC<TaskTreeProps> = ({ 
    tasks, onToggleStatus, onCreateSubtask, onClickTask, onDeleteTask 
}) => {
    const rootTasks = useMemo(() => {
        const treeMap: Record<string, Task[]> = {};
        const roots: Task[] = [];

        tasks.forEach(task => {
            if (task.parentTaskId) {
                if (!treeMap[task.parentTaskId]) treeMap[task.parentTaskId] = [];
                treeMap[task.parentTaskId].push(task);
            } else {
                roots.push(task);
            }
        });

        return { roots, treeMap };
    }, [tasks]);

    if (tasks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <p className="text-sm">No tasks in this project yet.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-0.5 p-2">
            {rootTasks.roots.map(task => (
                <TreeItem 
                    key={task.id} 
                    task={task} 
                    children={rootTasks.treeMap[task.id]}
                    depth={0}
                    onToggleStatus={onToggleStatus}
                    onCreateSubtask={onCreateSubtask}
                    onClickTask={onClickTask}
                    onDeleteTask={onDeleteTask}
                    treeMap={rootTasks.treeMap}
                />
            ))}
        </div>
    );
};
