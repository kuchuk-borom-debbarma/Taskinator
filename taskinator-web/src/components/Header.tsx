import React from 'react';
import { Search, Bell, Settings, ChevronRight, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

interface HeaderProps {
  projectName?: string;
  onOpenSettings: () => void;
  onOpenNotifications: () => void;
  unreadCount?: number;
}

export const Header: React.FC<HeaderProps> = ({ 
  projectName, 
  onOpenSettings, 
  onOpenNotifications, 
  unreadCount = 0 
}) => {
  return (
    <div className="h-full w-full flex items-center justify-between px-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-[13px] font-medium tracking-tight">
          <span className="text-muted-foreground/60 hover:text-foreground cursor-pointer transition-colors">Workspace</span>
          <ChevronRight size={12} className="text-muted-foreground/30" />
          <motion.span 
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            key={projectName}
            className="text-foreground font-semibold"
          >
            {projectName || 'Overview'}
          </motion.span>
          
          {projectName && (
            <button
              onClick={onOpenSettings}
              className="p-1.5 hover:bg-white/5 rounded-md text-muted-foreground/50 hover:text-foreground transition-all duration-200 ml-1 group"
            >
              <Settings size={14} className="group-hover:rotate-45 transition-transform duration-300" />
            </button>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Global Search Interface */}
        <div className="relative group hidden md:block">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors duration-200">
            <Search size={14} />
          </div>
          <input
            type="text"
            placeholder="Search anything... (⌘K)"
            className="bg-white/5 border border-white/5 focus:border-primary/30 focus:bg-white/[0.07] rounded-full py-1.5 pl-9 pr-4 text-[12px] w-72 transition-all duration-300 outline-none placeholder:text-muted-foreground/30"
          />
        </div>

        {/* Quick Automation Trigger */}
        <button className="p-2 hover:bg-white/5 rounded-full text-muted-foreground/60 hover:text-primary transition-all duration-200 hidden sm:block">
          <Zap size={18} />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={onOpenNotifications}
            className="p-2.5 hover:bg-white/5 rounded-xl text-muted-foreground/60 hover:text-foreground transition-all duration-200 relative group"
          >
            <Bell size={19} className="group-hover:scale-110 transition-transform" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-[16px] h-[16px] bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-background ring-2 ring-primary/20">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* User Mini-Avatar / Profiler */}
        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary/20 to-primary/40 p-[1px] cursor-pointer hover:ring-2 ring-primary/30 transition-all">
          <div className="h-full w-full rounded-full bg-background flex items-center justify-center overflow-hidden border border-white/10">
            <span className="text-[10px] font-bold text-primary">JD</span>
          </div>
        </div>
      </div>
    </div>
  );
};
