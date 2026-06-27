// Slot-selection controller: click-drag on an empty row to mark a time range,
// which on pointer-up seeds the job-creation dialog. Owns its own `selection`
// state; ResourceScheduler reads it back to build the NewEventData on commit.
import { useCallback, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { InteractionContext, Selection } from './interactionTypes';

// Minimum pointer travel (px) before a press becomes a drag-selection. A plain
// click stays below this, so it shows no ghost and opens no dialog.
const DRAG_THRESHOLD = 4;

export function useSlotSelection(ctx: InteractionContext) {
  const [selection, setSelection] = useState<Selection>(null);
  // Where the press began — held until the pointer moves past the threshold, at
  // which point the selection (and its ghost) is created.
  const pendingStartRef = useRef<{ slot: number; resourceId: string } | null>(null);

  const { gridRef, activeModeRef, lastInteractionRef, metricsRef, activeSlotWidthRef, pointerStartPosRef, captureMetrics } = ctx;

  const start = useCallback(
    (e: ReactPointerEvent, resourceId: string) => {
      if (e.button !== 0) return; // ignore right/middle click
      if (e.target !== e.currentTarget || !gridRef.current || activeModeRef.current !== 'NONE') return;
      e.preventDefault();
      e.stopPropagation();

      activeModeRef.current = 'SELECTING_SLOT';
      pointerStartPosRef.current = { x: e.clientX, y: e.clientY };
      captureMetrics();

      const slotIdx = Math.max(
        0,
        Math.floor((e.clientX - metricsRef.current.gridLeft + gridRef.current.scrollLeft) / activeSlotWidthRef.current),
      );

      // Defer the selection until an actual drag — a bare click does nothing.
      pendingStartRef.current = { slot: slotIdx, resourceId };
      lastInteractionRef.current = { slot: slotIdx };
    },
    [gridRef, activeModeRef, lastInteractionRef, metricsRef, activeSlotWidthRef, pointerStartPosRef, captureMetrics],
  );

  const move = useCallback(
    (e: ReactPointerEvent) => {
      const gridEl = gridRef.current;
      const pending = pendingStartRef.current;
      if (!gridEl || !pending) return;

      const currentSlot = Math.max(
        0,
        Math.floor((e.clientX - metricsRef.current.gridLeft + gridEl.scrollLeft) / activeSlotWidthRef.current),
      );

      setSelection((prev) => {
        if (prev) {
          // Already dragging — track the moving edge.
          return prev.currentSlot !== currentSlot ? { ...prev, currentSlot } : prev;
        }
        // Not selecting yet — begin only once the pointer travels past the threshold.
        const dx = Math.abs(e.clientX - pointerStartPosRef.current.x);
        const dy = Math.abs(e.clientY - pointerStartPosRef.current.y);
        if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
          return { resourceId: pending.resourceId, startSlot: pending.slot, currentSlot };
        }
        return prev;
      });
    },
    [gridRef, metricsRef, activeSlotWidthRef, pointerStartPosRef],
  );

  return { selection, setSelection, start, move };
}
