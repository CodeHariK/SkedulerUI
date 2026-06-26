// Public API for the published package.
//
// Consumers also need the stylesheet (design tokens + Tailwind layers):
//   import "skeduler-ui/styles.css";

export { ResourceScheduler } from "./components/Scheduler/ResourceScheduler";
export type { ResourceSchedulerProps } from "./components/Scheduler/ResourceScheduler";
export type {
  Resource,
  EventItem,
  NewEventData,
  SchedulerTemplate,
} from "./components/Scheduler/types";

// Design-system primitives, re-exported so consumers can compose a matching UI.
export * from "./components/sui";
