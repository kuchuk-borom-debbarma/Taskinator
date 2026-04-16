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
        boxShadow: `0 0 15px ${colors.bg}`
      }}
      className={cn(
        "px-3 py-1.5 rounded-2xl border text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-500",
        "hover:scale-110 active:scale-95 whitespace-nowrap italic",
        size === 'sm' && "px-2 py-1 text-[7px]",
        onClick ? "cursor-pointer" : "cursor-default",
        className
      )}
    >
      {displayLabel}
    </button>
  );
};
