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
    // Generate a temp_id for tracking the new item
    const tempId = `temp_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const command: Command = {
      type: 'item_add',
      uuid: this.generateUUID(),
      temp_id: tempId,
      args: {
        ...task
      }
    };
    
    console.log('Creating task with command:', JSON.stringify(command, null, 2));
    
    const response = await this.executeCommands([command]);
    
    console.log('Create task response:', JSON.stringify(response, null, 2));
    
    // Check for command execution errors
    const syncStatus = response.sync_status?.[command.uuid];
    if (syncStatus && typeof syncStatus === 'object' && syncStatus.error) {
      const errorMsg = syncStatus.error;
      console.error('Task creation failed with error:', errorMsg);
      throw new TodoistApiError(`Task creation failed: ${errorMsg}`);
    }
    
    // Check if there's no sync_status at all (could indicate invalid request)
    if (!response.sync_status && !response.items?.length) {
      console.error('No sync_status or items in response, likely an invalid request');
      throw new TodoistApiError('Task creation failed: Invalid request parameters');
    }
    
    // Check if we have a temp_id mapping to the real ID
    const realId = response.temp_id_mapping?.[tempId];
    if (realId) {
      console.log('Task created successfully with ID mapping:', tempId, '->', realId);
      // Try to find the task in the response items
      const createdTask = response.items?.find(item => item.id === realId);
      if (createdTask) {
        return createdTask;
      }
      
      // If not in response items, construct the task from our data
      console.log('Task not in response items, constructing from creation data...');
      return {
        id: realId,
        content: task.content || '',
        description: task.description || '',
        project_id: task.project_id || '',
        labels: task.labels || [],
        priority: task.priority || 1,
        order: 0,
        url: '',
        created_at: new Date().toISOString()
      } as TodoistTask;
    }
    
    // Return the created task from items array using temp_id
    const createdTask = response.items?.find(item => item.id === tempId);
    if (createdTask) {
      console.log('Task created successfully:', createdTask.id);
      return createdTask;
    }
    
    // If we have sync_status "ok" but no task in items, create from our data
    if (response.sync_status?.[command.uuid] === 'ok') {
      console.log('Task creation confirmed by sync_status, but not in items. Creating task object from input data.');
      return {
        id: `created_${Date.now()}`, // Fallback ID if no mapping
        content: task.content || '',
        description: task.description || '',
        project_id: task.project_id || '',
        labels: task.labels || [],
        priority: task.priority || 1,
        order: 0,
        url: '',
        created_at: new Date().toISOString()
      } as TodoistTask;
    }
    
    // Final fallback: fetch all tasks to find the newly created one
    console.log('Task not found in response, searching all tasks...');
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
    const syncStatus = response.sync_status?.[command.uuid];
    if (syncStatus && typeof syncStatus === 'object' && syncStatus.error) {
      throw new TodoistApiError(syncStatus.error);
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
    const syncStatus = response.sync_status?.[command.uuid];
    if (syncStatus && typeof syncStatus === 'object' && syncStatus.error) {
      throw new TodoistApiError(syncStatus.error);
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
      created_at: new Date().toISOString()
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
    const syncStatus = response.sync_status?.[command.uuid];
    if (syncStatus && typeof syncStatus === 'object' && syncStatus.error) {
      throw new TodoistApiError(syncStatus.error);
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

  static async createLabel(label: { name: string; color?: string }): Promise<TodoistLabel> {
    const command: Command = {
      type: 'label_add',
      uuid: this.generateUUID(),
      temp_id: `temp_label_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      args: {
        name: label.name,
        color: label.color || 'charcoal' // Default color
      }
    };
    
    console.log('Creating label with command:', JSON.stringify(command, null, 2));
    
    const response = await this.executeCommands([command]);
    
    console.log('Create label response:', JSON.stringify(response, null, 2));
    
    // Check for command execution errors
    const syncStatus = response.sync_status?.[command.uuid];
    if (syncStatus && typeof syncStatus === 'object' && syncStatus.error) {
      const errorMsg = syncStatus.error;
      console.error('Label creation failed with error:', errorMsg);
      throw new TodoistApiError(`Label creation failed: ${errorMsg}`);
    }
    
    // Check if we have a temp_id mapping to the real ID
    const realId = response.temp_id_mapping?.[command.temp_id!];
    if (realId) {
      console.log('Label created successfully with ID mapping:', command.temp_id, '->', realId);
      // Try to find the label in the response
      const createdLabel = response.labels?.find(l => l.id === realId);
      if (createdLabel) {
        return createdLabel;
      }
      
      // If not in response, construct from our data
      return {
        id: realId,
        name: label.name,
        color: label.color || 'charcoal',
        order: 0,
        is_favorite: false
      } as TodoistLabel;
    }
    
    // If we have sync_status "ok" but no mapping, create from our data
    if (response.sync_status?.[command.uuid] === 'ok') {
      console.log('Label creation confirmed by sync_status, creating label object from input data.');
      return {
        id: `created_label_${Date.now()}`,
        name: label.name,
        color: label.color || 'charcoal',
        order: 0,
        is_favorite: false
      } as TodoistLabel;
    }
    
    throw new TodoistApiError('Failed to create label');
  }
}