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

export interface ResourceSchedulerProps {
  resources: Resource[];
  events: EventItem[];
  dayStartHour?: number; // e.g. 6 for 6 AM
  dayEndHour?: number;   // e.g. 20 for 8 PM
  renderResource?: (resource: Resource, onGripMouseDown?: (e: React.PointerEvent) => void) => React.ReactNode;
  renderEvent?: (event: EventItem, onDragStart?: (e: React.PointerEvent) => void, onResizeStart?: (e: React.PointerEvent) => void) => React.ReactNode;
  onEventChange?: (event: EventItem) => void;
  onEventAdd?: (event: EventItem) => void;
  onResourcesReorder?: (resources: Resource[]) => void;
}
