import React from 'react';
import type { AutopilotItem } from '../../api/interfaces/AutopilotAPI';
import { AutopilotCard } from './AutopilotCard';

interface AutopilotListProps {
  autopilots: AutopilotItem[];
  onCardClick?: (autopilot: AutopilotItem) => void;
}

export const AutopilotList: React.FC<AutopilotListProps> = ({ autopilots, onCardClick }) => {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {autopilots.map((autopilot) => (
        <AutopilotCard
          key={autopilot.id}
          autopilot={autopilot}
          onClick={() => onCardClick?.(autopilot)}
        />
      ))}
    </div>
  );
};
