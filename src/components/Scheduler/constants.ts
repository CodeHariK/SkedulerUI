import type { EventItem } from './types';

export const STATUS_COLORS = {
  Ongoing: 'bg-[#FEF6F5] text-[#CF4523] border-[#FCDFD4] dark:bg-[#791D09]/20 dark:text-[#F98A66]',
  New: 'bg-[#FEF6F5] text-[#CF4523] border-[#FCDFD4] dark:bg-[#791D09]/20 dark:text-[#F98A66]',
  Completed: 'bg-[#EEFDF4] text-[#15803D] border-[#DCFCE7] dark:bg-[#14532D]/20 dark:text-[#4ADE80]',
  Cancelled: 'bg-[#FEF2F2] text-[#B91C1C] border-[#FEE2E2] dark:bg-[#7F1D1D]/20 dark:text-[#F87171]',
} as const;

export const LAYOUT_CONSTANTS = {
  HEADER_OFFSET: 56,
  ROW_MIN_HEIGHT: 140,
  LANE_HEIGHT: 95,
  LANE_OFFSET: 30,
} as const;

/**
 * Robust format for job numbers.
 * Handles both job-created-<timestamp> and custom mock job IDs like job-1, job-20.
 */
export const formatJobNumber = (id: string): string => {
  if (id.startsWith('job-created-')) {
    return id.replace('job-created-', '').slice(-4).toUpperCase();
  }
  // For standard mock IDs like "job-12", extract the number part and pad it
  const match = id.match(/\d+$/);
  if (match) {
    return match[0].padStart(4, '0');
  }
  return id.toUpperCase();
};

/**
 * Check if the event is dispatched from event.metadata?.dispatched or a fallback.
 */
export const getIsDispatched = (event: EventItem): boolean => {
  if (event.metadata?.dispatched !== undefined) {
    return !!event.metadata.dispatched;
  }
  // Fallback for legacy mock data.
  // WARNING: Uses substring matching (.includes) to support various mock suffix variations.
  // Do not extend this list with partial matches that could collide (e.g. "job-2" matches "job-20").
  return ['job-1', 'job-2', 'job-20', 'job-22'].some(id => event.id.includes(id));
};
