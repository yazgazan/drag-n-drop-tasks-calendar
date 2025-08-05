import React from 'react';
import { Task } from '../../types/task';
import TaskItem from './TaskItem';

interface TaskListProps {
  tasks: Task[];
  onDragStart: (e: React.DragEvent<HTMLDivElement>, task: Task) => void;
  onDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnter?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void;
}

const TaskList: React.FC<TaskListProps> = ({ 
  tasks, 
  onDragStart, 
  onDragEnd, 
  onDragOver, 
  onDragEnter, 
  onDragLeave, 
  onDrop 
}) => {
  return (
    <div className="sidebar">
      <h2>📋 Unscheduled Tasks</h2>
      <div 
        id="task-list"
        className="unscheduled-drop-zone"
        onDragOver={onDragOver}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))}
        {tasks.length === 0 && (
          <div className="empty-drop-zone">
            Drop scheduled tasks here to unschedule them
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskList;