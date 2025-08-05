import React from 'react';
import { ScheduledTask as ScheduledTaskType } from '../../types/task';

interface ScheduledTaskProps {
  task: ScheduledTaskType;
  onClick: (task: ScheduledTaskType) => void;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>, task: ScheduledTaskType) => void;
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
}

const ScheduledTask: React.FC<ScheduledTaskProps> = ({ task, onClick, onDragStart, onDragEnd }) => {
  return (
    <div
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