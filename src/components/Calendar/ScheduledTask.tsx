import React, { useEffect, useRef } from 'react';
import { ScheduledTask as ScheduledTaskType } from '../../types/task';
import { addTouchDragSupport } from '../../utils/touchDragUtils';

interface ScheduledTaskProps {
  task: ScheduledTaskType;
  onClick: (task: ScheduledTaskType) => void;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>, task: ScheduledTaskType) => void;
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
}

const ScheduledTask: React.FC<ScheduledTaskProps> = ({ task, onClick, onDragStart, onDragEnd }) => {
  const taskRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = taskRef.current;
    if (!element || !onDragStart) return;

    const cleanup = addTouchDragSupport(element, task, {
      onDragStart: (draggedTask) => {
        // Create a synthetic drag event for compatibility
        const syntheticEvent = {
          preventDefault: () => {},
          stopPropagation: () => {},
          dataTransfer: {
            setData: () => {},
            effectAllowed: 'move' as const,
          }
        } as unknown as React.DragEvent<HTMLDivElement>;
        onDragStart(syntheticEvent, draggedTask as ScheduledTaskType);
      },
      onDragEnd: () => {
        // Create a synthetic drag event for compatibility
        const syntheticEvent = {
          preventDefault: () => {},
          stopPropagation: () => {},
          target: element,
          currentTarget: element,
        } as unknown as React.DragEvent<HTMLDivElement>;
        onDragEnd?.(syntheticEvent);
      }
    });

    return cleanup;
  }, [task, onDragStart, onDragEnd]);

  return (
    <div
      ref={taskRef}
      className={`scheduled-task priority-${task.priority}`}
      draggable={!!onDragStart}
      onClick={(e) => {
        e.stopPropagation();
        onClick(task);
      }}
      onDragStart={onDragStart ? (e) => onDragStart(e, task) : undefined}
      onDragEnd={onDragEnd}
    >
      <div className="scheduled-task-title">{task.title}</div>
      <div className="scheduled-task-time">{task.time}</div>
    </div>
  );
};

export default ScheduledTask;