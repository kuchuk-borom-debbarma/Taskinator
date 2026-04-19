import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, Users, FileText, Loader2 } from 'lucide-react';
import { useInfiniteQuery } from '@tanstack/react-query';

interface ExplorerItemProps {
  id: string;
  label: string;
  type: 'project' | 'team' | 'task';
  count?: number;
  onSelect?: () => void;
  renderChildren?: () => React.ReactNode;
  isExpandable?: boolean;
}

export const ExplorerItem: React.FC<ExplorerItemProps> = ({ 
  id, 
  label, 
  type, 
  count, 
  onSelect,
  renderChildren,
  isExpandable = true
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const icons = {
    project: <Folder size={16} className="text-focus-blue" />,
    team: <Users size={16} className="text-incoming" />,
    task: <FileText size={16} className="text-text-dim" />,
  };

  return (
    <div className="flex flex-col group/item mt-1">
      <div 
        className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all cursor-pointer ${
          isExpanded ? 'bg-white/[0.04]' : 'hover:bg-white/[0.03]'
        }`}
        onClick={() => {
          if (isExpandable) setIsExpanded(!isExpanded);
          if (onSelect) onSelect();
        }}
      >
        <div className="flex items-center gap-1.5 min-w-[20px]">
          {isExpandable && (
            <span className="text-text-dim/40 group-hover/item:text-text-dim transition-colors">
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="shrink-0">{icons[type]}</div>
          <span className="text-[13px] font-bold text-text-notion truncate">{label}</span>
          {count !== undefined && count > 0 && (
            <span className="text-[10px] font-black text-text-dim/40 bg-white/[0.05] px-1.5 py-0.5 rounded-md uppercase tracking-tighter shrink-0">
              {count} {type === 'project' ? 'teams' : 'tasks'}
            </span>
          )}
        </div>
      </div>

      {isExpanded && renderChildren && (
        <div className="ml-7 flex flex-col border-l border-white/5 pl-2 mt-1 animate-in slide-in-from-top-1 duration-200">
          {renderChildren()}
        </div>
      )}
    </div>
  );
};
