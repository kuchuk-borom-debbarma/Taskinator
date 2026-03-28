import React, { useMemo } from 'react';
import { Task } from '../types';
import { CheckCircle2, Circle, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '../utils/cn';

interface TaskTreeProps {
    tasks: Task[];
    onToggleStatus: (task: Task) => void;
    onCreateSubtask: (parentId: string) => void;
}

interface TreeItemProps {
    task: Task;
    children?: Task[];
    depth: number;
    onToggleStatus: (task: Task) => void;
    onCreateSubtask: (parentId: string) => void;
}

const TreeItem: React.FC<TreeItemProps> = ({ task, children, depth, onToggleStatus, onCreateSubtask }) => {
    const [isExpanded, setIsExpanded] = React.useState(true);
    const hasChildren = children && children.length > 0;

    return (
        <div className="flex flex-col">
            <div 
                className={cn(
                    "flex items-center gap-2 group py-1.5 px-2 hover:bg-secondary/30 rounded-md transition-all",
                    task.status === 'DONE' && "opacity-60"
                )}
                style={{ paddingLeft: `${depth * 16 + 8}px` }}
            >
                <div className="flex items-center gap-2 flex-1">
                    {hasChildren ? (
                        <button onClick={() => setIsExpanded(!isExpanded)} className="text-muted hover:text-foreground">
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                    ) : (
                        <div className="w-[14px]" />
                    )}
                    
                    <button onClick={() => onToggleStatus(task)} className="text-muted hover:text-primary transition-colors">
                        {task.status === 'DONE' ? <CheckCircle2 size={18} className="text-primary" /> : <Circle size={18} />}
                    </button>
                    
                    <div className="flex flex-col">
                        <span className={cn(
                            "text-sm font-medium",
                            task.status === 'DONE' && "line-through"
                        )}>
                            {task.title}
                        </span>
                        {task.description && (
                            <span className="text-[11px] text-muted line-clamp-1">{task.description}</span>
                        )}
                    </div>
                </div>

                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <button 
                        onClick={() => onCreateSubtask(task.id)}
                        className="p-1 hover:bg-secondary rounded-md text-muted hover:text-foreground"
                        title="Add subtask"
                    >
                        <Plus size={14} />
                    </button>
                </div>
            </div>

            {isExpanded && hasChildren && (
                <div className="flex flex-col">
                    {children.map(child => (
                        <TreeItem 
                            key={child.id} 
                            task={child} 
                            children={undefined} // Correct children will be passed by the parent TreeView
                            depth={depth + 1}
                            onToggleStatus={onToggleStatus}
                            onCreateSubtask={onCreateSubtask}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export const TaskTree: React.FC<TaskTreeProps> = ({ tasks, onToggleStatus, onCreateSubtask }) => {
    const rootTasks = useMemo(() => {
        // Build the tree structure from flat list
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

        const renderTree = (taskList: Task[], depth: number): React.ReactNode[] => {
            return taskList.map(task => (
                <TreeItem 
                    key={task.id} 
                    task={task} 
                    children={treeMap[task.id]} 
                    depth={depth}
                    onToggleStatus={onToggleStatus}
                    onCreateSubtask={onCreateSubtask}
                >
                    {treeMap[task.id] && renderTree(treeMap[task.id], depth + 1)}
                </TreeItem>
            ));
        };

        // We'll actually use a recursive component for the full tree
        return { roots, treeMap };
    }, [tasks]);

    // Recursive component to handle the mapping properly
    const RecursiveTree = ({ currentTasks, depth }: { currentTasks: Task[], depth: number }) => {
        return (
            <>
                {currentTasks.map(task => (
                    <div key={task.id}>
                        <TreeItem 
                            task={task} 
                            children={rootTasks.treeMap[task.id]}
                            depth={depth}
                            onToggleStatus={onToggleStatus}
                            onCreateSubtask={onCreateSubtask}
                        />
                        {rootTasks.treeMap[task.id] && (
                            <RecursiveTree currentTasks={rootTasks.treeMap[task.id]} depth={depth + 1} />
                        )}
                    </div>
                ))}
            </>
        );
    };

    return (
        <div className="flex flex-col gap-0.5 p-2">
            <RecursiveTree currentTasks={rootTasks.roots} depth={0} />
            
            {tasks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-muted">
                    <p className="text-sm">No tasks in this project yet.</p>
                </div>
            )}
        </div>
    );
};
