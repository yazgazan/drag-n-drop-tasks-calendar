import React, { useState, useRef, useEffect } from 'react';
import { TodoistProject } from '../../types/task';

interface ProjectManagerProps {
  projectName: string;
  project?: TodoistProject;
  onCreateProject: (name: string, color?: string) => Promise<void>;
  onRenameProject: (projectId: string, newName: string) => Promise<void>;
}

const ProjectManager: React.FC<ProjectManagerProps> = ({
  projectName,
  project,
  onCreateProject,
  onRenameProject
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState(projectName);
  const [showActions, setShowActions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    if (projectName === 'Inbox') {
      return; // Can't rename Inbox
    }
    setNewName(projectName);
    setIsEditing(true);
    setShowActions(false);
  };

  const handleSaveEdit = async () => {
    if (!project || newName.trim() === '' || newName === projectName) {
      setIsEditing(false);
      setNewName(projectName);
      return;
    }

    setIsLoading(true);
    try {
      await onRenameProject(project.id, newName.trim());
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to rename project:', error);
      alert('Failed to rename project. Please try again.');
      setNewName(projectName);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setNewName(projectName);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleCreateProject = async () => {
    if (newName.trim() === '') {
      return;
    }

    setIsLoading(true);
    try {
      await onCreateProject(newName.trim());
      setIsCreating(false);
      setNewName('');
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Failed to create project. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };


  if (isCreating) {
    return (
      <div className="project-creation">
        <input
          ref={inputRef}
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={handleKeyPress}
          onBlur={() => {
            if (newName.trim()) {
              handleCreateProject();
            } else {
              setIsCreating(false);
            }
          }}
          placeholder="New project name..."
          className="project-name-input"
          disabled={isLoading}
        />
      </div>
    );
  }

  return (
    <div className="project-manager">
      <div 
        className="project-header-content"
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyPress}
            onBlur={handleSaveEdit}
            className="project-name-input"
            disabled={isLoading}
          />
        ) : (
          <span className="project-name"># {projectName}</span>
        )}
        
        {showActions && !isEditing && projectName !== 'Inbox' && (
          <div className="project-actions">
            <button
              className="project-action-btn"
              onClick={handleStartEdit}
              title="Rename project"
              disabled={isLoading}
            >
              ✏️
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectManager;