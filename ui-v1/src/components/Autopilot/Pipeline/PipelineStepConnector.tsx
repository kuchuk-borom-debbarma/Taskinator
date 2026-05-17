import React from 'react';
import { ArrowDown, AlertCircle } from 'lucide-react';
import type { PipelineStep } from '../../../gql/graphql';

interface PipelineStepConnectorProps {
  previousStep: PipelineStep;
  nextStep: PipelineStep;
}

export const PipelineStepConnector: React.FC<PipelineStepConnectorProps> = ({
  previousStep,
  nextStep: _nextStep,
}) => {
  const isHaltOnFalse = previousStep.__typename === 'AutopilotCondition';

  return (
    <div className="flex flex-col items-center py-1 group">
      <div className="h-3 w-px bg-app-line/60" />
      
      <div className="relative flex items-center justify-center">
        <ArrowDown size={12} className="text-app-muted/60" />
        
        {isHaltOnFalse && (
          <div className="absolute left-4 flex items-center gap-1.5 whitespace-nowrap rounded-md bg-app-warning/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-app-warning/70 opacity-0 transition-opacity group-hover:opacity-100">
            <AlertCircle size={10} />
            Halt if false
          </div>
        )}
      </div>

      <div className="h-3 w-px bg-app-line/60" />
    </div>
  );
};
