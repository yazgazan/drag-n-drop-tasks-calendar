import { AuthService } from './auth';
import { TodoistTask, TodoistProject, TodoistLabel, SyncResponse, Command, SyncRequest } from '../types/task';

export class TodoistApiError extends Error {
  constructor(message: string, public status?: number, public response?: unknown) {
    super(message);
    this.name = 'TodoistApiError';
  }
}

export class TodoistApi {
  private static readonly BASE_URL = 'https://api.todoist.com/api/v1/sync';
  private static syncToken: string = '*'; // Start with full sync

  private static async makeRequest<T>(data: SyncRequest): Promise<T> {
    const token = AuthService.getToken();
    if (!token) {
      throw new TodoistApiError('No authentication token found');
    }

    const url = this.BASE_URL;
    const formData = new URLSearchParams();
    
    // Convert SyncRequest to form data
    formData.append('sync_token', data.sync_token);
    if (data.resource_types) {
      formData.append('resource_types', JSON.stringify(data.resource_types));
    }
    if (data.commands) {
      formData.append('commands', JSON.stringify(data.commands));
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    console.log('Making sync request:', {
      url,
      syncToken: data.sync_token,
      resourceTypes: data.resource_types,
      commands: data.commands
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Todoist API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          url: url,
          errorData: errorData
        });
        throw new TodoistApiError(
          `API request failed: ${response.statusText} (${response.status})`,
          response.status,
          errorData
        );
      }

      const result = await response.json();
      
      console.log('Sync response:', {
        hasItems: !!result.items,
        itemsCount: result.items?.length || 0,
        hasProjects: !!result.projects,
        projectsCount: result.projects?.length || 0,
        syncToken: result.sync_token,
        fullSync: result.full_sync
      });
      
      // Update sync token for future requests
      if (result.sync_token) {
        this.syncToken = result.sync_token;
      }
      
      return result;
    } catch (error) {
      if (error instanceof TodoistApiError) {
        throw error;
      }
      throw new TodoistApiError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  static async sync(resourceTypes: string[] = ['all']): Promise<SyncResponse> {
    return this.makeRequest<SyncResponse>({
      sync_token: this.syncToken,
      resource_types: resourceTypes
    });
  }

  static async executeCommands(commands: Command[]): Promise<SyncResponse> {
    return this.makeRequest<SyncResponse>({
      sync_token: this.syncToken,
      commands: commands
    });
  }

  static async getTasks(): Promise<TodoistTask[]> {
    const response = await this.sync(['items']);
    console.log('getTasks response:', response);
    return response.items || [];
  }

  static async getTask(taskId: string): Promise<TodoistTask> {
    const tasks = await this.getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
      throw new TodoistApiError(`Task with id ${taskId} not found`);
    }
    return task;
  }

  static async createTask(task: Partial<TodoistTask>): Promise<TodoistTask> {
    const tempId = this.generateUUID();
    const command: Command = {
      type: 'item_add',
      uuid: this.generateUUID(),
      args: {
        ...task,
        temp_id: tempId
      }
    };
    
    const response = await this.executeCommands([command]);
    
    // Check for command execution errors
    if (response.sync_status?.[command.uuid]?.error) {
      throw new TodoistApiError(response.sync_status[command.uuid].error!);
    }
    
    // Return the created task from items array or construct from args
    const createdTask = response.items?.find(item => item.id === tempId);
    if (createdTask) {
      return createdTask;
    }
    
    // Fallback: fetch all tasks to find the newly created one
    const allTasks = await this.getTasks();
    const newTask = allTasks.find(t => t.content === task.content && t.project_id === task.project_id);
    if (!newTask) {
      throw new TodoistApiError('Failed to retrieve created task');
    }
    return newTask;
  }

  static async updateTask(taskId: string, updates: Partial<TodoistTask>): Promise<TodoistTask> {
    const command: Command = {
      type: 'item_update',
      uuid: this.generateUUID(),
      args: {
        id: taskId,
        ...updates
      }
    };
    
    console.log('Executing update command:', command);
    const response = await this.executeCommands([command]);
    
    console.log('Update task response:', {
      hasSyncStatus: !!response.sync_status,
      syncStatus: response.sync_status,
      commandUuid: command.uuid,
      fullResponse: response
    });
    
    // Check for command execution errors
    if (response.sync_status?.[command.uuid]?.error) {
      throw new TodoistApiError(response.sync_status[command.uuid].error!);
    }
    
    // If no sync_status, it might mean the command was invalid
    if (!response.sync_status) {
      console.warn('No sync_status in response - command may have failed silently');
    }
    
    // Check if the updated task is in the response (only in full sync)
    const updatedTask = response.items?.find(item => item.id === taskId);
    if (updatedTask) {
      return updatedTask;
    }
    
    // For incremental sync, the task won't be in items array unless it's a new task
    // Since the command was successful, we can construct the response or return a simplified task
    // For now, we'll return a minimal task object since the UI will update optimistically
    console.log('Task updated successfully but not returned in sync response (normal for incremental sync)');
    
    // Return a minimal task object - the UI has already been updated optimistically
    return {
      id: taskId,
      content: '',
      description: '',
      project_id: '',
      labels: [],
      priority: 1,
      order: 0,
      url: '',
      created_at: new Date().toISOString(),
      ...updates
    } as TodoistTask;
  }

  static async clearTaskDueDate(taskId: string): Promise<TodoistTask> {
    console.log(`Clearing due date for task ${taskId}`);
    const command: Command = {
      type: 'item_update',
      uuid: this.generateUUID(),
      args: {
        id: taskId,
        due: null
      }
    };
    
    const response = await this.executeCommands([command]);
    
    // Check for command execution errors
    if (response.sync_status?.[command.uuid]?.error) {
      throw new TodoistApiError(response.sync_status[command.uuid].error!);
    }
    
    // Check if the updated task is in the response (only in full sync)
    const updatedTask = response.items?.find(item => item.id === taskId);
    if (updatedTask) {
      return updatedTask;
    }
    
    // For incremental sync, return a minimal task object since the command was successful
    console.log('Task due date cleared successfully');
    return {
      id: taskId,
      content: '',
      description: '',
      project_id: '',
      labels: [],
      priority: 1,
      order: 0,
      url: '',
      created_at: new Date().toISOString(),
      due: null
    } as TodoistTask;
  }

  static async deleteTask(taskId: string): Promise<void> {
    const command: Command = {
      type: 'item_delete',
      uuid: this.generateUUID(),
      args: {
        id: taskId
      }
    };
    
    const response = await this.executeCommands([command]);
    
    // Check for command execution errors
    if (response.sync_status?.[command.uuid]?.error) {
      throw new TodoistApiError(response.sync_status[command.uuid].error!);
    }
  }

  static async getProjects(): Promise<TodoistProject[]> {
    const response = await this.sync(['projects']);
    console.log('getProjects response:', response);
    return response.projects || [];
  }

  static async getLabels(): Promise<TodoistLabel[]> {
    const response = await this.sync(['labels']);
    return response.labels || [];
  }
}