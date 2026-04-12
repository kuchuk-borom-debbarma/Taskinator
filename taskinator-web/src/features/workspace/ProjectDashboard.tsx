import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Layout, ChevronRight, Zap, Network, Layers } from 'lucide-react';

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
            {project.description || 'No description provided.'}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        <div className="flex items-center gap-2">
           <div className="w-6 h-6 rounded-full border-2 border-[#0d0d0d] bg-secondary flex items-center justify-center text-[8px] font-bold">
             {project.creator?.username?.substring(0, 1).toUpperCase() || '?'}
           </div>
           <span className="text-[10px] font-bold text-muted-foreground/40 tracking-widest">
             Owner: {project.creator?.username || 'Unknown'}
           </span>
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
            You have <span className="text-primary">{projects.length}</span> Project{projects.length === 1 ? '' : 's'} and <span className="text-primary">12</span> Tasks.
          </p>
        </div>
        
        <button
          onClick={onCreateProject}
          className="flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-white text-background text-[13px] font-bold hover:bg-white/90 transition-all shadow-2xl shadow-white/10 active:scale-95"
        >
          <Plus size={18} strokeWidth={2.5} />
          Create Project
        </button>
      </header>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 w-full max-w-4xl mx-auto">
           {/* Hero Icon */}
           <div className="relative mb-8">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
              <div className="w-24 h-24 rounded-[32px] bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center border-4 border-background shadow-2xl relative z-10 shadow-primary/20">
                 <Layout size={40} className="text-white fill-white/10" />
              </div>
           </div>

           <h2 className="text-5xl font-black tracking-tight text-center mb-6">Unleash <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-400">Taskinator</span></h2>
           <p className="text-lg text-muted-foreground/80 text-center max-w-2xl leading-relaxed mb-16">
             The ultimate task management suite built for high-performing teams. Transform chaotic workloads into clear, trackable steps.
           </p>

           <button
              onClick={onCreateProject}
              className="px-10 py-4 mb-20 rounded-full bg-primary text-white text-[15px] font-black hover:bg-indigo-500 transition-all shadow-[0_10px_40px_rgba(99,102,241,0.3)] hover:-translate-y-1 hover:scale-105 active:scale-95 flex items-center gap-3"
           >
              <Plus size={20} strokeWidth={3} />
              Forge Your First Project
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

      {/* Feature Overview (Always visible) */}
      <div className="mt-20 pt-16 border-t border-white/5">
        <h3 className="text-2xl font-black tracking-tight mb-8">Taskinator Advantage</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full pb-16">
           <div className="glass p-8 rounded-3xl border border-white/5 flex flex-col hover:border-primary/20 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-5">
                 <Layers size={24} />
              </div>
              <h3 className="font-bold text-[15px] mb-2">Clear Organization</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">Break down massive projects into focused, bite-sized tasks with an elegant interface. Eliminate dashboard clutter.</p>
           </div>

           <div className="glass p-8 rounded-3xl border border-white/5 flex flex-col hover:border-primary/20 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center mb-5">
                 <Zap size={24} />
              </div>
              <h3 className="font-bold text-[15px] mb-2">Smart Automations</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">Automate workflows using task triggers. Ping external <b>Webhooks</b>, <b>Block Parent Tasks</b> until done, or auto-notify teams.</p>
           </div>

           <div className="glass p-8 rounded-3xl border border-white/5 flex flex-col hover:border-primary/20 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-5">
                 <Layout size={24} />
              </div>
              <h3 className="font-bold text-[15px] mb-2">Real-Time Sync</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">Work seamlessly alongside your team. Every task status update synchronizes instantly to everyone's screen.</p>
           </div>

           <div className="glass p-8 rounded-3xl border border-white/5 flex flex-col hover:border-primary/20 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-5">
                 <Network size={24} />
              </div>
              <h3 className="font-bold text-[15px] mb-2">Team Coordination</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">Group members together into dedicated teams to easily delegate objectives and distribute workforce effectively.</p>
           </div>
        </div>
      </div>
    </div>
  );
};
