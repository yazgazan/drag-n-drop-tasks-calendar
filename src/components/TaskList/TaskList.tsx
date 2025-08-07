import React from 'react';
import { Task, TodoistProject } from '../../types/task';
import TaskItem from './TaskItem';
import ProjectManager from './ProjectManager';
import ProjectCreator from './ProjectCreator';

interface TaskListProps {
  tasks: Task[];
  projects: TodoistProject[];
  onDragStart: (e: React.DragEvent<HTMLDivElement>, task: Task) => void;
  onDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnter?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void;
  onTaskClick?: (task: Task) => void;
  onCreateTask?: (projectName: string) => void;
  onCreateProject?: (name: string) => Promise<void>;
  onRenameProject?: (projectId: string, newName: string) => Promise<void>;
}

const TaskList: React.FC<TaskListProps> = ({ 
  tasks,
  projects,
  onDragStart, 
  onDragEnd, 
  onDragOver, 
  onDragEnter, 
  onDragLeave, 
  onDrop,
  onTaskClick,
  onCreateTask,
  onCreateProject,
  onRenameProject
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

  // Create a comprehensive list of all projects (both with and without tasks)
  const allProjectNames = new Set<string>();
  
  // Add projects that have tasks
  Object.keys(groupedTasks).forEach(name => allProjectNames.add(name));
  
  // Add all projects from the projects list, ensuring Inbox is included
  projects.forEach(project => {
    if (project.is_inbox_project) {
      allProjectNames.add('Inbox');
    } else {
      allProjectNames.add(project.name);
    }
  });

  // Sort project names: Inbox first, then projects with tasks, then projects without tasks
  const sortedProjectNames = Array.from(allProjectNames).sort((a, b) => {
    // Always put Inbox first
    if (a === 'Inbox') return -1;
    if (b === 'Inbox') return 1;
    
    // Check if projects have unscheduled tasks
    const aHasTasks = groupedTasks[a]?.length > 0;
    const bHasTasks = groupedTasks[b]?.length > 0;
    
    // If one has tasks and the other doesn't, prioritize the one with tasks
    if (aHasTasks && !bHasTasks) return -1;
    if (!aHasTasks && bHasTasks) return 1;
    
    // If both have tasks or both don't have tasks, sort alphabetically
    return a.localeCompare(b);
  });

  // Ensure each project has an entry in groupedTasks (even if empty)
  sortedProjectNames.forEach(projectName => {
    if (!groupedTasks[projectName]) {
      groupedTasks[projectName] = [];
    }
  });

  // Helper function to find project by name
  const findProjectByName = (projectName: string): TodoistProject | undefined => {
    if (projectName === 'Inbox') {
      return projects.find(p => p.is_inbox_project);
    }
    return projects.find(p => p.name === projectName);
  };

  return (
    <div className="sidebar">
      <h2>📋 Tasks</h2>
      
      {onCreateProject && (
        <ProjectCreator onCreateProject={onCreateProject} />
      )}
      
      <div 
        id="task-list"
        className="unscheduled-drop-zone"
        onDragOver={onDragOver}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {sortedProjectNames.map((projectName) => {
          const project = findProjectByName(projectName);
          return (
            <div key={projectName} className="project-group">
              <div className="project-header">
                {onRenameProject ? (
                  <ProjectManager
                    projectName={projectName}
                    project={project}
                    onCreateProject={onCreateProject!}
                    onRenameProject={onRenameProject}
                  />
                ) : (
                  <span className="project-name"># {projectName}</span>
                )}
                {onCreateTask && (
                  <button 
                    className="add-task-btn"
                    onClick={() => onCreateTask(projectName)}
                    title={`Add task to ${projectName}`}
                  >
                    +
                  </button>
                )}
              </div>
              <div className="project-tasks">
                {groupedTasks[projectName].length > 0 ? (
                  groupedTasks[projectName].map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onDragStart={onDragStart}
                      onDragEnd={onDragEnd}
                      onClick={onTaskClick}
                    />
                  ))
                ) : (
                  <div className="empty-project">
                    No unscheduled tasks
                  </div>
                )}
              </div>
            </div>
          );
        })}
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