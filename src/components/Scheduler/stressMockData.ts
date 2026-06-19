import type { Resource, EventItem } from './types';

export const generateStressTestData = (resourceCount: number = 1000) => {
  const roles = ['PLUMBING', 'ELECTRICAL', 'HVAC', 'CARPENTRY', 'ROOFING', 'PAINTING', 'CLEANING'];
  const statuses: EventItem['status'][] = ['Ongoing', 'New', 'Completed', 'Cancelled'];
  const locations = ['North Sydney', 'Westmead', 'Faulkner Street', 'Asaro Street', 'Eastwood', 'Epping', 'Ryde'];
  const firstNames = ['John', 'Jane', 'Michael', 'Emily', 'David', 'Sarah', 'James', 'Anna', 'Robert', 'Lisa', 'William', 'Karen'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];

  const resources: Resource[] = [];
  const events: EventItem[] = [];

  for (let i = 1; i <= resourceCount; i++) {
    const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
    const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
    const name = `${fn} ${ln} (#${i})`;
    const avatar = `${fn[0]}${ln[0]}`;
    const role = roles[Math.floor(Math.random() * roles.length)];
    const id = `resource-${i}`;

    resources.push({
      id,
      name,
      avatar,
      metadata: { role, jobsCount: 0 }
    });

    // Generate 1-2 events for most resources to keep the UI rich but responsive.
    const eventCount = Math.floor(Math.random() * 2) + 1; // 1 or 2 events
    resources[resources.length - 1].metadata!.jobsCount = eventCount;

    for (let j = 1; j <= eventCount; j++) {
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const location = locations[Math.floor(Math.random() * locations.length)];
      
      // Let's schedule within 6:00 to 20:00.
      let startHour = 6;
      let durationHours = 2 + Math.random() * 3; // 2 to 5 hours

      if (j === 1) {
        startHour = 6 + Math.floor(Math.random() * 4); // 6 to 10
      } else {
        startHour = 12 + Math.floor(Math.random() * 4); // 12 to 16
      }

      const startMinutes = Math.random() > 0.5 ? 30 : 0;
      const startHourDecimal = startHour + startMinutes / 60;
      const endHourDecimal = Math.min(20, startHourDecimal + durationHours);

      const startTime = new Date('2026-06-18');
      startTime.setHours(Math.floor(startHourDecimal), (startHourDecimal % 1) * 60, 0, 0);

      const endTime = new Date('2026-06-18');
      endTime.setHours(Math.floor(endHourDecimal), (endHourDecimal % 1) * 60, 0, 0);

      events.push({
        id: `event-${i}-${j}`,
        resourceId: id,
        title: `${role} Service Call #${i}-${j}`,
        startTime,
        endTime,
        status,
        metadata: {
          location,
          price: Math.floor(100 + Math.random() * 200),
          dispatched: Math.random() > 0.3
        }
      });
    }
  }

  return { resources, events };
};
