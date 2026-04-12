import React from 'react';
import { Bell, Settings, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface HeaderProps {
  projectName?: string;
  onOpenSettings: () => void;
  onOpenNotifications: () => void;
  unreadCount?: number;
  children?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ 
  projectName, 
  onOpenSettings, 
  onOpenNotifications, 
  unreadCount = 0,
  children
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
          
          {/* Notification Panel Overlay */}
          {children}
        </div>
      </div>
    </div>
  );
};
