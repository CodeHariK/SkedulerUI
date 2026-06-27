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

/** Fields that can be shown on an event card in the timeline. */
export type CardFieldKey =
  | 'title'
  | 'jobNumber'
  | 'location'
  | 'status'
  | 'dispatch'
  | 'price'
  | 'time'
  | 'technician';

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
  /** Light/dark appearance applied when this template is active. */
  theme: 'light' | 'dark';
  /** Whether the event detail card opens on hover or on click. */
  detailTrigger: 'hover' | 'click';
  /**
   * Event-card layout: each inner array is a row of field keys, in render order.
   * Fields absent from every row are hidden. Up to 3 rows.
   */
  cardRows: CardFieldKey[][];
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

