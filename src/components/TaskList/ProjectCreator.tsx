import React, { useState, useRef, useEffect } from 'react';

interface ProjectCreatorProps {
  onCreateProject: (name: string) => Promise<void>;
}


const ProjectCreator: React.FC<ProjectCreatorProps> = ({ onCreateProject }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  const handleStartCreate = () => {
    setIsCreating(true);
    setProjectName('');
  };

  const handleCreate = async () => {
    if (projectName.trim() === '') {
      return;
    }

    setIsLoading(true);
    try {
      await onCreateProject(projectName.trim());
      setIsCreating(false);
      setProjectName('');
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Failed to create project. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setProjectName('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreate();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isCreating) {
    return (
      <div className="project-creator active">
        <div className="project-creator-form">
          <input
            ref={inputRef}
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Enter project name..."
            className="project-name-input"
            disabled={isLoading}
          />
          <div className="creator-actions">
            <button
              className="save-btn"
              onClick={handleCreate}
              disabled={isLoading || projectName.trim() === ''}
            >
              {isLoading ? '...' : 'Create'}
            </button>
            <button
              className="cancel-btn"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="project-creator">
      <button
        className="new-project-btn"
        onClick={handleStartCreate}
        title="Create new project"
      >
        + New Project
      </button>
    </div>
  );
};

export default ProjectCreator;