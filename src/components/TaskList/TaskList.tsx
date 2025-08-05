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
  onTaskClick?: (task: Task) => void;
}

const TaskList: React.FC<TaskListProps> = ({ 
  tasks, 
  onDragStart, 
  onDragEnd, 
  onDragOver, 
  onDragEnter, 
  onDragLeave, 
  onDrop,
  onTaskClick 
}) => {
  // Group tasks by project
  const groupedTasks = tasks.reduce((groups, task) => {
    const projectName = task.project_name || 'Inbox';
    if (!groups[projectName]) {
      groups[projectName] = [];
    }
    groups[projectName].push(task);
    return groups;
  }, {} as Record<string, Task[]>);

  // Sort project names, putting Inbox first
  const sortedProjectNames = Object.keys(groupedTasks).sort((a, b) => {
    if (a === 'Inbox') return -1;
    if (b === 'Inbox') return 1;
    return a.localeCompare(b);
  });

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
        {sortedProjectNames.map((projectName) => (
          <div key={projectName} className="project-group">
            <h3 className="project-header">
              # {projectName}
            </h3>
            <div className="project-tasks">
              {groupedTasks[projectName].map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  onClick={onTaskClick}
                />
              ))}
            </div>
          </div>
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