// Row-reorder controller: grab a sidebar row's grip and drag it to a new index.
// Owns `rowDrag` (the in-flight drag) and `rowDropIndicator` (target index) plus
// the dragged-row element refs. ResourceScheduler commits the reorder on
// pointer-up (it owns localResources / onResourcesReorder).
import { useCallback, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { LAYOUT_CONSTANTS } from '../constants';
import type { InteractionContext, RowDrag } from './interactionTypes';

export function useRowReorder(ctx: InteractionContext) {
  const [rowDrag, setRowDrag] = useState<RowDrag>(null);
  const [rowDropIndicator, setRowDropIndicator] = useState<number | null>(null);

  const draggedSidebarRowRef = useRef<HTMLDivElement>(null);
  const draggedGridRowRef = useRef<HTMLDivElement>(null);

  const { scrollContainerRef, activeModeRef, lastInteractionRef, metricsRef, virtualizerRef, captureMetrics, localResources } = ctx;

  const start = useCallback(
    (e: ReactPointerEvent, resourceId: string) => {
      if (e.button !== 0) return; // ignore right/middle click
      e.preventDefault();
      e.stopPropagation();
      if (activeModeRef.current !== 'NONE') return;
      activeModeRef.current = 'DRAGGING_ROW';
      captureMetrics();
      const idx = localResources.findIndex((r) => r.id === resourceId);
      if (idx !== -1) {
        setRowDrag({ resourceId, startY: e.clientY, currentIndex: idx, startScrollTop: scrollContainerRef.current?.scrollTop || 0 });
        setRowDropIndicator(idx);
      }
    },
    [activeModeRef, captureMetrics, localResources, scrollContainerRef],
  );

  const move = useCallback(
    (e: ReactPointerEvent) => {
      const scrollContainerEl = scrollContainerRef.current;
      if (!scrollContainerEl || !rowDrag) return;

      // 1. How far the pointer has moved since the drag started.
      const scrollDeltaY = scrollContainerEl.scrollTop - rowDrag.startScrollTop;
      const translateY = e.clientY - rowDrag.startY + scrollDeltaY;

      // 2. Visually float the dragged row (zero React state).
      if (draggedSidebarRowRef.current) draggedSidebarRowRef.current.style.transform = `translate3d(0, ${translateY}px, 0)`;
      if (draggedGridRowRef.current) draggedGridRowRef.current.style.transform = `translate3d(0, ${translateY}px, 0)`;

      // 3. Which row are we hovering over?
      const gridY = e.clientY - metricsRef.current.containerTop + scrollContainerEl.scrollTop - LAYOUT_CONSTANTS.HEADER_OFFSET;

      let newIndex = localResources.length - 1;
      const found = virtualizerRef.current.getVirtualItems().find((item) => gridY >= item.start && gridY <= item.start + item.size);
      if (found) newIndex = found.index;
      newIndex = Math.max(0, Math.min(localResources.length - 1, newIndex));

      // 4. Update only the lightweight drop-indicator line state.
      if (lastInteractionRef.current?.slot !== newIndex) {
        lastInteractionRef.current = { slot: newIndex };
        setRowDropIndicator(newIndex);
      }
    },
    [scrollContainerRef, rowDrag, metricsRef, virtualizerRef, lastInteractionRef, localResources],
  );

  return {
    rowDrag,
    rowDropIndicator,
    setRowDrag,
    setRowDropIndicator,
    draggedSidebarRowRef,
    draggedGridRowRef,
    start,
    move,
  };
}
