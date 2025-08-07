import React, { useState, useRef, useEffect } from 'react';

interface ProjectCreatorProps {
  onCreateProject: (name: string, color?: string) => Promise<void>;
}

const PROJECT_COLORS = [
  { name: 'grey', label: 'Grey' },
  { name: 'red', label: 'Red' },
  { name: 'orange', label: 'Orange' },
  { name: 'yellow', label: 'Yellow' },
  { name: 'green', label: 'Green' },
  { name: 'blue', label: 'Blue' },
  { name: 'purple', label: 'Purple' },
  { name: 'pink', label: 'Pink' }
];

const ProjectCreator: React.FC<ProjectCreatorProps> = ({ onCreateProject }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [selectedColor, setSelectedColor] = useState('grey');
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
    setSelectedColor('grey');
  };

  const handleCreate = async () => {
    if (projectName.trim() === '') {
      return;
    }

    setIsLoading(true);
    try {
      await onCreateProject(projectName.trim(), selectedColor);
      setIsCreating(false);
      setProjectName('');
      setSelectedColor('grey');
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
    setSelectedColor('grey');
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
          <div className="color-selector">
            {PROJECT_COLORS.map((color) => (
              <button
                key={color.name}
                className={`color-option color-${color.name} ${selectedColor === color.name ? 'selected' : ''}`}
                onClick={() => setSelectedColor(color.name)}
                title={color.label}
                disabled={isLoading}
              />
            ))}
          </div>
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