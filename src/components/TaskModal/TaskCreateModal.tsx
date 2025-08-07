import React, { useState, useEffect } from 'react';

interface TaskCreateModalProps {
  isOpen: boolean;
  projectName: string;
  onClose: () => void;
  onSave: (taskData: {
    title: string;
    description: string;
    priority: 'p1' | 'p2' | 'p3' | 'p4';
    labels: string[];
    projectName: string;
  }) => void;
}

const TaskCreateModal: React.FC<TaskCreateModalProps> = ({ isOpen, projectName, onClose, onSave }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'p1' | 'p2' | 'p3' | 'p4'>('p4');
  const [prioritySliderValue, setPrioritySliderValue] = useState(4);
  const [labels, setLabels] = useState<string[]>([]);
  const [newLabel, setNewLabel] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setPriority('p4');
      setPrioritySliderValue(4);
      setLabels([]);
      setNewLabel('');
      setIsSaving(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const addLabel = () => {
    const trimmedLabel = newLabel.trim();
    if (trimmedLabel && !labels.includes(trimmedLabel)) {
      setLabels([...labels, trimmedLabel]);
      setNewLabel('');
    }
  };

  const removeLabel = (labelToRemove: string) => {
    setLabels(labels.filter(label => label !== labelToRemove));
  };

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      alert('Task title is required');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        title: trimmedTitle,
        description: description.trim(),
        priority,
        labels,
        projectName
      });
      onClose();
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('Failed to create task. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    }
  };

  if (!isOpen) return null;

  const priorityLabels = {
    'p1': 'Urgent',
    'p2': 'High',
    'p3': 'Medium', 
    'p4': 'Low'
  };

  const priorityOptions: ('p1' | 'p2' | 'p3' | 'p4')[] = ['p1', 'p2', 'p3', 'p4'];

  const handlePrioritySliderChange = (value: number) => {
    setPrioritySliderValue(value);
    const priorityMap: { [key: number]: 'p1' | 'p2' | 'p3' | 'p4' } = {
      1: 'p1',
      2: 'p2', 
      3: 'p3',
      4: 'p4'
    };
    setPriority(priorityMap[value]);
  };

  return (
    <div 
      className={`modal-overlay ${isOpen ? 'active' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="modal task-edit-modal">
        <div className="modal-header">
          <h3 className="modal-title">Create New Task</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Project</label>
            <div className="project-display">
              # {projectName}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Task Title</label>
            <input
              type="text"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title..."
              maxLength={500}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter task description..."
              rows={3}
              maxLength={1000}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Priority</label>
            <div className="priority-slider-container">
              <div className="priority-slider-labels">
                <span className="priority-label-start">Low</span>
                <span className="priority-label-end">Urgent</span>
              </div>
              <input
                type="range"
                min="1"
                max="4"
                step="1"
                value={5 - prioritySliderValue}
                onChange={(e) => handlePrioritySliderChange(5 - parseInt(e.target.value))}
                className="priority-slider"
              />
              <div className="priority-current">
                <span className={`priority-label priority-${priority}`}>
                  {priorityLabels[priority]}
                </span>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Labels</label>
            <div className="labels-input">
              <input
                type="text"
                className="form-input"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, addLabel)}
                placeholder="Add a label..."
                maxLength={50}
              />
              <button 
                type="button" 
                className="add-label-btn"
                onClick={addLabel}
                disabled={!newLabel.trim()}
              >
                Add
              </button>
            </div>
            {labels.length > 0 && (
              <div className="current-labels">
                {labels.map((label, index) => (
                  <span key={index} className="edit-label">
                    {label}
                    <button
                      type="button"
                      className="remove-label-btn"
                      onClick={() => removeLabel(label)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="modal-actions">
          <button className="modal-button secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="modal-button primary" 
            onClick={handleSave}
            disabled={isSaving || !title.trim()}
          >
            {isSaving ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskCreateModal;