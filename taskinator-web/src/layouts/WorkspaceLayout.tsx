import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface WorkspaceLayoutProps {
  sidebar: React.ReactNode;
  header: React.ReactNode;
  children: React.ReactNode;
  sidePanel?: React.ReactNode;
  isFocused?: boolean;
}

export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({ 
  sidebar, 
  header, 
  children, 
  sidePanel 
}) => {
  return (
    <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden font-sans selection:bg-primary/30">
      {/* Sidebar Rail */}
      <aside className="z-30 h-full">
        {sidebar}
      </aside>

      {/* Main Workspace */}
      <div className="relative flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        {/* Header / Command Center */}
        <header className="z-20 h-14 shrink-0 glass-nav">
          {header}
        </header>

        {/* Content Area */}
        <main className="relative flex flex-1 min-h-0 overflow-hidden">
          <div className={cn(
            "flex-1 min-w-0 flex flex-col overflow-hidden",
            isFocused && "max-w-7xl mx-auto w-full"
          )}>
            {children}
          </div>

          {/* Right Side Panel (e.g., Teams/Details) */}
          <AnimatePresence>
            {sidePanel && !isFocused && (
              <motion.aside
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                className="w-[380px] shrink-0 border-l border-white/5 bg-white/[0.01] backdrop-blur-3xl hidden 2xl:block"
              >
                {sidePanel}
              </motion.aside>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};
