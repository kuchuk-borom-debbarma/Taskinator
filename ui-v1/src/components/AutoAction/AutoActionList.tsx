import React from 'react';
import { motion, type Variants } from 'framer-motion';
import type { FragmentType } from '../../gql';
import { AutoActionCard, AutoActionCardFragment } from './AutoActionCard';

interface AutoActionListProps {
  autoActions: (FragmentType<typeof AutoActionCardFragment> & { id: string })[];
  onCardClick?: (autoAction: any) => void;
  onToggle?: (id: string, version: number, isActive: boolean) => void;
  onEdit?: (autoAction: any) => void;
  onDelete?: (id: string) => void;
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

export const AutoActionList: React.FC<AutoActionListProps> = ({
  autoActions,
  onCardClick,
  onToggle,
  onEdit,
  onDelete,
}) => {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
    >
      {autoActions.map((autoAction) => (
        <motion.div key={autoAction.id} variants={itemVariants}>
          <AutoActionCard
            autoAction={autoAction}
            onClick={() => onCardClick?.(autoAction)}
            onToggle={onToggle}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </motion.div>
      ))}
    </motion.div>
  );
};
