import React from 'react';
import type { Project } from '../types';
import { Folder, Plus, LogOut, Hash, LayoutDashboard, Settings } from 'lucide-react';
import { cn } from '../utils/cn';

interface ProjectSidebarProps {
    projects: Project[];
    username: string;
    onLogout: () => void;
    selectedProjectId?: string;
    onSelectProject: (id: string) => void;
    onCreateProject: () => void;
}

export const ProjectSidebar: React.FC<ProjectSidebarProps> = ({
    projects,
    username,
    onLogout,
    selectedProjectId,
    onSelectProject,
    onCreateProject,
}) => {
    return (
        <div className="w-60 border-r border-border h-full flex flex-col bg-[#0d0d0d] text-foreground shrink-0 select-none">
            {/* Logo/Header */}
            <div className="h-14 flex items-center px-4 border-b border-border/50">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                        <Hash size={14} className="text-white" />
                    </div>
                    <span className="font-bold text-sm tracking-tight">Taskinator</span>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-6">
                {/* Navigation Group */}
                <div className="px-3 space-y-1">
                    <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all">
                        <LayoutDashboard size={14} />
                        Dashboard
                    </button>
                    <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all">
                        <Settings size={14} />
                        Settings
                    </button>
                </div>

                {/* Projects Group */}
                <div className="space-y-1">
                    <div className="px-5 flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Projects</span>
                        <button 
                            onClick={onCreateProject}
                            className="p-0.5 hover:bg-secondary rounded transition-colors text-muted-foreground hover:text-foreground"
                        >
                            <Plus size={12} />
                        </button>
                    </div>
                    
                    <div className="space-y-4">
                        {/* Owned Section */}
                        <div className="space-y-0.5">
                            <div className="px-5 py-1 text-[9px] font-semibold text-muted-foreground/50 uppercase tracking-widest">Owned</div>
                            <div className="px-3 space-y-0.5">
                                {projects.filter(p => p.isOwner).map((project) => (
                                    <button
                                        key={project.id}
                                        onClick={() => onSelectProject(project.id)}
                                        className={cn(
                                            "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] transition-all group",
                                            selectedProjectId === project.id 
                                                ? "bg-primary/10 text-primary" 
                                                : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                                        )}
                                    >
                                        <Folder size={14} className={cn(
                                            selectedProjectId === project.id ? "text-primary" : "text-muted-foreground"
                                        )} />
                                        <span className="truncate flex-1 text-left">{project.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Joined Section */}
                        {projects.some(p => !p.isOwner) && (
                            <div className="space-y-0.5">
                                <div className="px-5 py-1 text-[9px] font-semibold text-muted-foreground/50 uppercase tracking-widest">Part Of</div>
                                <div className="px-3 space-y-0.5">
                                    {projects.filter(p => !p.isOwner).map((project) => (
                                        <button
                                            key={project.id}
                                            onClick={() => onSelectProject(project.id)}
                                            className={cn(
                                                "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] transition-all group",
                                                selectedProjectId === project.id 
                                                    ? "bg-primary/10 text-primary" 
                                                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                                            )}
                                        >
                                            <Folder size={14} className={cn(
                                                selectedProjectId === project.id ? "text-primary" : "text-muted-foreground"
                                            )} />
                                            <span className="truncate flex-1 text-left">{project.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {/* User Profile Section */}
            <div className="p-3 border-t border-border/50 bg-[#0a0a0a]">
                <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/20 border border-border/30">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <div className="w-7 h-7 shrink-0 rounded bg-accent flex items-center justify-center text-[10px] font-bold text-accent-foreground border border-white/10">
                            {username.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[12px] font-semibold truncate leading-none">{username}</span>
                            <span className="text-[10px] text-muted-foreground truncate">Free Plan</span>
                        </div>
                    </div>
                    <button 
                        onClick={onLogout}
                        className="p-1.5 hover:bg-red-500/10 rounded text-muted-foreground hover:text-red-500 transition-colors"
                        title="Logout"
                    >
                        <LogOut size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};
