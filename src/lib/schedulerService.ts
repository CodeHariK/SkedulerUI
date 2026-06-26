import type { Resource, EventItem } from '../components/Scheduler/types';
import { generateEventsForResources } from './stressMockData';
import { toast } from 'sonner';

/**
 * Modular data fetcher to retrieve events for a specific date, keyed to the
 * exact resources passed in. Keying by resource (rather than a count) keeps the
 * dummy data aligned when only a subset of technicians is displayed.
 * Currently uses client-side generation, but can easily be replaced with a server fetch() request.
 */
export const fetchSchedulerDataByDate = async (
  resources: Resource[],
  date: Date
): Promise<{ resources: Resource[]; events: EventItem[] }> => {
  // Simulate a small network delay to mimic a server response
  await new Promise((resolve) => setTimeout(resolve, 50));

  return { resources, events: generateEventsForResources(resources, date) };
};

/**
 * Simulate saving an event to a remote database server.
 */
export const saveEventToDatabase = async (event: EventItem): Promise<void> => {
  // Simulate network latency for a write operation
  const savePromise = new Promise((resolve) => setTimeout(resolve, 800));

  toast.promise(savePromise, {
    loading: `Saving changes for "${event.title}"...`,
    success: `Changes saved successfully.`,
    error: 'Failed to save changes.',
  });

  await savePromise;
  // console.log('Successfully saved event to database:', event);
};
