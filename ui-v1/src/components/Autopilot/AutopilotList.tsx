import React from 'react';
import { motion, type Variants } from 'framer-motion';
import type { FragmentType } from '../../gql';
import { AutopilotCard, AutopilotCardFragment } from './AutopilotCard';

interface AutopilotListProps {
  autopilots: (FragmentType<typeof AutopilotCardFragment> & { id: string })[];
  onCardClick?: (autopilot: any) => void;
  onToggle?: (id: string, isActive: boolean) => void;
}

// ─── Animation Variants ───────────────────────────────────────────────────────

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      damping: 15,
      stiffness: 100,
    } as any, // Cast to any to avoid strict transition type mismatch in v12
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
