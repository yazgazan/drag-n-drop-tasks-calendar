import React from 'react';
import { Task } from '../../types/task';

interface TaskItemProps {
  task: Task;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, task: Task) => void;
  onDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
  onClick?: (task: Task) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onDragStart, onDragEnd, onClick }) => {
  return (
    <div
      className="task-item"
      draggable
      data-task-id={task.id}
      onDragStart={(e) => onDragStart(e, task)}
      onDragEnd={onDragEnd}
      onClick={() => onClick?.(task)}
    >
      <div className={`task-priority priority-${task.priority}`}></div>
      <div className="task-content">
        <div className="task-title">{task.title}</div>
        <div className="task-description">{task.description}</div>
        <div className="task-labels">
          {task.labels.map((label, index) => (
            <span key={index} className="task-label">{label}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TaskItem;