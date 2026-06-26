// Slot-selection controller: click-drag on an empty row to mark a time range,
// which on pointer-up seeds the job-creation dialog. Owns its own `selection`
// state; ResourceScheduler reads it back to build the NewEventData on commit.
import { useCallback, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { InteractionContext, Selection } from './interactionTypes';

export function useSlotSelection(ctx: InteractionContext) {
  const [selection, setSelection] = useState<Selection>(null);

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

      setSelection({ resourceId, startSlot: slotIdx, currentSlot: slotIdx });
      lastInteractionRef.current = { slot: slotIdx };
    },
    // refs are stable; captureMetrics is the only reactive dep
    [gridRef, activeModeRef, lastInteractionRef, metricsRef, activeSlotWidthRef, pointerStartPosRef, captureMetrics],
  );

  const move = useCallback(
    (e: ReactPointerEvent) => {
      const gridEl = gridRef.current;
      if (!gridEl) return;
      const currentSlot = Math.max(
        0,
        Math.floor((e.clientX - metricsRef.current.gridLeft + gridEl.scrollLeft) / activeSlotWidthRef.current),
      );
      // Update only when the slot boundary actually changes (functional update
      // avoids needing `selection` as a dependency).
      setSelection((prev) => (prev && prev.currentSlot !== currentSlot ? { ...prev, currentSlot } : prev));
    },
    [gridRef, metricsRef, activeSlotWidthRef],
  );

  return { selection, setSelection, start, move };
}
