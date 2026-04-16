import { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';

export type TaskEdgeData = {
  label: string;
  color: string;
  labelPosition?: number; // 0.0 to 1.0 (defaults to 0.5)
  curvature?: number; // 0.0 to 1.0
  verticalOffset?: number; // Pixels to shift label vertically
};

export const TaskEdge = memo(({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style,
  markerEnd,
}: EdgeProps) => {
  const { label, color, labelPosition = 0.5, curvature = 0.5, verticalOffset = 0 } = (data || {}) as TaskEdgeData;

  const [edgePath, , labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature,
  });

  // Calculate a custom label position along the path
  // Standard getBezierPath returns the center (0.5).
  // We approximate other positions by linear interpolation for simplicity in this V1,
  // or we can just shift the labelX/labelY based on the t parameter if we had the math here.
  // For now, we will use the jittered coordinates passed from the graph layout.
  
  const customLabelX = sourceX + (targetX - sourceX) * labelPosition;
  const customLabelY = labelY + verticalOffset;

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${customLabelX}px,${customLabelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <div 
            className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white shadow-sm border border-white/20 whitespace-nowrap"
            style={{ backgroundColor: color }}
          >
            {label}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
});
