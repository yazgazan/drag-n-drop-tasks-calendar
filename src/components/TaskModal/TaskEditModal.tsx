import React, { useState, useEffect } from 'react';
import { ScheduledTask as ScheduledTaskType } from '../../types/task';

interface TaskEditModalProps {
  isOpen: boolean;
  task: ScheduledTaskType | null;
  onClose: () => void;
  onSave: (updatedTask: Partial<ScheduledTaskType>) => void;
}

const TaskEditModal: React.FC<TaskEditModalProps> = ({ isOpen, task, onClose, onSave }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'p1' | 'p2' | 'p3' | 'p4'>('p4');
  const [labels, setLabels] = useState<string[]>([]);
  const [newLabel, setNewLabel] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setPriority(task.priority);
      setLabels([...task.labels]);
    }
  }, [task]);

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
        labels
      });
      onClose();
    } catch (error) {
      console.error('Failed to save task:', error);
      alert('Failed to save task. Please try again.');
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

  if (!task) return null;

  const priorityLabels = {
    'p1': 'Urgent',
    'p2': 'High',
    'p3': 'Medium', 
    'p4': 'Low'
  };

  const priorityOptions: ('p1' | 'p2' | 'p3' | 'p4')[] = ['p1', 'p2', 'p3', 'p4'];

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
          <h3 className="modal-title">Edit Task</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Task Title</label>
            <input
              type="text"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title..."
              maxLength={500}
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
            <div className="priority-options">
              {priorityOptions.map((p) => (
                <label key={p} className="priority-option">
                  <input
                    type="radio"
                    name="priority"
                    value={p}
                    checked={priority === p}
                    onChange={() => setPriority(p)}
                  />
                  <span className={`priority-label priority-${p}`}>
                    <div className={`priority-dot priority-${p}`}></div>
                    {priorityLabels[p]}
                  </span>
                </label>
              ))}
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
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskEditModal;