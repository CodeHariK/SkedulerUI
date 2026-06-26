// Shared interaction primitives for the resource-scheduler pointer controllers.
// ResourceScheduler owns the shared refs + metrics and routes pointer events to
// whichever interaction matches `activeModeRef.current`. These types are split
// out so the controller hooks and the component agree on shape.
import type { MutableRefObject } from 'react';
import type { Virtualizer } from '@tanstack/react-virtual';
import type { Resource } from '../types';

export type ActiveMode =
  | 'NONE'
  | 'PANNING'
  | 'DRAGGING_CARD'
  | 'RESIZING_CARD'
  | 'DRAGGING_ROW'
  | 'SELECTING_SLOT';

export type Metrics = { gridLeft: number; containerTop: number };

export type LastInteraction = { slot: number; resourceId?: string } | null;

/** A click-drag time-range selection on an empty row (seeds job creation). */
export type Selection = {
  resourceId: string;
  startSlot: number;
  currentSlot: number;
} | null;

/** In-flight card move/resize snapshot, captured at gesture start. */
export type Interaction = {
  eventId: string;
  type: 'move' | 'resize';
  startX: number;
  startY: number;
  startScrollLeft: number;
  startScrollTop: number;
  startColStart: number;
  startColEnd: number;
  startResourceId: string;
  resizeDirection?: 'left' | 'right';
} | null;

/** Ghost shown while moving a card to a new row/slot. */
export type DropIndicator = {
  resourceId: string;
  startCol: number;
  endCol: number;
} | null;

/** Ghost shown while resizing a card's start/end edge. */
export type ResizeIndicator = {
  eventId: string;
  startCol: number;
  endCol: number;
} | null;

/** In-flight sidebar row reorder. */
export type RowDrag = {
  resourceId: string;
  startY: number;
  currentIndex: number;
  startScrollTop: number;
} | null;

// The bag of shared refs/metrics each pointer-controller hook reads from. These
// stay owned by ResourceScheduler so the state-machine semantics are unchanged.
export type InteractionContext = {
  gridRef: MutableRefObject<HTMLDivElement | null>;
  scrollContainerRef: MutableRefObject<HTMLDivElement | null>;
  activeModeRef: MutableRefObject<ActiveMode>;
  lastInteractionRef: MutableRefObject<LastInteraction>;
  metricsRef: MutableRefObject<Metrics>;
  activeSlotWidthRef: MutableRefObject<number>;
  pointerStartPosRef: MutableRefObject<{ x: number; y: number }>;
  virtualizerRef: MutableRefObject<Virtualizer<HTMLDivElement, Element>>;
  captureMetrics: () => void;
  totalSlots: number;
  localResources: Resource[];
};
