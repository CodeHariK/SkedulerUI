import type { Resource, EventItem } from './types';

export const mockResources: Resource[] = [
  {
    id: 'unassigned',
    name: 'Unassigned',
    avatar: 'U',
    metadata: { role: 'UNASSIGNED', jobsCount: 0 }
  },
  {
    id: 'james-wilson',
    name: 'James Wilson',
    avatar: 'JW',
    metadata: { role: 'PLUMBING', jobsCount: 2 }
  },
  {
    id: 'sarah-chen',
    name: 'Sarah Chen',
    avatar: 'SC',
    metadata: { role: 'ELECTRICAL', jobsCount: 2 }
  },
  {
    id: 'mike-rodriguez',
    name: 'Mike Rodriguez',
    avatar: 'MR',
    metadata: { role: 'HVAC', jobsCount: 1 }
  },
  {
    id: 'emily-park',
    name: 'Emily Park',
    avatar: 'EP',
    metadata: { role: 'PLUMBING', jobsCount: 2 }
  },
  {
    id: 'david-kim',
    name: 'David Kim',
    avatar: 'DK',
    metadata: { role: 'ELECTRICAL', jobsCount: 3 }
  }
];

export const mockEvents: EventItem[] = [
  // James Wilson's jobs
  {
    id: 'job-1',
    resourceId: 'james-wilson',
    title: 'Pipe Burst #14 Armidale',
    startTime: new Date('2026-06-18T08:30:00'),
    endTime: new Date('2026-06-18T11:00:00'),
    status: 'Ongoing',
    metadata: { location: 'Faulkner Street', price: 150, dispatched: true }
  },
  {
    id: 'job-2',
    resourceId: 'james-wilson',
    title: 'Pipe Burst #11 Armidale',
    startTime: new Date('2026-06-18T12:00:00'),
    endTime: new Date('2026-06-18T14:30:00'),
    status: 'New',
    metadata: { location: 'Faulkner Street', price: 150, dispatched: true }
  },
  // Sarah Chen's jobs
  {
    id: 'job-3',
    resourceId: 'sarah-chen',
    title: 'Blocked Drain #17',
    startTime: new Date('2026-06-18T09:00:00'),
    endTime: new Date('2026-06-18T11:30:00'),
    status: 'Completed',
    metadata: { location: 'Asaro Street', price: 150 }
  },
  {
    id: 'job-4',
    resourceId: 'sarah-chen',
    title: 'Tab Fixing #16 Kingsthorpe',
    startTime: new Date('2026-06-18T13:00:00'),
    endTime: new Date('2026-06-18T15:30:00'),
    status: 'New',
    metadata: { location: 'Asaro Street', price: 150 }
  },
  // Mike Rodriguez's jobs
  {
    id: 'job-5',
    resourceId: 'mike-rodriguez',
    title: 'Smoke Alarm Compliance #18',
    startTime: new Date('2026-06-18T12:00:00'),
    endTime: new Date('2026-06-18T14:45:00'),
    status: 'Ongoing',
    metadata: { location: 'Asaro Street', price: 150 }
  },
  // Emily Park's jobs
  {
    id: 'job-6',
    resourceId: 'emily-park',
    title: 'Blocked Drain #23',
    startTime: new Date('2026-06-18T07:00:00'),
    endTime: new Date('2026-06-18T09:30:00'),
    status: 'Cancelled',
    metadata: { location: 'Westmead', price: 150 }
  },
  {
    id: 'job-7',
    resourceId: 'emily-park',
    title: 'Split System Installation #19',
    startTime: new Date('2026-06-18T10:30:00'),
    endTime: new Date('2026-06-18T13:00:00'),
    status: 'Ongoing',
    metadata: { location: 'Westmead', price: 150 }
  }
];
