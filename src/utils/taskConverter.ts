import { Task, TodoistTask } from '../types/task';

export function convertTodoistTaskToTask(todoistTask: TodoistTask): Task {
  // Convert Todoist priority (1-4) to our format (p1-p4)
  const priorityMap: { [key: number]: 'p1' | 'p2' | 'p3' | 'p4' } = {
    4: 'p1', // Todoist priority 4 = highest (p1)
    3: 'p2', // Todoist priority 3 = high (p2)
    2: 'p3', // Todoist priority 2 = medium (p3)
    1: 'p4'  // Todoist priority 1 = normal/low (p4)
  };

  return {
    id: todoistTask.id,
    title: todoistTask.content,
    description: todoistTask.description || '',
    priority: priorityMap[todoistTask.priority] || 'p4',
    labels: todoistTask.labels || []
  };
}

export function convertTaskToTodoistTask(task: Task, projectId?: string): Partial<TodoistTask> {
  // Convert our priority format (p1-p4) to Todoist (1-4)
  const priorityMap: { [key: string]: 1 | 2 | 3 | 4 } = {
    'p1': 4, // p1 = highest = Todoist priority 4
    'p2': 3, // p2 = high = Todoist priority 3
    'p3': 2, // p3 = medium = Todoist priority 2
    'p4': 1  // p4 = normal/low = Todoist priority 1
  };

  const todoistTask: Partial<TodoistTask> = {
    content: task.title,
    description: task.description || '',
    priority: priorityMap[task.priority] || 1,
    labels: task.labels || []
  };

  if (projectId) {
    todoistTask.project_id = projectId;
  }

  return todoistTask;
}