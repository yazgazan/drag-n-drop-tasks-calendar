import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Task, ScheduledTasks, ScheduledTask, TodoistProject, TodoistLabel, TodoistTask } from './types/task';
import { TodoistApi, TodoistApiError } from './services/todoist-api';
import { AuthService } from './services/auth';
import { convertTodoistTaskToTask, convertTaskToTodoistTask } from './utils/taskConverter';
import { calendarSlotToDate, getDateKey, findOptimalTimeSlot } from './utils/dateUtils';
import { timeSlots } from './constants/calendar';
import { touchDragManager } from './utils/touchDragUtils';
import { debugLogger } from './utils/debugLogger';
import TaskList from './components/TaskList/TaskList';
import Calendar, { CalendarViewMode } from './components/Calendar/Calendar';
import TaskModal from './components/TaskModal/TaskModal';
import TaskEditModal from './components/TaskModal/TaskEditModal';
import TaskCreateModal from './components/TaskModal/TaskCreateModal';
import DebugModal from './components/DebugModal/DebugModal';

function App() {
  // Add debug logging for component render
  debugLogger.info('APP_RENDER', 'App component rendering', { timestamp: Date.now() });

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
  const [isDebugModalOpen, setIsDebugModalOpen] = useState(false);
  
  // Debug state changes
  useEffect(() => {
    debugLogger.info('DEBUG_UI', 'Debug modal state changed', { isOpen: isDebugModalOpen });
  }, [isDebugModalOpen]);
  const draggedTaskRef = useRef<Task | null>(null);
  const draggedScheduledTaskRef = useRef<ScheduledTask | null>(null);
  const scheduledTasksRef = useRef<ScheduledTasks>({});

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
        
        debugLogger.info('INITIALIZATION', 'Loaded data from Todoist', { 
          tasks: todoistTasks.length, 
          projects: projectsList.length, 
          labels: labelsList.length 
        });
        setProjects(projectsList);
        setLabels(labelsList);
        debugLogger.info('INITIALIZATION', 'Sample tasks loaded', { 
          sampleTasks: todoistTasks.slice(0, 2).map(t => ({ id: t.id, content: t.content })) 
        });
        
        // Separate unscheduled and scheduled tasks
        const unscheduledTasks = todoistTasks
          .filter(task => !task.due)
          .map(task => convertTodoistTaskToTask(task, projectsList, labelsList));
          
        const scheduledTasks = todoistTasks
          .filter(task => task.due && task.due.date) // Only check for due.date as it's always present
          .map(task => convertTodoistTaskToTask(task, projectsList, labelsList));
          
        debugLogger.info('INITIALIZATION', 'Scheduled tasks found', { count: scheduledTasks.length });
        debugLogger.info('INITIALIZATION', 'First scheduled tasks', { 
          tasks: scheduledTasks.slice(0, 3).map(t => ({ id: t.id, title: t.title })) 
        });
        
        // Convert scheduled tasks to ScheduledTasks format
        const scheduledTasksMap: ScheduledTasks = {};
        scheduledTasks.forEach(task => {
          const originalTodoistTask = todoistTasks.find(t => t.id === task.id);
          
          if (originalTodoistTask?.due?.date) {
            let dueDate: Date;
            let timeKey: string;
            
            // Parse the due date - it might be in different formats
            const dueDateString = originalTodoistTask.due.date;
            debugLogger.info('TASK_PROCESSING', 'Processing task due date', { 
              taskTitle: task.title, 
              dueDateString 
            });
            
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
                debugLogger.warn('TASK_PROCESSING', 'Invalid date for task', { 
                  taskTitle: task.title, 
                  dueDateString 
                });
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
              debugLogger.info('TASK_PROCESSING', 'Adding scheduled task to slot', { 
                slotKey, 
                taskTitle: task.title 
              });
              
              if (!scheduledTasksMap[slotKey]) {
                scheduledTasksMap[slotKey] = [];
              }
              scheduledTasksMap[slotKey].push(scheduledTask);
              
            } catch (error) {
              debugLogger.error('TASK_PROCESSING', 'Error processing due date', { 
                taskTitle: task.title, 
                error: error instanceof Error ? error.message : String(error) 
              });
            }
          }
        });
        
        debugLogger.info('INITIALIZATION', 'Final scheduled tasks map created', { 
          entriesCount: Object.keys(scheduledTasksMap).length 
        });
        debugLogger.info('INITIALIZATION', 'Scheduled task keys', { 
          keys: Object.keys(scheduledTasksMap) 
        });
        
        setTasks(unscheduledTasks);
        setScheduledTasks(scheduledTasksMap);
        scheduledTasksRef.current = scheduledTasksMap;
        setError(null);
      } catch (err) {
        debugLogger.error('INITIALIZATION', 'Failed to load tasks', { error: err instanceof Error ? err.message : String(err) });
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

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const target = e.target as HTMLElement;
    
    debugLogger.info('DROP_HANDLER', 'handleDrop called', {
      targetClassName: target?.className,
      targetData: {
        date: target.dataset?.date,
        time: target.dataset?.time
      }
    });
    
    // Find the correct drop target (may be a child element)
    // For touch drag, the target IS the drop target, so check it first
    const dropTarget = target.classList.contains('time-slot') || target.classList.contains('month-day') 
      ? target 
      : target.closest('.time-slot, .month-day') as HTMLElement;
    
    debugLogger.info('DROP_HANDLER', 'Drop target search result', {
      hasDropTarget: !!dropTarget,
      dropTargetClassName: dropTarget?.className,
      dropTargetData: dropTarget ? {
        date: dropTarget.dataset?.date,
        time: dropTarget.dataset?.time
      } : null
    });
    
    if (!dropTarget) {
      debugLogger.warn('DROP_HANDLER', 'No drop target found, aborting');
      return;
    }
    
    dropTarget.classList.remove('drop-zone-active', 'drop-zone-hover');

    // Support both week view (.time-slot) and month view (.month-day)
    const isWeekViewSlot = dropTarget.classList.contains('time-slot') && !dropTarget.classList.contains('time-label');
    const isMonthViewDay = dropTarget.classList.contains('month-day');
    
    debugLogger.info('DROP_HANDLER', 'Drop target validation', {
      isWeekViewSlot,
      isMonthViewDay,
      hasTimeSlotClass: dropTarget.classList.contains('time-slot'),
      hasTimeLabelClass: dropTarget.classList.contains('time-label'),
      hasMonthDayClass: dropTarget.classList.contains('month-day'),
      allClasses: Array.from(dropTarget.classList)
    });
    
    if (!isWeekViewSlot && !isMonthViewDay) {
      debugLogger.warn('DROP_HANDLER', 'Drop target validation failed, not a valid slot');
      return;
    }

    const date = dropTarget.dataset.date;
    const time = dropTarget.dataset.time;
    
    debugLogger.info('DROP_HANDLER', 'Drop target data extracted', {
      date,
      time
    });
    
    // Handle both unscheduled tasks and scheduled tasks being moved between calendar slots
    const draggedTask = draggedTaskRef.current;
    const draggedScheduledTask = draggedScheduledTaskRef.current;
    
    debugLogger.info('DROP_HANDLER', 'Dragged task data', {
      hasDraggedTask: !!draggedTask,
      hasDraggedScheduledTask: !!draggedScheduledTask,
      draggedTaskTitle: draggedTask?.title || draggedScheduledTask?.title,
      draggedTaskId: draggedTask?.id || draggedScheduledTask?.id
    });
    
    if (!draggedTask && !draggedScheduledTask) {
      debugLogger.warn('DROP_HANDLER', 'No dragged task found, aborting');
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
        finalTime = findOptimalTimeSlot(calendarDate, scheduledTasksRef.current, timeSlots);
        debugLogger.info('SMART_SCHEDULING', 'Month view smart time selection', { 
          originalTime: time, 
          selectedTime: finalTime 
        });
      }
      
      const dateSlotKey = `${date}-${finalTime}`;

      try {

        // Convert to ISO datetime for Todoist API
        const dueDateTime = calendarSlotToDate(calendarDate, finalTime);
        
        debugLogger.info('TASK_SCHEDULING', 'Scheduling task', {
          taskId: taskToSchedule.id,
          taskTitle: taskToSchedule.title,
          originalDate: date,
          originalTime: time,
          finalTime: finalTime,
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

        debugLogger.info('TASK_SCHEDULING', 'Task scheduled successfully', { 
          taskTitle: taskToSchedule.title, 
          dueDateTime 
        });

      } catch (error) {
        debugLogger.error('TASK_SCHEDULING', 'Failed to update task due date', { error: error instanceof Error ? error.message : String(error) });
        debugLogger.error('TASK_SCHEDULING', 'Failed request details', {
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
  }, [draggedTaskRef, draggedScheduledTaskRef]);

  // Set up touch drag callbacks (must be before conditional returns)
  useEffect(() => {
    try {
      debugLogger.info('APP_SETUP', 'useEffect for touch drag callbacks STARTING', {
        handleDropFunction: !!handleDrop,
        timestamp: Date.now(),
        isAuthenticated,
        loading,
        error: !!error
      });
      
      touchDragManager.setGlobalCallbacks({
      onDragEnd: (task, dropTarget) => {
        debugLogger.info('APP_DRAG_END', 'CALLBACK ENTRY - This should always show!', {});
        debugLogger.info('APP_DRAG_END', 'Touch drag ended - callback called', {
          task: task?.title,
          dropTarget: dropTarget?.className,
          hasDataDate: !!dropTarget?.dataset.date,
          hasDataTime: !!dropTarget?.dataset.time,
          dataDate: dropTarget?.dataset.date,
          dataTime: dropTarget?.dataset.time,
          taskType: typeof task,
          hasTimeProperty: 'time' in (task || {}),
          taskKeys: task ? Object.keys(task) : []
        });
        
        if (!dropTarget) {
          debugLogger.warn('APP_DRAG_END', 'No drop target found, aborting drop');
          return;
        }
        
        // Verify drop target has required data attributes
        if (!dropTarget.dataset.date || !dropTarget.dataset.time) {
          debugLogger.error('APP_DRAG_END', 'Drop target missing required data attributes', {
            date: dropTarget.dataset.date,
            time: dropTarget.dataset.time
          });
          return;
        }
        
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
        
        // Create a proper synthetic React DragEvent for the drop handler
        const syntheticEvent = {
          preventDefault: () => {},
          stopPropagation: () => {},
          target: dropTarget,
          currentTarget: dropTarget,
          bubbles: true,
          cancelable: true,
          dataTransfer: {
            dropEffect: 'move' as const,
            effectAllowed: 'move' as const,
            setData: () => {},
            getData: () => '',
            files: [] as unknown as FileList,
            items: [] as unknown as DataTransferItemList,
            types: [] as string[]
          },
          // Add missing event properties to satisfy TypeScript
          altKey: false,
          button: 0,
          buttons: 0,
          clientX: 0,
          clientY: 0,
          ctrlKey: false,
          metaKey: false,
          shiftKey: false,
          detail: 0,
          pageX: 0,
          pageY: 0,
          screenX: 0,
          screenY: 0,
          timeStamp: Date.now(),
          type: 'drop',
          nativeEvent: {} as DragEvent,
          isDefaultPrevented: () => false,
          isPropagationStopped: () => false,
          persist: () => {}
        } as unknown as React.DragEvent<HTMLDivElement>;
        
        // Call the drop handler directly instead of dispatching an event
        debugLogger.info('APP_DRAG_END', 'About to call handleDrop from touch manager', {
          targetClassName: dropTarget?.className,
          syntheticEventTarget: syntheticEvent.target,
          syntheticEventTargetClass: (syntheticEvent.target as HTMLElement)?.className
        });
        
        try {
          handleDrop(syntheticEvent);
          debugLogger.info('APP_DRAG_END', 'handleDrop called successfully');
        } catch (error) {
          debugLogger.error('APP_DRAG_END', 'handleDrop failed', { error });
        }
      }
    });
    
    debugLogger.info('APP_SETUP', 'useEffect for touch drag callbacks COMPLETED', {
      callbacksSet: true,
      timestamp: Date.now()
    });
    } catch (error) {
      debugLogger.error('APP_SETUP', 'Error in useEffect for touch drag callbacks', { error });
    }
  }, [handleDrop]);

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
      
      debugLogger.info('TASK_CREATION', 'Creating task', {
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
      
      debugLogger.info('TASK_CREATION', 'Task created successfully', { 
        taskTitle: taskData.title, 
        projectName: taskData.projectName 
      });
      
    } catch (error) {
      debugLogger.error('TASK_CREATION', 'Failed to create task', { error: error instanceof Error ? error.message : String(error) });
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
          debugLogger.info('LABEL_CREATION', 'Creating new label', { labelName: name });
          const newLabel = await TodoistApi.createLabel({ name });
          labelIds.push(newLabel.id);
          // Update local labels state
          setLabels(prev => [...prev, newLabel]);
        } catch (error) {
          debugLogger.error('LABEL_CREATION', 'Failed to create label', { 
            labelName: name, 
            error: error instanceof Error ? error.message : String(error) 
          });
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
          debugLogger.info('LABEL_CREATION', 'Creating new label', { labelName: name });
          const newLabel = await TodoistApi.createLabel({ name });
          labelIds.push(newLabel.id);
          // Add to the updated labels array for immediate use
          updatedLabels = [...updatedLabels, newLabel];
          // Also update the component state
          setLabels(prev => [...prev, newLabel]);
        } catch (error) {
          debugLogger.error('LABEL_CREATION', 'Failed to create label', { 
            labelName: name, 
            error: error instanceof Error ? error.message : String(error) 
          });
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
      
      debugLogger.info('TASK_UNSCHEDULING', 'Task unscheduled via drag and drop', { 
        taskTitle: scheduledTask.title 
      });
      
    } catch (error) {
      debugLogger.error('TASK_UNSCHEDULING', 'Failed to unschedule task', { error: error instanceof Error ? error.message : String(error) });
      
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
        
        debugLogger.info('TASK_UNSCHEDULING', 'Task unscheduled from modal', { 
          taskTitle: modalTask.title 
        });
        handleCloseModal();
        
      } catch (error) {
        debugLogger.error('TASK_UNSCHEDULING', 'Failed to unschedule task', { error: error instanceof Error ? error.message : String(error) });
        
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

      debugLogger.info('TASK_EDITING', 'Task updated successfully', { 
        taskTitle: updatedTaskData.title || editingTask.title 
      });

    } catch (error) {
      debugLogger.error('TASK_EDITING', 'Failed to update task', { error: error instanceof Error ? error.message : String(error) });
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
      debugLogger.info('PROJECT_CREATION', 'Creating project', { projectName: name });
      const newProject = await TodoistApi.createProject({ name });
      
      setProjects(prev => [...prev, newProject]);
      debugLogger.info('PROJECT_CREATION', 'Project created successfully', { projectName: name });
      
    } catch (error) {
      debugLogger.error('PROJECT_CREATION', 'Failed to create project', { error: error instanceof Error ? error.message : String(error) });
      const errorMessage = error instanceof TodoistApiError 
        ? `Failed to create project: ${error.message}` 
        : 'Failed to create project. Please try again.';
      throw new Error(errorMessage);
    }
  };

  const handleRenameProject = async (projectId: string, newName: string): Promise<void> => {
    try {
      debugLogger.info('PROJECT_RENAMING', 'Renaming project', { projectId, newName });
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
      
      debugLogger.info('PROJECT_RENAMING', 'Project renamed successfully', { newName });
      
    } catch (error) {
      debugLogger.error('PROJECT_RENAMING', 'Failed to rename project', { error: error instanceof Error ? error.message : String(error) });
      const errorMessage = error instanceof TodoistApiError 
        ? `Failed to rename project: ${error.message}` 
        : 'Failed to rename project. Please try again.';
      throw new Error(errorMessage);
    }
  };


  if (loading) {
    debugLogger.info('APP_RENDER', 'Returning loading state', { loading, isAuthenticated, error: !!error });
    return (
      <div className="container">
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <div>Loading tasks...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    debugLogger.info('APP_RENDER', 'Returning unauthenticated state', { loading, isAuthenticated, error: !!error });
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
    debugLogger.info('APP_RENDER', 'Returning error state', { loading, isAuthenticated, error: !!error });
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

  debugLogger.info('APP_RENDER', 'Returning main app UI', { loading, isAuthenticated, error: !!error, tasksCount: tasks.length });
  
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
      <DebugModal
        isOpen={isDebugModalOpen}
        onClose={() => setIsDebugModalOpen(false)}
      />
      <button
        className="debug-button"
        onClick={() => {
          debugLogger.info('DEBUG_UI', 'Debug button clicked', {});
          setIsDebugModalOpen(true);
        }}
        title="Debug Logs"
      >
        🐛
      </button>
    </div>
  );
}

export default App;