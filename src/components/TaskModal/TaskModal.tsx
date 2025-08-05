import React, { useEffect } from 'react';
import { ScheduledTask as ScheduledTaskType } from '../../types/task';

interface TaskModalProps {
  isOpen: boolean;
  task: ScheduledTaskType | null;
  onClose: () => void;
  onRemove: () => void;
  onEdit: () => void;
}

const TaskModal: React.FC<TaskModalProps> = ({ isOpen, task, onClose, onRemove, onEdit }) => {
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

  if (!task) return null;

  const isScheduled = task.day && task.time;
  const dayName = task.day ? task.day.charAt(0).toUpperCase() + task.day.slice(1) : '';

  return (
    <div 
      className={`modal-overlay ${isOpen ? 'active' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">{task.title}</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <div className={`modal-priority-badge priority-${task.priority}`}>
            <div className={`modal-priority-dot priority-${task.priority}`}></div>
            <span>Priority {task.priority.toUpperCase()}</span>
          </div>
          <div className="modal-description">
            {task.description}
          </div>
          <div className="modal-details">
            {isScheduled && (
              <>
                <div className="modal-detail-label">📅 Scheduled:</div>
                <div className="modal-detail-value">{dayName}, {task.time}</div>
              </>
            )}
            {task.project_name && (
              <>
                <div className="modal-detail-label">📁 Project:</div>
                <div className="modal-detail-value">{task.project_name}</div>
              </>
            )}
            <div className="modal-detail-label">🏷️ Labels:</div>
            <div className="modal-detail-value">
              <div className="modal-labels">
                {task.labels.map((label, index) => (
                  <span key={index} className="modal-label">{label}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="modal-actions">
          <button className="modal-button secondary" onClick={onEdit}>
            ✏️ Edit
          </button>
          {isScheduled && (
            <button className="modal-button danger" onClick={onRemove}>
              🗑️ Unschedule
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskModal;