import React from 'react';
import { motion } from 'framer-motion';
import { LayoutGrid, LogOut, Hexagon, Plus } from 'lucide-react';
import { cn } from '../utils/cn';

interface Project {
  id: string;
  name: string;
}

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
    <div className="h-full w-[72px] bg-[#050505] border-r border-white-[0.03] flex flex-col items-center py-6 gap-8 shrink-0 relative z-50">
      {/* Branding */}
      <div className="relative group cursor-pointer" onClick={() => onSelectProject('')}>
        <div className="h-11 w-11 rounded-2xl bg-primary flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all duration-500 group-hover:rotate-[360deg] group-hover:scale-110">
          <Hexagon size={24} className="text-white fill-white/20" />
        </div>
        <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 px-2 py-1 bg-white text-background text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[100]">
          Nebula Core
        </div>
      </div>

      <div className="w-8 h-[1px] bg-white/5 shrink-0" />

      {/* Main Navigation Rail */}
      <nav className="flex-1 flex flex-col gap-4">
        <RailItem
          icon={<LayoutGrid size={20} />}
          label="Dashboard"
          isActive={!selectedProjectId}
          onClick={() => onSelectProject('')}
        />

        <div className="w-8 h-[1px] bg-white/5 shrink-0 my-2" />

        {/* scrollable projects list */}
        <div className="flex-1 w-full overflow-y-auto no-scrollbar flex flex-col items-center gap-4 py-2">
          {projects.map((project) => (
            <ProjectIcon
              key={project.id}
              project={project}
              isActive={selectedProjectId === project.id}
              onClick={() => onSelectProject(project.id)}
            />
          ))}
          <button 
            onClick={onCreateProject}
            className="h-12 w-12 rounded-2xl border border-dashed border-white/10 text-muted-foreground/40 hover:text-primary hover:border-primary/40 transition-all flex items-center justify-center shrink-0 group"
          >
            <Plus size={20} className="group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </nav>

      {/* Footer Actions */}
      <div className="flex flex-col gap-4 mt-auto">
        <div className="relative group">
           <div className="h-10 w-10 rounded-xl bg-secondary border border-white/5 flex items-center justify-center text-xs font-bold cursor-pointer hover:border-primary/40 transition-all">
             {username?.substring(0, 1).toUpperCase() || '?'}
           </div>
           <div className="absolute left-[calc(100%+12px)] bottom-0 px-3 py-2 bg-white text-background rounded-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-[100] shadow-2xl">
              <p className="text-[10px] font-bold whitespace-nowrap">{username || 'Guest'}</p>
              <button 
                onClick={onLogout}
                className="mt-1 flex items-center gap-1 text-[9px] text-red-500 font-bold hover:underline pointer-events-auto"
              >
                <LogOut size={10} /> Logout
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

const ProjectIcon: React.FC<{
  project: Project;
  isActive?: boolean;
  onClick: () => void;
}> = ({ project, isActive, onClick }) => {
  const initials = project.name.substring(0, 1).toUpperCase();
  
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className={cn(
          "h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-500 relative overflow-hidden shrink-0 border",
          isActive 
            ? "border-primary bg-primary/20 shadow-[0_0_20px_rgba(99,102,241,0.2)]" 
            : "border-white/5 bg-white/[0.02] hover:border-white/20 hover:bg-white/5"
        )}
      >
        <div className={cn(
          "absolute inset-0 bg-gradient-to-tr transition-opacity duration-500",
          isActive ? "from-primary/40 to-indigo-500/20 opacity-100" : "from-white/10 to-transparent opacity-0 group-hover:opacity-100"
        )} />
        <span className={cn(
          "text-[13px] font-black tracking-tight relative z-10 transition-colors duration-300",
          isActive ? "text-white" : "text-muted-foreground group-hover:text-foreground"
        )}>
          {initials}
        </span>
      </button>

      {/* Tooltip */}
      <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 px-3 py-2 bg-white text-background rounded-xl opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100 pointer-events-none z-[100] shadow-2xl border border-white/10">
        <p className="text-[11px] font-bold whitespace-nowrap">{project.name}</p>
        <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 border-y-[4px] border-y-transparent border-r-[4px] border-r-white" />
      </div>

      {/* Active Indicator Dot */}
      {isActive && (
        <motion.div 
          layoutId="project-active-dot"
          className="absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-primary rounded-r-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"
        />
      )}
    </div>
  );
};

const RailItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => {
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className={cn(
          "h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-300 relative overflow-hidden",
          isActive 
            ? "bg-primary text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]" 
            : "text-muted-foreground/40 hover:text-foreground hover:bg-white/5"
        )}
      >
        {icon}
        {isActive && !label.includes('Dashboard') && (
           <motion.div 
            layoutId="rail-active-pill"
            className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent"
          />
        )}
      </button>
      
      {/* Tooltip */}
      <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 px-3 py-2 bg-white text-background rounded-xl opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100 pointer-events-none z-[100] shadow-2xl border border-white/10">
        <p className="text-[11px] font-bold whitespace-nowrap">{label}</p>
        <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 border-y-[4px] border-y-transparent border-r-[4px] border-r-white" />
      </div>
    </div>
  );
};
