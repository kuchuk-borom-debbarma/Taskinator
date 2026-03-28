import React from 'react';
import { Project } from '../types';
import { Folder, Plus, ChevronRight } from 'lucide-react';
import { cn } from '../utils/cn';

interface ProjectSidebarProps {
    projects: Project[];
    selectedProjectId?: string;
    onSelectProject: (id: string) => void;
    onCreateProject: () => void;
}

export const ProjectSidebar: React.FC<ProjectSidebarProps> = ({
    projects,
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
            
            <div className="p-4 border-t border-border">
                <div className="flex items-center gap-2 px-2">
                    <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-[10px] font-bold">
                        JD
                    </div>
                    <span className="text-xs font-medium text-muted">User: demo-user</span>
                </div>
            </div>
        </div>
    );
};
