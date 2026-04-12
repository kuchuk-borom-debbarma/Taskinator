import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Users, Layout, Clock, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';

interface Project {
  id: string;
  name: string;
  creator?: { username: string };
  description?: string;
  memberCount?: number;
}

interface ProjectDashboardProps {
  projects: Project[];
  onSelectProject: (id: string) => void;
  onCreateProject: () => void;
}

const ProjectCard: React.FC<{ project: Project; onClick: () => void }> = ({ project, onClick }) => {
  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group cursor-pointer relative glass p-6 rounded-[32px] border border-white/5 hover:border-primary/20 transition-all duration-300 flex flex-col justify-between h-[220px]"
    >
      <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="p-2 bg-primary/10 rounded-full text-primary">
          <ChevronRight size={16} />
        </div>
      </div>

      <div className="space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-indigo-500/10 flex items-center justify-center border border-white/5 shadow-inner">
          <Layout size={24} className="text-primary" />
        </div>
        
        <div>
          <h3 className="text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
            {project.name}
          </h3>
          <p className="text-xs text-muted-foreground/60 mt-1 line-clamp-2 leading-relaxed">
            {project.description || 'Global workspace for distributed engineering and agile coordination.'}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        <div className="flex items-center gap-2">
           <div className="flex -space-x-2">
              {[1, 2].map((i) => (
                <div key={i} className="w-6 h-6 rounded-full border-2 border-[#0d0d0d] bg-secondary flex items-center justify-center text-[8px] font-bold">
                  {project.creator?.username?.substring(0, 1).toUpperCase() || 'U'}
                </div>
              ))}
           </div>
           <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">
             {project.memberCount || 2} Members
           </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground/30 capitalize">
          <Clock size={12} />
          Active
        </div>
      </div>
    </motion.div>
  );
};

export const ProjectDashboard: React.FC<ProjectDashboardProps> = ({
  projects,
  onSelectProject,
  onCreateProject,
}) => {
  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-10 py-12 overflow-y-auto custom-scrollbar">
      <header className="mb-12 flex items-end justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/40">
            Welcome back.
          </h1>
          <p className="text-sm text-muted-foreground/60 font-medium tracking-wide">
            You have <span className="text-primary">{projects.length}</span> active workspaces under surveillance.
          </p>
        </div>
        
        <button
          onClick={onCreateProject}
          className="flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-white text-background text-[13px] font-bold hover:bg-white/90 transition-all shadow-2xl shadow-white/10 active:scale-95"
        >
          <Plus size={18} strokeWidth={2.5} />
          Forge Project
        </button>
      </header>

      {projects.length === 0 ? (
        <div className="h-[400px] flex flex-col items-center justify-center rounded-[48px] border-2 border-dashed border-white/5 bg-white/[0.01]">
           <div className="w-20 h-20 rounded-3xl bg-primary/5 flex items-center justify-center mb-6">
              <Layout size={32} className="text-primary opacity-20" />
           </div>
           <h2 className="text-xl font-bold">No active repositories</h2>
           <p className="text-sm text-muted-foreground/40 mt-2 mb-8 max-w-xs text-center">
             Create your first top-level workspace to begin high-performance orchestration.
           </p>
           <button
              onClick={onCreateProject}
              className="px-8 py-3 rounded-2xl bg-primary text-white text-sm font-bold hover:bg-indigo-500 transition-all"
           >
              Create Repository
           </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => onSelectProject(project.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
