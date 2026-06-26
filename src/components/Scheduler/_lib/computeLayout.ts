// Pure layout engine for the resource scheduler grid. Extracted from
// ResourceScheduler so the row-height / lane-packing / span math is testable in
// isolation. Given the same inputs it returns the same
// { rowHeights, eventLanes, eventSpans, eventsByResource } as the prior in-
// component `layoutEngine` memo.
import { LAYOUT_CONSTANTS } from '../constants';
import type { Resource, EventItem } from '../types';

export type GridSpan = { gridColumnStart: number; gridColumnEnd: number };

export type LayoutResult = {
  rowHeights: Record<string, number>;
  eventLanes: Record<string, number>;
  eventSpans: Record<string, GridSpan>;
  eventsByResource: Record<string, EventItem[]>;
};

/**
 * Map an event's [start, end] onto 1-based CSS grid columns, clamping BOTH ends
 * into the visible [0, totalHours] window. Without clamping both sides, an event
 * outside the window yields a reversed/negative span that CSS grid renders as a
 * full-width card overlapping other events.
 */
export const getEventGridSpan = (
  start: Date,
  end: Date,
  dayStartHour: number,
  totalHours: number,
  slotsPerHour: number,
): GridSpan => {
  const startHourObj = start.getHours() + start.getMinutes() / 60;
  const endHourObj = end.getHours() + end.getMinutes() / 60;
  const relativeStart = Math.min(totalHours, Math.max(0, startHourObj - dayStartHour));
  const relativeEnd = Math.max(0, Math.min(totalHours, endHourObj - dayStartHour));
  const gridColumnStart = Math.round(relativeStart * slotsPerHour) + 1;
  let gridColumnEnd = Math.round(relativeEnd * slotsPerHour) + 1;
  if (gridColumnEnd <= gridColumnStart) gridColumnEnd = gridColumnStart + 1; // guarantee ≥1 slot
  return { gridColumnStart, gridColumnEnd };
};

export type ComputeLayoutArgs = {
  resources: Resource[];
  dailyEvents: EventItem[];
  dayStartHour: number;
  totalHours: number;
  slotsPerHour: number;
};

export function computeLayout({
  resources,
  dailyEvents,
  dayStartHour,
  totalHours,
  slotsPerHour,
}: ComputeLayoutArgs): LayoutResult {
  const rowHeights: Record<string, number> = {};
  const eventLanes: Record<string, number> = {};
  const eventSpans: Record<string, GridSpan> = {};
  const eventsByResource: Record<string, EventItem[]> = {};

  const windowEnd = dayStartHour + totalHours;
  const intersectsWindow = (e: EventItem) => {
    const s = e.startTime.getHours() + e.startTime.getMinutes() / 60;
    const en = e.endTime.getHours() + e.endTime.getMinutes() / 60;
    return en > dayStartHour && s < windowEnd;
  };

  resources.forEach((r) => {
    eventsByResource[r.id] = [];
    rowHeights[r.id] = LAYOUT_CONSTANTS.ROW_MIN_HEIGHT;
  });
  dailyEvents.forEach((e) => {
    if (eventsByResource[e.resourceId] && intersectsWindow(e)) eventsByResource[e.resourceId].push(e);
  });

  resources.forEach((resource) => {
    const resourceEvents = eventsByResource[resource.id].sort((a, b) => {
      const diff = a.startTime.getTime() - b.startTime.getTime();
      return diff !== 0 ? diff : a.id.localeCompare(b.id);
    });

    if (resourceEvents.length === 0) return;
    const lanes: number[] = [];

    resourceEvents.forEach((event) => {
      eventSpans[event.id] = getEventGridSpan(event.startTime, event.endTime, dayStartHour, totalHours, slotsPerHour);

      let placed = false;
      for (let i = 0; i < lanes.length; i++) {
        if (lanes[i] <= event.startTime.getTime()) {
          lanes[i] = event.endTime.getTime();
          eventLanes[event.id] = i + 1;
          placed = true;
          break;
        }
      }
      if (!placed) {
        lanes.push(event.endTime.getTime());
        eventLanes[event.id] = lanes.length;
      }
    });

    rowHeights[resource.id] = Math.max(
      LAYOUT_CONSTANTS.ROW_MIN_HEIGHT,
      lanes.length * LAYOUT_CONSTANTS.LANE_HEIGHT + LAYOUT_CONSTANTS.LANE_OFFSET,
    );
  });

  return { rowHeights, eventLanes, eventSpans, eventsByResource };
}
