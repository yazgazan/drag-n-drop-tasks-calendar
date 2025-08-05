import React, { useState, useRef, useEffect } from 'react';
import { Task, ScheduledTasks, ScheduledTask } from './types/task';
import { TodoistApi, TodoistApiError } from './services/todoist-api';
import { AuthService } from './services/auth';
import { convertTodoistTaskToTask } from './utils/taskConverter';
import { calendarSlotToDate } from './utils/dateUtils';
import TaskList from './components/TaskList/TaskList';
import Calendar from './components/Calendar/Calendar';
import TaskModal from './components/TaskModal/TaskModal';

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTasks>({});
  const [modalTask, setModalTask] = useState<ScheduledTask | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const draggedTaskRef = useRef<Task | null>(null);

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
        
        const todoistTasks = await TodoistApi.getTasks();
        
        // Separate unscheduled and scheduled tasks
        const unscheduledTasks = todoistTasks
          .filter(task => !task.due)
          .map(convertTodoistTaskToTask);
          
        const scheduledTasks = todoistTasks
          .filter(task => task.due && task.due.datetime)
          .map(convertTodoistTaskToTask);
        
        // Convert scheduled tasks to ScheduledTasks format
        const scheduledTasksMap: ScheduledTasks = {};
        scheduledTasks.forEach(task => {
          const originalTodoistTask = todoistTasks.find(t => t.id === task.id);
          if (originalTodoistTask?.due?.datetime) {
            const dueDate = new Date(originalTodoistTask.due.datetime);
            const dateKey = dueDate.toISOString().split('T')[0];
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

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const target = e.target as HTMLElement;
    target.classList.remove('drop-zone-active', 'drop-zone-hover');

    if (!draggedTaskRef.current || !target.classList.contains('time-slot') || target.classList.contains('time-label')) {
      return;
    }

    const date = target.dataset.date;
    const time = target.dataset.time;
    const task = draggedTaskRef.current;

    if (task && date && time) {
      // Check if slot is already occupied (support both new and legacy keys)
      const dateSlotKey = `${date}-${time}`;
      
      if (scheduledTasks[dateSlotKey]) {
        // Show feedback that slot is occupied
        target.style.background = '#ffebee';
        setTimeout(() => {
          target.style.background = '';
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
        
        // Optimistically schedule the task in UI
        const scheduledTask: ScheduledTask = { 
          ...task, 
          day: calendarDate.dayName.toLowerCase(), 
          time,
          date: date
        };
        setScheduledTasks(prev => ({ ...prev, [dateSlotKey]: scheduledTask }));
        
        // Remove task from unscheduled tasks
        setTasks(prev => prev.filter(t => t.id !== task.id));

        // Update task in Todoist API
        await TodoistApi.updateTask(task.id, {
          due: {
            date: date,
            datetime: dueDateTime
          }
        });

        console.log(`Task "${task.title}" scheduled for ${dueDateTime}`);

      } catch (error) {
        console.error('Failed to update task due date:', error);
        
        // Rollback optimistic update
        setScheduledTasks(prev => {
          const newScheduled = { ...prev };
          delete newScheduled[dateSlotKey];
          return newScheduled;
        });
        
        // Add task back to unscheduled tasks
        setTasks(prev => [...prev, task]);
        
        // Show error feedback
        target.style.background = '#ffebee';
        setTimeout(() => {
          target.style.background = '';
        }, 1000);
        
        // You could show a more user-friendly error message here
        alert('Failed to schedule task. Please try again.');
      }
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
          labels: modalTask.labels
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
    alert('Edit functionality would open a task edit form here! 📝');
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