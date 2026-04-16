import React, { useMemo } from 'react';
import { getHashColor } from '../utils/color';
import { cn } from '../utils/cn';

interface RelationshipPillProps {
  label: string;
  className?: string;
  onClick?: () => void;
  size?: 'sm' | 'md';
}

/**
 * A premium pill component for relationship labels.
 * Automatically generates a consistent color based on the label text.
 */
export const RelationshipPill: React.FC<RelationshipPillProps> = ({ 
  label, 
  className, 
  onClick,
  size = 'md'
}) => {
  // Truncate to 50 characters as per backend rules
  const displayLabel = label.length > 50 ? label.substring(0, 47) + '...' : label;
  
  const colors = useMemo(() => getHashColor(label), [label]);

  return (
    <button
      onClick={onClick}
      style={{ 
        backgroundColor: colors.bg,
        borderColor: colors.border,
        color: colors.css,
        boxShadow: `0 0 10px ${colors.bg}`
      }}
      className={cn(
        "px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all duration-300",
        "hover:scale-105 active:scale-95 whitespace-nowrap",
        size === 'sm' && "px-1.5 py-0.5 text-[8px]",
        onClick ? "cursor-pointer" : "cursor-default",
        className
      )}
    >
      {displayLabel}
    </button>
  );
};
