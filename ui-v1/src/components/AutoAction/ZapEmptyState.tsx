import React from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

export const ZapEmptyState: React.FC<{ onCreateClick?: () => void }> = ({ onCreateClick }) => {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <motion.div
        animate={{ scale: [1, 1.18, 1] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-app-accent/10"
      >
        <Zap size={36} className="text-app-accent" />
      </motion.div>

      <h3 className="mb-2 text-xl font-semibold tracking-tight text-app-ink">
        No automations yet
      </h3>
      <p className="mb-8 max-w-xs text-sm leading-relaxed text-app-muted">
        Build your first autoAction to automatically update tasks, assign teams, and more — without lifting a finger.
      </p>

      <button
        onClick={onCreateClick}
        disabled={!onCreateClick}
        className="inline-flex items-center gap-2 rounded-full bg-app-accent px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-app-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Zap size={16} />
        Create AutoAction
      </button>
    </div>
  );
};
