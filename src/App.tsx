import React, { useState, useRef, useEffect } from 'react';
import { Task, ScheduledTasks, ScheduledTask, TodoistProject, TodoistLabel, TodoistTask } from './types/task';
import { TodoistApi, TodoistApiError } from './services/todoist-api';
import { AuthService } from './services/auth';
import { convertTodoistTaskToTask, convertTaskToTodoistTask } from './utils/taskConverter';
import { calendarSlotToDate, getDateKey, findOptimalTimeSlot } from './utils/dateUtils';
import { timeSlots } from './constants/calendar';
import { touchDragManager } from './utils/touchDragUtils';
import TaskList from './components/TaskList/TaskList';
import Calendar, { CalendarViewMode } from './components/Calendar/Calendar';
import TaskModal from './components/TaskModal/TaskModal';
import TaskEditModal from './components/TaskModal/TaskEditModal';
import TaskCreateModal from './components/TaskModal/TaskCreateModal';

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTasks>({});
  const [projects, setProjects] = useState<TodoistProject[]>([]);
  const [labels, setLabels] = useState<TodoistLabel[]>([]);
  const [modalTask, setModalTask] = useState<ScheduledTask | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createTaskProject, setCreateTaskProject] = useState<string>('');
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
        
        const [todoistTasks, projectsList, labelsList] = await Promise.all([
          TodoistApi.getTasks(),
          TodoistApi.getProjects(),
          TodoistApi.getLabels()
        ]);
        
        console.log('Loaded tasks:', todoistTasks.length, 'projects:', projectsList.length, 'labels:', labelsList.length);
        setProjects(projectsList);
        setLabels(labelsList);
        console.log('Sample tasks:', todoistTasks.slice(0, 2));
        
        // Separate unscheduled and scheduled tasks
        const unscheduledTasks = todoistTasks
          .filter(task => !task.due)
          .map(task => convertTodoistTaskToTask(task, projectsList, labelsList));
          
        const scheduledTasks = todoistTasks
          .filter(task => task.due && task.due.date) // Only check for due.date as it's always present
          .map(task => convertTodoistTaskToTask(task, projectsList, labelsList));
          
        console.log('Scheduled tasks found:', scheduledTasks.length);
        console.log('First few scheduled tasks:', scheduledTasks.slice(0, 3).map(t => ({id: t.id, title: t.title})));
        
        // Convert scheduled tasks to ScheduledTasks format
        const scheduledTasksMap: ScheduledTasks = {};
        scheduledTasks.forEach(task => {
          const originalTodoistTask = todoistTasks.find(t => t.id === task.id);
          
          if (originalTodoistTask?.due?.date) {
            let dueDate: Date;
            let timeKey: string;
            
            // Parse the due date - it might be in different formats
            const dueDateString = originalTodoistTask.due.date;
            console.log('Processing task:', task.title, 'with due date:', dueDateString);
            
            try {
              // Handle various date formats from the API
              if (dueDateString.includes('T')) {
                // Has time component
                dueDate = new Date(dueDateString);
                timeKey = dueDate.toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit',
                  hour12: true 
                });
              } else {
                // Date only, add default time
                dueDate = new Date(dueDateString + 'T09:00:00');
                timeKey = '9:00 AM';
              }
              
              // Ensure the date is valid
              if (isNaN(dueDate.getTime())) {
                console.warn('Invalid date for task:', task.title, dueDateString);
                return;
              }
              
              const dateKey = getDateKey(dueDate);
              
              const scheduledTask: ScheduledTask = {
                ...task,
                day: dueDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase(),
                time: timeKey,
                date: dateKey
              };
              
              const slotKey = `${dateKey}-${timeKey}`;
              console.log('Adding scheduled task to slot:', slotKey, 'for task:', task.title);
              
              if (!scheduledTasksMap[slotKey]) {
                scheduledTasksMap[slotKey] = [];
              }
              scheduledTasksMap[slotKey].push(scheduledTask);
              
            } catch (error) {
              console.error('Error processing due date for task:', task.title, error);
            }
          }
        });
        
        console.log('Final scheduled tasks map:', Object.keys(scheduledTasksMap).length, 'entries');
        console.log('Scheduled task keys:', Object.keys(scheduledTasksMap));
        
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

  // Set up touch drag callbacks (must be before conditional returns)
  useEffect(() => {
    touchDragManager.setCallbacks({
      onDragEnd: (task, dropTarget) => {
        if (!dropTarget) return;
        
        // Set the dragged task reference based on task type
        if ('time' in task) {
          // It's a scheduled task
          draggedScheduledTaskRef.current = task as ScheduledTask;
          draggedTaskRef.current = null;
        } else {
          // It's an unscheduled task
          draggedTaskRef.current = task as Task;
          draggedScheduledTaskRef.current = null;
        }
        
        // Trigger a synthetic drop event for the existing handlers
        const syntheticEvent = new Event('drop', { bubbles: true, cancelable: true });
        Object.defineProperty(syntheticEvent, 'target', { value: dropTarget });
        dropTarget.dispatchEvent(syntheticEvent);
      }
    });
  }, []);

  const handleLogin = (token: string) => {
    AuthService.setToken(token);
    setIsAuthenticated(true);
    setError(null);
    setLoading(true);
    
    // Reload the app
    window.location.reload();
  };

  const handleCreateTask = (projectName: string) => {
    setCreateTaskProject(projectName);
    setIsCreateModalOpen(true);
  };

  const handleSaveNewTask = async (taskData: {
    title: string;
    description: string;
    priority: 'p1' | 'p2' | 'p3' | 'p4';
    labels: string[];
    projectName: string;
  }) => {
    try {
      // Get project ID and convert labels to IDs
      const projectId = getProjectIdByName(taskData.projectName);
      const { labelIds, updatedLabels } = await getLabelIdsByNamesWithUpdatedState(taskData.labels);
      
      console.log('Creating task with:', {
        title: taskData.title,
        projectName: taskData.projectName,
        projectId: projectId,
        labelNames: taskData.labels,
        labelIds: labelIds
      });

      // Create the task payload - only include fields that have values
      const taskPayload: Partial<TodoistTask> = {
        content: taskData.title,
        priority: taskData.priority === 'p1' ? 4 : taskData.priority === 'p2' ? 3 : taskData.priority === 'p3' ? 2 : 1
      };

      // Only add optional fields if they have values
      if (taskData.description.trim()) {
        taskPayload.description = taskData.description;
      }
      
      if (projectId) {
        taskPayload.project_id = projectId;
      }
      
      if (labelIds.length > 0) {
        taskPayload.labels = labelIds;
      }

      // Create the new task via Todoist API
      const newTodoistTask = await TodoistApi.createTask(taskPayload);

      // Convert the new task using the updated labels array (includes any newly created labels)
      const newTask = convertTodoistTaskToTask(newTodoistTask, projects, updatedLabels);
      
      setTasks(prev => [...prev, newTask]);
      
      console.log(`Task "${taskData.title}" created successfully in project "${taskData.projectName}"`);
      
    } catch (error) {
      console.error('Failed to create task:', error);
      const errorMessage = error instanceof TodoistApiError 
        ? `Failed to create task: ${error.message}` 
        : 'Failed to create task. Please try again.';
      throw new Error(errorMessage);
    }
  };

  const getProjectIdByName = (projectName: string): string => {
    if (projectName === 'Inbox') {
      // Find the inbox project
      const inboxProject = projects.find(p => p.is_inbox_project);
      return inboxProject?.id || '';
    }
    
    // Find the project by name
    const project = projects.find(p => p.name === projectName);
    return project?.id || '';
  };

  // Keeping this function in case it's needed for future use
  /* const getLabelIdsByNames = async (labelNames: string[]): Promise<string[]> => {
    const labelIds: string[] = [];
    
    for (const name of labelNames) {
      // First try to find existing label
      const existingLabel = labels.find(label => label.name === name);
      if (existingLabel) {
        labelIds.push(existingLabel.id);
      } else {
        // Create new label if it doesn't exist
        try {
          console.log(`Creating new label: ${name}`);
          const newLabel = await TodoistApi.createLabel({ name });
          labelIds.push(newLabel.id);
          // Update local labels state
          setLabels(prev => [...prev, newLabel]);
        } catch (error) {
          console.error(`Failed to create label "${name}":`, error);
          // Continue without this label rather than failing completely
        }
      }
    }
    
    return labelIds;
  }; */

  const getLabelIdsByNamesWithUpdatedState = async (labelNames: string[]): Promise<{labelIds: string[], updatedLabels: TodoistLabel[]}> => {
    const labelIds: string[] = [];
    let updatedLabels = [...labels];
    
    for (const name of labelNames) {
      // First try to find existing label
      const existingLabel = updatedLabels.find(label => label.name === name);
      if (existingLabel) {
        labelIds.push(existingLabel.id);
      } else {
        // Create new label if it doesn't exist
        try {
          console.log(`Creating new label: ${name}`);
          const newLabel = await TodoistApi.createLabel({ name });
          labelIds.push(newLabel.id);
          // Add to the updated labels array for immediate use
          updatedLabels = [...updatedLabels, newLabel];
          // Also update the component state
          setLabels(prev => [...prev, newLabel]);
        } catch (error) {
          console.error(`Failed to create label "${name}":`, error);
          // Continue without this label rather than failing completely
        }
      }
    }
    
    return { labelIds, updatedLabels };
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setCreateTaskProject('');
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
        if (newScheduled[oldSlotKey]) {
          newScheduled[oldSlotKey] = newScheduled[oldSlotKey].filter(task => task.id !== draggedScheduledTask.id);
          if (newScheduled[oldSlotKey].length === 0) {
            delete newScheduled[oldSlotKey];
          }
        }
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
      // Create CalendarDate object from the date string first
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

      // For month view, use smart time selection instead of the default time
      let finalTime = time;
      if (isMonthViewDay) {
        finalTime = findOptimalTimeSlot(calendarDate, scheduledTasks, timeSlots);
        console.log(`Month view: Using smart time selection - ${finalTime} instead of ${time}`);
      }
      
      const dateSlotKey = `${date}-${finalTime}`;

      try {

        // Convert to ISO datetime for Todoist API
        const dueDateTime = calendarSlotToDate(calendarDate, finalTime);
        
        console.log('Scheduling task:', {
          taskId: taskToSchedule.id,
          taskTitle: taskToSchedule.title,
          originalDate: date,
          originalTime: time,
          finalTime: finalTime,
          calendarDate: calendarDate,
          dueDateTime: dueDateTime
        });
        
        // Optimistically schedule the task in UI
        const scheduledTask: ScheduledTask = { 
          ...taskToSchedule, 
          day: calendarDate.dayName.toLowerCase(), 
          time: finalTime,
          date: date
        };
        setScheduledTasks(prev => {
          const newScheduled = { ...prev };
          if (!newScheduled[dateSlotKey]) {
            newScheduled[dateSlotKey] = [];
          }
          newScheduled[dateSlotKey].push(scheduledTask);
          return newScheduled;
        });
        
        // Remove task from unscheduled tasks (only if it was an unscheduled task)
        if (draggedTask) {
          setTasks(prev => prev.filter(t => t.id !== taskToSchedule.id));
        }

        // Update task in Todoist API
        // Use due object structure for API v1
        await TodoistApi.updateTask(taskToSchedule.id, {
          due: {
            date: dueDateTime
          }
        });

        console.log(`Task "${taskToSchedule.title}" scheduled for ${dueDateTime}`);

      } catch (error) {
        console.error('Failed to update task due date:', error);
        console.error('Request details:', {
          taskId: taskToSchedule.id,
          date: date,
          originalTime: time,
          finalTime: finalTime
        });
        
        // Rollback optimistic update
        setScheduledTasks(prev => {
          const newScheduled = { ...prev };
          if (newScheduled[dateSlotKey]) {
            newScheduled[dateSlotKey] = newScheduled[dateSlotKey].filter(task => task.id !== taskToSchedule.id);
            if (newScheduled[dateSlotKey].length === 0) {
              delete newScheduled[dateSlotKey];
            }
          }
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
          setScheduledTasks(prev => {
            const newScheduled = { ...prev };
            if (!newScheduled[oldSlotKey]) {
              newScheduled[oldSlotKey] = [];
            }
            newScheduled[oldSlotKey].push(draggedScheduledTask);
            return newScheduled;
          });
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
        if (newScheduled[slotKey]) {
          newScheduled[slotKey] = newScheduled[slotKey].filter(task => task.id !== scheduledTask.id);
          if (newScheduled[slotKey].length === 0) {
            delete newScheduled[slotKey];
          }
        }
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
      setScheduledTasks(prev => {
        const newScheduled = { ...prev };
        if (!newScheduled[slotKey]) {
          newScheduled[slotKey] = [];
        }
        newScheduled[slotKey].push(scheduledTask);
        return newScheduled;
      });
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
          if (newScheduled[slotKey]) {
            newScheduled[slotKey] = newScheduled[slotKey].filter(task => task.id !== modalTask.id);
            if (newScheduled[slotKey].length === 0) {
              delete newScheduled[slotKey];
            }
          }
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
        setScheduledTasks(prev => {
          const newScheduled = { ...prev };
          if (!newScheduled[slotKey]) {
            newScheduled[slotKey] = [];
          }
          newScheduled[slotKey].push(modalTask);
          return newScheduled;
        });
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

    const isScheduledTask = editingTask.date && editingTask.time;
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

      // Update local state based on whether task is scheduled or unscheduled
      if (isScheduledTask) {
        // Update scheduled task
        const updatedTask: ScheduledTask = {
          ...editingTask,
          ...updatedTaskData
        };

        setScheduledTasks(prev => {
          const newScheduled = { ...prev };
          if (newScheduled[slotKey]) {
            newScheduled[slotKey] = newScheduled[slotKey].map(task => 
              task.id === editingTask.id ? updatedTask : task
            );
          }
          return newScheduled;
        });
      } else {
        // Update unscheduled task
        const updatedTask: Task = {
          id: editingTask.id,
          title: updatedTaskData.title || editingTask.title,
          description: updatedTaskData.description || editingTask.description,
          priority: updatedTaskData.priority || editingTask.priority,
          labels: updatedTaskData.labels || editingTask.labels,
          project_id: editingTask.project_id,
          project_name: editingTask.project_name
        };

        setTasks(prev => prev.map(task => 
          task.id === editingTask.id ? updatedTask : task
        ));
      }

      console.log(`Task "${updatedTaskData.title || editingTask.title}" updated successfully`);

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

  const handleCreateProject = async (name: string): Promise<void> => {
    try {
      console.log(`Creating project: ${name}`);
      const newProject = await TodoistApi.createProject({ name });
      
      setProjects(prev => [...prev, newProject]);
      console.log(`Project "${name}" created successfully`);
      
    } catch (error) {
      console.error('Failed to create project:', error);
      const errorMessage = error instanceof TodoistApiError 
        ? `Failed to create project: ${error.message}` 
        : 'Failed to create project. Please try again.';
      throw new Error(errorMessage);
    }
  };

  const handleRenameProject = async (projectId: string, newName: string): Promise<void> => {
    try {
      console.log(`Renaming project ${projectId} to: ${newName}`);
      await TodoistApi.updateProject(projectId, { name: newName });
      
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, name: newName } : p));
      
      // Update tasks with the new project name
      setTasks(prev => prev.map(task => 
        task.project_id === projectId ? { ...task, project_name: newName } : task
      ));
      
      // Update scheduled tasks with the new project name
      setScheduledTasks(prev => {
        const newScheduled = { ...prev };
        Object.keys(newScheduled).forEach(slotKey => {
          newScheduled[slotKey] = newScheduled[slotKey].map(task => 
            task.project_id === projectId ? { ...task, project_name: newName } : task
          );
        });
        return newScheduled;
      });
      
      console.log(`Project renamed to "${newName}" successfully`);
      
    } catch (error) {
      console.error('Failed to rename project:', error);
      const errorMessage = error instanceof TodoistApiError 
        ? `Failed to rename project: ${error.message}` 
        : 'Failed to rename project. Please try again.';
      throw new Error(errorMessage);
    }
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
        projects={projects}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragEnter={handleUnscheduledDragEnter}
        onDragLeave={handleUnscheduledDragLeave}
        onDrop={handleUnscheduledDrop}
        onTaskClick={handleUnscheduledTaskClick}
        onCreateTask={handleCreateTask}
        onCreateProject={handleCreateProject}
        onRenameProject={handleRenameProject}
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
      <TaskCreateModal
        isOpen={isCreateModalOpen}
        projectName={createTaskProject}
        onClose={handleCloseCreateModal}
        onSave={handleSaveNewTask}
      />
    </div>
  );
}

export default App;