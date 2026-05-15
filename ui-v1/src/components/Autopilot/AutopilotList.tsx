import React from 'react';
import { motion } from 'framer-motion';
import type { AutopilotItem } from '../../api/interfaces/AutopilotAPI';
import { AutopilotCard } from './AutopilotCard';

interface AutopilotListProps {
  autopilots: AutopilotItem[];
  onCardClick?: (autopilot: AutopilotItem) => void;
  onToggle?: (id: string, isActive: boolean) => void;
}

// ─── Animation Variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      damping: 15,
      stiffness: 100,
    },
  },
};

export const AutopilotList: React.FC<AutopilotListProps> = ({
  autopilots,
  onCardClick,
  onToggle,
}) => {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
    >
      {autopilots.map((autopilot) => (
        <motion.div key={autopilot.id} variants={itemVariants}>
          <AutopilotCard
            autopilot={autopilot}
            onClick={() => onCardClick?.(autopilot)}
            onToggle={onToggle}
          />
        </motion.div>
      ))}
    </motion.div>
  );
};
