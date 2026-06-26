export interface Resource {
  id: string;
  name: string;
  avatar?: string;
  metadata?: {
    role?: string;
    jobsCount?: number;
    [key: string]: any;
  };
}

export interface EventItem {
  id: string;
  resourceId: string;
  title: string;
  startTime: Date;
  endTime: Date;
  status: 'Ongoing' | 'New' | 'Completed' | 'Cancelled';
  metadata?: {
    location?: string;
    price?: number;
    [key: string]: any;
  };
}

export interface SchedulerTemplate {
  id: string;
  name: string;
  /** Timeline start hour (0-23). */
  dayStartHour: number;
  /** Timeline end hour (1-24), must be greater than dayStartHour. */
  dayEndHour: number;
  /** Resource ids to display; null means "all technicians". */
  visibleResourceIds: string[] | null;
  /** Snap/grid interval in minutes (1, 5, 10, 15, 30, 60). */
  snapMinutes: number;
  /** Built-in templates can be applied but not edited or deleted. */
  isBuiltIn?: boolean;
}

export interface NewEventData {
  resourceId: string;
  startTime: Date;
  endTime: Date;
  title: string;
  location: string;
  price: number;
  status: 'Ongoing' | 'New' | 'Completed' | 'Cancelled';
}

