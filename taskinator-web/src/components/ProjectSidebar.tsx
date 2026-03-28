import React from 'react';
import type { Project } from '../types';
import { Folder, Plus, ChevronRight } from 'lucide-react';
import { cn } from '../utils/cn';

interface ProjectSidebarProps {
    projects: Project[];
    userId: string;
    onUserIdChange: (id: string) => void;
    selectedProjectId?: string;
    onSelectProject: (id: string) => void;
    onCreateProject: () => void;
}

export const ProjectSidebar: React.FC<ProjectSidebarProps> = ({
    projects,
    userId,
    onUserIdChange,
    selectedProjectId,
    onSelectProject,
    onCreateProject,
}) => {
    return (
        <div className="w-64 border-r border-border h-full flex flex-col bg-background text-foreground">
            <div className="p-4 flex items-center justify-between">
                <h1 className="text-sm font-semibold tracking-tight uppercase text-muted">Projects</h1>
                <button 
                    onClick={onCreateProject}
                    className="p-1 hover:bg-secondary rounded-md transition-colors"
                >
                    <Plus size={16} />
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-2">
                {projects.map((project) => (
                    <button
                        key={project.id}
                        onClick={() => onSelectProject(project.id)}
                        className={cn(
                            "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-all group",
                            selectedProjectId === project.id 
                                ? "bg-secondary text-primary shadow-sm" 
                                : "text-muted hover:text-foreground hover:bg-secondary/50"
                        )}
                    >
                        <Folder size={16} className={cn(
                            selectedProjectId === project.id ? "text-primary" : "text-muted group-hover:text-foreground"
                        )} />
                        <span className="truncate flex-1 text-left">{project.name}</span>
                        {selectedProjectId === project.id && <ChevronRight size={14} />}
                    </button>
                ))}
            </div>
            
            <div className="p-4 border-t border-border space-y-2">
                <div className="px-2">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Impersonate User</label>
                    <input 
                        type="text" 
                        value={userId}
                        onChange={(e) => onUserIdChange(e.target.value)}
                        className="w-full bg-secondary/50 border border-border rounded px-2 py-1 text-xs outline-none focus:border-primary transition-colors"
                        placeholder="Type userId..."
                        autoComplete="off"
                        data-1p-ignore
                        data-lpignore="true"
                    />
                </div>
                <div className="flex items-center gap-2 px-2">
                    <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-[10px] font-bold">
                        {userId.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="text-xs font-medium text-muted truncate">{userId}</span>
                </div>
            </div>
        </div>
    );
};
