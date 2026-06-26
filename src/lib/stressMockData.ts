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

const ROLES = ['PLUMBING', 'ELECTRICAL', 'HVAC', 'CARPENTRY', 'ROOFING', 'PAINTING', 'CLEANING'];
const STATUSES: EventItem['status'][] = ['Ongoing', 'New', 'Completed', 'Cancelled'];
const LOCATIONS = ['North Sydney', 'Westmead', 'Faulkner Street', 'Asaro Street', 'Eastwood', 'Epping', 'Ryde'];
const FIRST_NAMES = ['Maya', 'Emily', 'Sarah', 'Anna', 'Lisa', 'Jane', 'Jessica', 'Kelly', 'Megan'];
const LAST_NAMES = ['Ghost', 'Kraken', 'Ninja', 'Wolf', 'Robot', 'Dragon', 'Shadow', 'Storm', 'Phantom'];

const dateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Generate events for an explicit set of resources on a given date. Seeded per
 * (resource id, date), so the result is deterministic AND independent of how
 * many resources are passed — a technician subset yields exactly the same
 * events for those technicians as the full roster would.
 */
export const generateEventsForResources = (resources: Resource[], date: Date): EventItem[] => {
  const dateStr = dateKey(date);
  const events: EventItem[] = [];

  resources.forEach((resource) => {
    const rng = mulberry32(hashString(`${dateStr}|${resource.id}`));
    const role = resource.metadata?.role || ROLES[Math.floor(rng() * ROLES.length)];
    const eventCount = Math.floor(rng() * 2) + 1; // 1 or 2 events

    for (let j = 1; j <= eventCount; j++) {
      const status = STATUSES[Math.floor(rng() * STATUSES.length)];
      const location = LOCATIONS[Math.floor(rng() * LOCATIONS.length)];

      // Schedule within 6:00 to 20:00.
      const durationHours = 2 + rng() * 3; // 2 to 5 hours
      const startHour = j === 1
        ? 6 + Math.floor(rng() * 4)   // 6 to 10
        : 12 + Math.floor(rng() * 4); // 12 to 16
      const startMinutes = rng() > 0.5 ? 30 : 0;
      const startHourDecimal = startHour + startMinutes / 60;
      const endHourDecimal = Math.min(20, startHourDecimal + durationHours);

      const startTime = new Date(date);
      startTime.setHours(Math.floor(startHourDecimal), (startHourDecimal % 1) * 60, 0, 0);

      const endTime = new Date(date);
      endTime.setHours(Math.floor(endHourDecimal), (endHourDecimal % 1) * 60, 0, 0);

      events.push({
        id: `event-${resource.id}-${j}-${dateStr}`,
        resourceId: resource.id,
        title: `${role} Service Call #${resource.id.replace('resource-', '')}-${j}`,
        startTime,
        endTime,
        status,
        metadata: {
          location,
          price: Math.floor(100 + rng() * 200),
          dispatched: rng() > 0.3,
        },
      });
    }
  });

  return events;
};

export const generateStressTestData = (resourceCount: number = 1000, baseDate: Date = new Date(2026, 5, 18)) => {
  const resources: Resource[] = [];

  // Roster identity (names/roles) is seeded per resource id so it stays stable.
  for (let i = 1; i <= resourceCount; i++) {
    const id = `resource-${i}`;
    const rng = mulberry32(hashString(`roster|${id}`));
    const fn = FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)];
    const ln = LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)];
    const role = ROLES[Math.floor(rng() * ROLES.length)];

    resources.push({
      id,
      name: `${fn} ${ln} (#${i})`,
      avatar: `${fn[0]}${ln[0]}`,
      metadata: { role, jobsCount: 0 },
    });
  }

  const events = generateEventsForResources(resources, baseDate);

  // Reflect each resource's event count in its metadata for the sidebar badge.
  const counts: Record<string, number> = {};
  events.forEach((e) => { counts[e.resourceId] = (counts[e.resourceId] || 0) + 1; });
  resources.forEach((r) => { r.metadata!.jobsCount = counts[r.id] || 0; });

  return { resources, events };
};
