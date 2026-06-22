import type { Resource, EventItem } from '@/components/Scheduler/types';

// Deterministic PRNG helpers: the same date must always produce the same dummy
// data, so navigating away from a date and back shows an identical schedule.
const hashString = (str: string): number => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

// mulberry32 — small, fast seeded RNG returning a float in [0, 1).
const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const generateStressTestData = (resourceCount: number = 1000, baseDate: Date = new Date(2026, 5, 18)) => {
  const roles = ['PLUMBING', 'ELECTRICAL', 'HVAC', 'CARPENTRY', 'ROOFING', 'PAINTING', 'CLEANING'];
  const statuses: EventItem['status'][] = ['Ongoing', 'New', 'Completed', 'Cancelled'];
  const locations = ['North Sydney', 'Westmead', 'Faulkner Street', 'Asaro Street', 'Eastwood', 'Epping', 'Ryde'];
  const firstNames = ['Michael', 'Emily', 'David', 'Sarah', 'James', 'Anna', 'Robert', 'Lisa', 'William', 'Karen'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];

  const resources: Resource[] = [];
  const events: EventItem[] = [];

  const year = baseDate.getFullYear();
  const month = String(baseDate.getMonth() + 1).padStart(2, '0');
  const day = String(baseDate.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;

  // Seed the RNG from the date (and resource count) so the dataset is fully
  // reproducible for a given day, while still differing day to day.
  const rng = mulberry32(hashString(`${dateStr}|${resourceCount}`));

  for (let i = 1; i <= resourceCount; i++) {
    const fn = firstNames[Math.floor(rng() * firstNames.length)];
    const ln = lastNames[Math.floor(rng() * lastNames.length)];
    const name = `${fn} ${ln} (#${i})`;
    const avatar = `${fn[0]}${ln[0]}`;
    const role = roles[Math.floor(rng() * roles.length)];
    const id = `resource-${i}`;

    resources.push({
      id,
      name,
      avatar,
      metadata: { role, jobsCount: 0 }
    });

    // Generate 1-2 events for most resources to keep the UI rich but responsive.
    const eventCount = Math.floor(rng() * 2) + 1; // 1 or 2 events
    resources[resources.length - 1].metadata!.jobsCount = eventCount;

    for (let j = 1; j <= eventCount; j++) {
      const status = statuses[Math.floor(rng() * statuses.length)];
      const location = locations[Math.floor(rng() * locations.length)];

      // Let's schedule within 6:00 to 20:00.
      let startHour = 6;
      let durationHours = 2 + rng() * 3; // 2 to 5 hours

      if (j === 1) {
        startHour = 6 + Math.floor(rng() * 4); // 6 to 10
      } else {
        startHour = 12 + Math.floor(rng() * 4); // 12 to 16
      }

      const startMinutes = rng() > 0.5 ? 30 : 0;
      const startHourDecimal = startHour + startMinutes / 60;
      const endHourDecimal = Math.min(20, startHourDecimal + durationHours);

      const startTime = new Date(baseDate);
      startTime.setHours(Math.floor(startHourDecimal), (startHourDecimal % 1) * 60, 0, 0);

      const endTime = new Date(baseDate);
      endTime.setHours(Math.floor(endHourDecimal), (endHourDecimal % 1) * 60, 0, 0);

      events.push({
        id: `event-${i}-${j}-${dateStr}`,
        resourceId: id,
        title: `${role} Service Call #${i}-${j}`,
        startTime,
        endTime,
        status,
        metadata: {
          location,
          price: Math.floor(100 + rng() * 200),
          dispatched: rng() > 0.3
        }
      });
    }
  }

  return { resources, events };
};
