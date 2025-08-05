import { AuthService } from './auth';
import { TodoistTask, TodoistProject, TodoistLabel } from '../types/task';

export class TodoistApiError extends Error {
  constructor(message: string, public status?: number, public response?: unknown) {
    super(message);
    this.name = 'TodoistApiError';
  }
}

export class TodoistApi {
  private static readonly BASE_URL = 'https://api.todoist.com/rest/v2';

  private static async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = AuthService.getToken();
    if (!token) {
      throw new TodoistApiError('No authentication token found');
    }

    const url = `${this.BASE_URL}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new TodoistApiError(
          `API request failed: ${response.statusText}`,
          response.status,
          errorData
        );
      }

      if (response.status === 204) {
        return {} as T;
      }

      return await response.json();
    } catch (error) {
      if (error instanceof TodoistApiError) {
        throw error;
      }
      throw new TodoistApiError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async getTasks(): Promise<TodoistTask[]> {
    return this.makeRequest<TodoistTask[]>('/tasks');
  }

  static async getTask(taskId: string): Promise<TodoistTask> {
    return this.makeRequest<TodoistTask>(`/tasks/${taskId}`);
  }

  static async createTask(task: Partial<TodoistTask>): Promise<TodoistTask> {
    return this.makeRequest<TodoistTask>('/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  }

  static async updateTask(taskId: string, updates: Partial<TodoistTask>): Promise<TodoistTask> {
    return this.makeRequest<TodoistTask>(`/tasks/${taskId}`, {
      method: 'POST',
      body: JSON.stringify(updates),
    });
  }

  static async clearTaskDueDate(taskId: string): Promise<TodoistTask> {
    // According to Todoist API docs, sending an empty string for due_string clears the due date
    return this.makeRequest<TodoistTask>(`/tasks/${taskId}`, {
      method: 'POST',
      body: JSON.stringify({ due_string: '' }),
    });
  }

  static async deleteTask(taskId: string): Promise<void> {
    return this.makeRequest<void>(`/tasks/${taskId}`, {
      method: 'DELETE',
    });
  }

  static async getProjects(): Promise<TodoistProject[]> {
    return this.makeRequest<TodoistProject[]>('/projects');
  }

  static async getLabels(): Promise<TodoistLabel[]> {
    return this.makeRequest<TodoistLabel[]>('/labels');
  }
}