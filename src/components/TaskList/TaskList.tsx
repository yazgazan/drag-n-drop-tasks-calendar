import React from 'react';
import { Task } from '../../types/task';
import TaskItem from './TaskItem';

interface TaskListProps {
  tasks: Task[];
  onDragStart: (e: React.DragEvent<HTMLDivElement>, task: Task) => void;
  onDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
}

const TaskList: React.FC<TaskListProps> = ({ tasks, onDragStart, onDragEnd }) => {
  return (
    <div className="sidebar">
      <h2>📋 Unscheduled Tasks</h2>
      <div id="task-list">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))}
      </div>
    </div>
  );
};

export default TaskList;