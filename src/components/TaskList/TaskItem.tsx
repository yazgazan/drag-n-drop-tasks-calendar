import React, { useEffect, useRef } from 'react';
import { Task } from '../../types/task';
import { addTouchDragSupport } from '../../utils/touchDragUtils';

interface TaskItemProps {
  task: Task;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, task: Task) => void;
  onDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
  onClick?: (task: Task) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onDragStart, onDragEnd, onClick }) => {
  const taskRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = taskRef.current;
    if (!element) return;

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
        } as React.DragEvent<HTMLDivElement>;
        onDragStart(syntheticEvent, draggedTask as Task);
      },
      onDragEnd: () => {
        // Create a synthetic drag event for compatibility
        const syntheticEvent = {
          preventDefault: () => {},
          stopPropagation: () => {},
        } as React.DragEvent<HTMLDivElement>;
        onDragEnd(syntheticEvent);
      }
    });

    return cleanup;
  }, [task, onDragStart, onDragEnd]);

  return (
    <div
      ref={taskRef}
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