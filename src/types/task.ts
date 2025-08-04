export interface Task {
  id: number;
  title: string;
  description: string;
  priority: 'p1' | 'p2' | 'p3' | 'p4';
  labels: string[];
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