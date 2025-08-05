import React, { useState, useRef, useEffect } from 'react';
import { Task, ScheduledTasks, ScheduledTask } from './types/task';
import { TodoistApi, TodoistApiError } from './services/todoist-api';
import { AuthService } from './services/auth';
import { convertTodoistTaskToTask, convertTaskToTodoistTask } from './utils/taskConverter';
import { calendarSlotToDate, getDateKey } from './utils/dateUtils';
import TaskList from './components/TaskList/TaskList';
import Calendar, { CalendarViewMode } from './components/Calendar/Calendar';
import TaskModal from './components/TaskModal/TaskModal';
import TaskEditModal from './components/TaskModal/TaskEditModal';

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTasks>({});
  const [modalTask, setModalTask] = useState<ScheduledTask | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week');
  const draggedTaskRef = useRef<Task | null>(null);
  const draggedScheduledTaskRef = useRef<ScheduledTask | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const token = AuthService.getToken();
        if (!token) {
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }

        setIsAuthenticated(true);
        
        const [todoistTasks, projects] = await Promise.all([
          TodoistApi.getTasks(),
          TodoistApi.getProjects()
        ]);
        
        // Separate unscheduled and scheduled tasks
        const unscheduledTasks = todoistTasks
          .filter(task => !task.due)
          .map(task => convertTodoistTaskToTask(task, projects));
          
        const scheduledTasks = todoistTasks
          .filter(task => task.due && task.due.datetime)
          .map(task => convertTodoistTaskToTask(task, projects));
        
        // Convert scheduled tasks to ScheduledTasks format
        const scheduledTasksMap: ScheduledTasks = {};
        scheduledTasks.forEach(task => {
          const originalTodoistTask = todoistTasks.find(t => t.id === task.id);
          if (originalTodoistTask?.due?.datetime) {
            const dueDate = new Date(originalTodoistTask.due.datetime);
            const dateKey = getDateKey(dueDate);
            const timeKey = dueDate.toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            });
            
            const scheduledTask: ScheduledTask = {
              ...task,
              day: dueDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase(),
              time: timeKey,
              date: dateKey
            };
            
            scheduledTasksMap[`${dateKey}-${timeKey}`] = scheduledTask;
          }
        });
        
        setTasks(unscheduledTasks);
        setScheduledTasks(scheduledTasksMap);
        setError(null);
      } catch (err) {
        console.error('Failed to load tasks:', err);
        if (err instanceof TodoistApiError) {
          setError(`Todoist API Error: ${err.message}`);
          // If it's an auth error, clear the token
          if (err.status === 401 || err.status === 403) {
            AuthService.removeToken();
            setIsAuthenticated(false);
          }
        } else {
          setError('Failed to load tasks. Please check your connection.');
        }
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  const handleLogin = (token: string) => {
    AuthService.setToken(token);
    setIsAuthenticated(true);
    setError(null);
    setLoading(true);
    
    // Reload the app
    window.location.reload();
  };

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
    document.querySelectorAll('.drop-zone-active, .drop-zone-hover, .unscheduled-drop-zone-active').forEach(el => {
      el.classList.remove('drop-zone-active', 'drop-zone-hover', 'unscheduled-drop-zone-active');
    });
    
    // Reset dragged task after a small delay
    setTimeout(() => {
      draggedTaskRef.current = null;
      draggedScheduledTaskRef.current = null;
    }, 50);
  };

  const handleScheduledTaskDragStart = (e: React.DragEvent<HTMLDivElement>, task: ScheduledTask) => {
    draggedScheduledTaskRef.current = task;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id.toString());
    
    // Add dragging class
    const target = e.target as HTMLElement;
    target.classList.add('dragging');
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const target = e.target as HTMLElement;
    
    // Find the correct drop target (may be a child element)
    const dropTarget = target.closest('.time-slot, .month-day') as HTMLElement;
    
    if (dropTarget) {
      const isWeekViewSlot = dropTarget.classList.contains('time-slot') && !dropTarget.classList.contains('time-label');
      const isMonthViewDay = dropTarget.classList.contains('month-day');
      
      if (isWeekViewSlot || isMonthViewDay) {
        dropTarget.classList.add('drop-zone-active');
        
        // Add hover effect with slight delay
        setTimeout(() => {
          if (dropTarget.classList.contains('drop-zone-active')) {
            dropTarget.classList.add('drop-zone-hover');
          }
        }, 100);
      }
    }
  };

  const handleUnscheduledDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const target = e.target as HTMLElement;
    if (target.classList.contains('unscheduled-drop-zone')) {
      target.classList.add('unscheduled-drop-zone-active');
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    
    // Find the correct drop target (may be a child element)
    const dropTarget = target.closest('.time-slot, .month-day') as HTMLElement;
    
    if (dropTarget && (dropTarget.classList.contains('time-slot') || dropTarget.classList.contains('month-day'))) {
      dropTarget.classList.remove('drop-zone-active', 'drop-zone-hover');
    }
  };

  const handleUnscheduledDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('unscheduled-drop-zone')) {
      target.classList.remove('unscheduled-drop-zone-active');
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const target = e.target as HTMLElement;
    
    // Find the correct drop target (may be a child element)
    const dropTarget = target.closest('.time-slot, .month-day') as HTMLElement;
    
    if (!dropTarget) {
      return;
    }
    
    dropTarget.classList.remove('drop-zone-active', 'drop-zone-hover');

    // Support both week view (.time-slot) and month view (.month-day)
    const isWeekViewSlot = dropTarget.classList.contains('time-slot') && !dropTarget.classList.contains('time-label');
    const isMonthViewDay = dropTarget.classList.contains('month-day');
    
    if (!isWeekViewSlot && !isMonthViewDay) {
      return;
    }

    const date = dropTarget.dataset.date;
    const time = dropTarget.dataset.time;
    
    // Handle both unscheduled tasks and scheduled tasks being moved between calendar slots
    const draggedTask = draggedTaskRef.current;
    const draggedScheduledTask = draggedScheduledTaskRef.current;
    
    if (!draggedTask && !draggedScheduledTask) {
      return;  
    }

    // If moving a scheduled task to a different slot, first remove from old slot
    if (draggedScheduledTask) {
      const oldSlotKey = draggedScheduledTask.date ? 
        `${draggedScheduledTask.date}-${draggedScheduledTask.time}` : 
        `${draggedScheduledTask.day}-${draggedScheduledTask.time}`;
      
      // Remove from old slot
      setScheduledTasks(prev => {
        const newScheduled = { ...prev };
        delete newScheduled[oldSlotKey];
        return newScheduled;
      });
    }

    // Use the dragged task (either from unscheduled or scheduled)
    const taskToSchedule = draggedTask || {
      id: draggedScheduledTask!.id,
      title: draggedScheduledTask!.title,
      description: draggedScheduledTask!.description,
      priority: draggedScheduledTask!.priority,
      labels: draggedScheduledTask!.labels,
      project_id: draggedScheduledTask!.project_id,
      project_name: draggedScheduledTask!.project_name
    };

    if (taskToSchedule && date && time) {
      // Check if slot is already occupied (support both new and legacy keys)
      const dateSlotKey = `${date}-${time}`;
      
      if (scheduledTasks[dateSlotKey]) {
        // Show feedback that slot is occupied
        dropTarget.style.background = '#ffebee';
        setTimeout(() => {
          dropTarget.style.background = '';
        }, 500);
        return;
      }

      try {
        // Create CalendarDate object from the date string
        const calendarDate = {
          date: new Date(date),
          dayName: new Date(date).toLocaleDateString('en-US', { weekday: 'long' }),
          shortDayName: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
          dayNumber: new Date(date).getDate(),
          monthName: new Date(date).toLocaleDateString('en-US', { month: 'long' }),
          shortMonthName: new Date(date).toLocaleDateString('en-US', { month: 'short' }),
          isToday: new Date(date).toDateString() === new Date().toDateString(),
          isCurrentWeek: true // Simplified for now
        };

        // Convert to ISO datetime for Todoist API
        const dueDateTime = calendarSlotToDate(calendarDate, time);
        
        console.log('Scheduling task:', {
          taskId: taskToSchedule.id,
          taskTitle: taskToSchedule.title,
          originalDate: date,
          originalTime: time,
          calendarDate: calendarDate,
          dueDateTime: dueDateTime
        });
        
        // Optimistically schedule the task in UI
        const scheduledTask: ScheduledTask = { 
          ...taskToSchedule, 
          day: calendarDate.dayName.toLowerCase(), 
          time,
          date: date
        };
        setScheduledTasks(prev => ({ ...prev, [dateSlotKey]: scheduledTask }));
        
        // Remove task from unscheduled tasks (only if it was an unscheduled task)
        if (draggedTask) {
          setTasks(prev => prev.filter(t => t.id !== taskToSchedule.id));
        }

        // Update task in Todoist API
        // Use due_datetime for tasks with specific times
        await TodoistApi.updateTask(taskToSchedule.id, {
          due_datetime: dueDateTime
        });

        console.log(`Task "${taskToSchedule.title}" scheduled for ${dueDateTime}`);

      } catch (error) {
        console.error('Failed to update task due date:', error);
        console.error('Request details:', {
          taskId: taskToSchedule.id,
          date: date,
          time: time
        });
        
        // Rollback optimistic update
        setScheduledTasks(prev => {
          const newScheduled = { ...prev };
          delete newScheduled[dateSlotKey];
          return newScheduled;
        });
        
        // Restore to original state
        if (draggedTask) {
          // Add task back to unscheduled tasks
          setTasks(prev => [...prev, taskToSchedule]);
        } else if (draggedScheduledTask) {
          // Restore to original scheduled slot
          const oldSlotKey = draggedScheduledTask.date ? 
            `${draggedScheduledTask.date}-${draggedScheduledTask.time}` : 
            `${draggedScheduledTask.day}-${draggedScheduledTask.time}`;
          setScheduledTasks(prev => ({ ...prev, [oldSlotKey]: draggedScheduledTask }));
        }
        
        // Show error feedback
        dropTarget.style.background = '#ffebee';
        setTimeout(() => {
          dropTarget.style.background = '';
        }, 1000);
        
        // More detailed error message
        const errorMessage = error instanceof TodoistApiError 
          ? `Failed to schedule task: ${error.message}` 
          : 'Failed to schedule task. Please try again.';
        alert(errorMessage);
      }
    }
  };

  const handleUnscheduledDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const target = e.target as HTMLElement;
    target.classList.remove('unscheduled-drop-zone-active');

    // Only handle scheduled tasks being dropped here
    if (!draggedScheduledTaskRef.current) {
      return;
    }

    const scheduledTask = draggedScheduledTaskRef.current;
    const slotKey = scheduledTask.date ? 
      `${scheduledTask.date}-${scheduledTask.time}` : 
      `${scheduledTask.day}-${scheduledTask.time}`;

    try {
      // Optimistically remove from scheduled tasks
      setScheduledTasks(prev => {
        const newScheduled = { ...prev };
        delete newScheduled[slotKey];
        return newScheduled;
      });
      
      // Add back to unscheduled tasks
      const originalTask: Task = {
        id: scheduledTask.id,
        title: scheduledTask.title,
        description: scheduledTask.description,
        priority: scheduledTask.priority,
        labels: scheduledTask.labels,
        project_id: scheduledTask.project_id,
        project_name: scheduledTask.project_name
      };
      setTasks(prev => [...prev, originalTask]);
      
      // Clear due date in Todoist API
      await TodoistApi.clearTaskDueDate(scheduledTask.id);
      
      console.log(`Task "${scheduledTask.title}" unscheduled via drag and drop`);
      
    } catch (error) {
      console.error('Failed to unschedule task:', error);
      
      // Rollback optimistic update
      setScheduledTasks(prev => ({ ...prev, [slotKey]: scheduledTask }));
      setTasks(prev => prev.filter(t => t.id !== scheduledTask.id));
      
      // Show error feedback
      target.style.background = '#ffebee';
      setTimeout(() => {
        target.style.background = '';
      }, 1000);
      
      alert('Failed to unschedule task. Please try again.');
    }
  };

  const handleTaskClick = (task: ScheduledTask) => {
    setModalTask(task);
    setIsModalOpen(true);
  };

  const handleUnscheduledTaskClick = (task: Task) => {
    // Convert unscheduled task to ScheduledTask format for the modal
    const scheduledTask: ScheduledTask = {
      ...task,
      day: '',
      time: '',
      date: ''
    };
    setModalTask(scheduledTask);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalTask(null);
  };

  const handleRemoveTask = async () => {
    if (modalTask) {
      const slotKey = modalTask.date ? `${modalTask.date}-${modalTask.time}` : `${modalTask.day}-${modalTask.time}`;
      
      try {
        // Optimistically remove from scheduled tasks
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
          labels: modalTask.labels,
          project_id: modalTask.project_id,
          project_name: modalTask.project_name
        };
        setTasks(prev => [...prev, originalTask]);
        
        // Clear due date in Todoist API
        await TodoistApi.clearTaskDueDate(modalTask.id);
        
        console.log(`Task "${modalTask.title}" unscheduled`);
        handleCloseModal();
        
      } catch (error) {
        console.error('Failed to unschedule task:', error);
        
        // Rollback optimistic update
        setScheduledTasks(prev => ({ ...prev, [slotKey]: modalTask }));
        setTasks(prev => prev.filter(t => t.id !== modalTask.id));
        
        alert('Failed to unschedule task. Please try again.');
      }
    }
  };

  const handleEditTask = () => {
    if (modalTask) {
      setEditingTask(modalTask);
      setIsEditModalOpen(true);
      setIsModalOpen(false);
    }
  };

  const handleSaveTask = async (updatedTaskData: Partial<ScheduledTask>) => {
    if (!editingTask) return;

    const slotKey = editingTask.date ? 
      `${editingTask.date}-${editingTask.time}` : 
      `${editingTask.day}-${editingTask.time}`;

    try {
      // Convert to Todoist format for API call
      const tempTask: Task = {
        id: editingTask.id,
        title: updatedTaskData.title || editingTask.title,
        description: updatedTaskData.description || editingTask.description,
        priority: updatedTaskData.priority || editingTask.priority,
        labels: updatedTaskData.labels || editingTask.labels
      };
      
      const todoistTaskData = convertTaskToTodoistTask(tempTask);
      
      // Update task in Todoist API
      await TodoistApi.updateTask(editingTask.id, {
        content: todoistTaskData.content,
        description: todoistTaskData.description,
        priority: todoistTaskData.priority,
        labels: todoistTaskData.labels
      });

      // Update local state
      const updatedTask: ScheduledTask = {
        ...editingTask,
        ...updatedTaskData
      };

      setScheduledTasks(prev => ({
        ...prev,
        [slotKey]: updatedTask
      }));

      console.log(`Task "${updatedTask.title}" updated successfully`);

    } catch (error) {
      console.error('Failed to update task:', error);
      const errorMessage = error instanceof TodoistApiError 
        ? `Failed to update task: ${error.message}` 
        : 'Failed to update task. Please try again.';
      throw new Error(errorMessage);
    }
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingTask(null);
  };

  if (loading) {
    return (
      <div className="container">
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <div>Loading tasks...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container">
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>Todoist Integration</h2>
          <p>Please enter your Todoist API token to get started.</p>
          <p>
            You can find your API token in your{' '}
            <a href="https://todoist.com/prefs/integrations" target="_blank" rel="noopener noreferrer">
              Todoist settings
            </a>
          </p>
          <input
            type="password"
            placeholder="Enter your Todoist API token"
            style={{ padding: '0.5rem', margin: '1rem', width: '300px' }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const token = (e.target as HTMLInputElement).value.trim();
                if (token) {
                  handleLogin(token);
                }
              }
            }}
          />
          <br />
          <button
            onClick={() => {
              const input = document.querySelector('input[type="password"]') as HTMLInputElement;
              const token = input?.value.trim();
              if (token) {
                handleLogin(token);
              }
            }}
            style={{ padding: '0.5rem 1rem', marginTop: '0.5rem' }}
          >
            Connect to Todoist
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>
          <h3>Error</h3>
          <p>{error}</p>
          <button
            onClick={() => {
              AuthService.removeToken();
              setIsAuthenticated(false);
              setError(null);
            }}
            style={{ padding: '0.5rem 1rem', margin: '1rem' }}
          >
            Reset Authentication
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <TaskList
        tasks={tasks}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragEnter={handleUnscheduledDragEnter}
        onDragLeave={handleUnscheduledDragLeave}
        onDrop={handleUnscheduledDrop}
        onTaskClick={handleUnscheduledTaskClick}
      />
      <Calendar
        scheduledTasks={scheduledTasks}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onTaskClick={handleTaskClick}
        onScheduledTaskDragStart={handleScheduledTaskDragStart}
        onScheduledTaskDragEnd={handleDragEnd}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
      <TaskModal
        isOpen={isModalOpen}
        task={modalTask}
        onClose={handleCloseModal}
        onRemove={handleRemoveTask}
        onEdit={handleEditTask}
      />
      <TaskEditModal
        isOpen={isEditModalOpen}
        task={editingTask}
        onClose={handleCloseEditModal}
        onSave={handleSaveTask}
      />
    </div>
  );
}

export default App;