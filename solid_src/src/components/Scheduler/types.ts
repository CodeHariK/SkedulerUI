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

export interface NewEventData {
  resourceId: string;
  startTime: Date;
  endTime: Date;
  title: string;
  location: string;
  price: number;
  status: 'Ongoing' | 'New' | 'Completed' | 'Cancelled';
}

