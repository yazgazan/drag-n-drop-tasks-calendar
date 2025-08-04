export interface Task {
  id: number;
  title: string;
  description: string;
  priority: 'p1' | 'p2' | 'p3' | 'p4';
  labels: string[];
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