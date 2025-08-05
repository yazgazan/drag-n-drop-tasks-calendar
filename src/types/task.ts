export interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'p1' | 'p2' | 'p3' | 'p4';
  labels: string[];
  project_id?: string;
  project_name?: string;
}

export interface TodoistTask {
  id: string;
  content: string;
  description: string;
  project_id: string;
  labels: string[];
  priority: 1 | 2 | 3 | 4;
  due?: {
    date: string;
    datetime?: string;
    timezone?: string;
  };
  due_datetime?: string; // For updating tasks with specific datetime
  parent_id?: string;
  order: number;
  url: string;
  created_at: string;
}

export interface TodoistProject {
  id: string;
  name: string;
  comment_count: number;
  order: number;
  color: string;
  is_shared: boolean;
  is_favorite: boolean;
  is_inbox_project: boolean;
  is_team_inbox: boolean;
  view_style: string;
  url: string;
  parent_id?: string;
}

export interface TodoistLabel {
  id: string;
  name: string;
  color: string;
  order: number;
  is_favorite: boolean;
}

export interface ScheduledTask extends Task {
  day: string;
  time: string;
  date?: string; // ISO date string (YYYY-MM-DD) for new date-based system
}

export interface ScheduledTasks {
  [key: string]: ScheduledTask;
}

export interface ModalTaskData {
  task: Task;
  day: string;
  time: string;
  slot: HTMLElement;
}

// New API v1 Types
export interface SyncResponse {
  sync_token: string;
  full_sync: boolean;
  items?: TodoistTask[];
  projects?: TodoistProject[];
  labels?: TodoistLabel[];
  sync_status?: SyncStatus;
}

export interface SyncStatus {
  [uuid: string]: {
    error_code?: number;
    error?: string;
    error_extra?: unknown;
  };
}

export interface Command {
  type: string;
  uuid: string;
  args: Record<string, unknown>;
  temp_id?: string;
}

export interface SyncRequest {
  sync_token: string;
  resource_types?: string[];
  commands?: Command[];
}