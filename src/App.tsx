import React, { useState, useRef } from 'react';
import { Task, ScheduledTasks, ScheduledTask } from './types/task';
import { sampleTasks } from './data/sampleTasks';
import TaskList from './components/TaskList/TaskList';
import Calendar from './components/Calendar/Calendar';
import TaskModal from './components/TaskModal/TaskModal';

function App() {
  const [tasks, setTasks] = useState<Task[]>(sampleTasks);
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTasks>({});
  const [modalTask, setModalTask] = useState<ScheduledTask | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const draggedTaskRef = useRef<Task | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, task: Task) => {
    draggedTaskRef.current = task;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id.toString());
    
    // Add dragging class
    const target = e.target as HTMLElement;
    target.classList.add('dragging');
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    target.classList.remove('dragging');
    
    // Clear all drop zone highlights
    document.querySelectorAll('.drop-zone-active, .drop-zone-hover').forEach(el => {
      el.classList.remove('drop-zone-active', 'drop-zone-hover');
    });
    
    // Reset dragged task after a small delay
    setTimeout(() => {
      draggedTaskRef.current = null;
    }, 50);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const target = e.target as HTMLElement;
    if (target.classList.contains('time-slot') && !target.classList.contains('time-label')) {
      target.classList.add('drop-zone-active');
      
      // Add hover effect with slight delay
      setTimeout(() => {
        if (target.classList.contains('drop-zone-active')) {
          target.classList.add('drop-zone-hover');
        }
      }, 100);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('time-slot')) {
      target.classList.remove('drop-zone-active', 'drop-zone-hover');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const target = e.target as HTMLElement;
    target.classList.remove('drop-zone-active', 'drop-zone-hover');

    if (!draggedTaskRef.current || !target.classList.contains('time-slot') || target.classList.contains('time-label')) {
      return;
    }

    const day = target.dataset.day;
    const time = target.dataset.time;
    const task = draggedTaskRef.current;

    if (task && day && time) {
      // Check if slot is already occupied
      const slotKey = `${day}-${time}`;
      if (scheduledTasks[slotKey]) {
        // Show feedback that slot is occupied
        target.style.background = '#ffebee';
        setTimeout(() => {
          target.style.background = '';
        }, 500);
        return;
      }

      // Schedule the task
      const scheduledTask: ScheduledTask = { ...task, day, time };
      setScheduledTasks(prev => ({ ...prev, [slotKey]: scheduledTask }));
      
      // Remove task from unscheduled tasks
      setTasks(prev => prev.filter(t => t.id !== task.id));
    }
  };

  const handleTaskClick = (task: ScheduledTask) => {
    setModalTask(task);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalTask(null);
  };

  const handleRemoveTask = () => {
    if (modalTask) {
      const slotKey = `${modalTask.day}-${modalTask.time}`;
      
      // Remove from scheduled tasks
      setScheduledTasks(prev => {
        const newScheduled = { ...prev };
        delete newScheduled[slotKey];
        return newScheduled;
      });
      
      // Add back to unscheduled tasks
      const originalTask: Task = {
        id: modalTask.id,
        title: modalTask.title,
        description: modalTask.description,
        priority: modalTask.priority,
        labels: modalTask.labels
      };
      setTasks(prev => [...prev, originalTask]);
      
      handleCloseModal();
    }
  };

  const handleEditTask = () => {
    alert('Edit functionality would open a task edit form here! 📝');
  };

  return (
    <div className="container">
      <TaskList
        tasks={tasks}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      />
      <Calendar
        scheduledTasks={scheduledTasks}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onTaskClick={handleTaskClick}
      />
      <TaskModal
        isOpen={isModalOpen}
        task={modalTask}
        onClose={handleCloseModal}
        onRemove={handleRemoveTask}
        onEdit={handleEditTask}
      />
    </div>
  );
}

export default App;