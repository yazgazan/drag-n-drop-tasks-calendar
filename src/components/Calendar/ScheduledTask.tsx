import React from 'react';
import { ScheduledTask as ScheduledTaskType } from '../../types/task';

interface ScheduledTaskProps {
  task: ScheduledTaskType;
  onClick: (task: ScheduledTaskType) => void;
}

const ScheduledTask: React.FC<ScheduledTaskProps> = ({ task, onClick }) => {
  return (
    <div
      className={`scheduled-task priority-${task.priority}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick(task);
      }}
    >
      <div className="scheduled-task-title">{task.title}</div>
      <div className="scheduled-task-time">{task.time}</div>
    </div>
  );
};

export default ScheduledTask;