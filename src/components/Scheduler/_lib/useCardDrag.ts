// Card-drag controller: grab an event card and move it (optionally across rows)
// to a new slot. Owns the shared `interaction` snapshot (also consumed by the
// resize controller), the dragged-element ref, and the `dropIndicator` ghost.
// The actual commit (optimistic setLocalEvents + onSaveEvent/onEventChange with
// rollback) stays in ResourceScheduler, which reads `dropIndicator` on pointer-up.
import { useCallback, useRef, useState } from 'react';
import type { MutableRefObject, PointerEvent as ReactPointerEvent } from 'react';
import { LAYOUT_CONSTANTS } from '../constants';
import type { GridSpan } from './computeLayout';
import type { EventItem, Resource } from '../types';
import type { InteractionContext, Interaction, DropIndicator } from './interactionTypes';

export type CardDragExtras = {
  // Latest events + spans, mirrored in refs so the start callback stays stable.
  localEventsRef: MutableRefObject<EventItem[]>;
  eventSpansRef: MutableRefObject<Record<string, GridSpan>>;
  canChangeRows: boolean;
};

export function useCardDrag(ctx: InteractionContext, extras: CardDragExtras) {
  const [interaction, setInteraction] = useState<Interaction>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator>(null);
  const draggedElementRef = useRef<HTMLDivElement>(null);

  const {
    gridRef,
    scrollContainerRef,
    activeModeRef,
    lastInteractionRef,
    metricsRef,
    activeSlotWidthRef,
    virtualizerRef,
    captureMetrics,
    totalSlots,
    localResources,
  } = ctx;
  const { localEventsRef, eventSpansRef, canChangeRows } = extras;

  const start = useCallback(
    (e: ReactPointerEvent, eventId: string) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      if (activeModeRef.current !== 'NONE' || !gridRef.current) return;
      activeModeRef.current = 'DRAGGING_CARD';
      captureMetrics();

      const event = localEventsRef.current.find((evt) => evt.id === eventId);
      if (!event) {
        activeModeRef.current = 'NONE';
        return;
      }

      const span = eventSpansRef.current[eventId] || { gridColumnStart: 1, gridColumnEnd: 1 };
      const rid = event.resourceId;
      lastInteractionRef.current = { slot: span.gridColumnStart - 1, resourceId: rid };

      setInteraction({
        eventId,
        type: 'move',
        startX: e.clientX,
        startY: e.clientY,
        startScrollLeft: scrollContainerRef.current?.scrollLeft || 0,
        startScrollTop: scrollContainerRef.current?.scrollTop || 0,
        startColStart: span.gridColumnStart - 1,
        startColEnd: span.gridColumnEnd - 1,
        startResourceId: rid,
      });

      setDropIndicator({ resourceId: rid, startCol: span.gridColumnStart - 1, endCol: span.gridColumnEnd - 1 });
    },
    [activeModeRef, gridRef, captureMetrics, localEventsRef, eventSpansRef, lastInteractionRef, scrollContainerRef],
  );

  const move = useCallback(
    (e: ReactPointerEvent) => {
      const scrollContainerEl = scrollContainerRef.current;
      if (activeModeRef.current !== 'DRAGGING_CARD' || !interaction || !scrollContainerEl) return;

      const scrollDeltaX = scrollContainerEl.scrollLeft - interaction.startScrollLeft;
      const scrollDeltaY = scrollContainerEl.scrollTop - interaction.startScrollTop;

      if (draggedElementRef.current) {
        const x = e.clientX - interaction.startX + scrollDeltaX;
        const y = e.clientY - interaction.startY + scrollDeltaY;
        draggedElementRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }

      let targetResource: Resource;
      if (canChangeRows) {
        const gridY = e.clientY - metricsRef.current.containerTop + scrollContainerEl.scrollTop - LAYOUT_CONSTANTS.HEADER_OFFSET;
        let targetRowIdx = localResources.length - 1;
        const found = virtualizerRef.current.getVirtualItems().find((item) => gridY >= item.start && gridY <= item.start + item.size);
        if (found) targetRowIdx = found.index;
        targetRowIdx = Math.max(0, Math.min(localResources.length - 1, targetRowIdx));
        targetResource = localResources[targetRowIdx];
      } else {
        targetResource = localResources.find((r) => r.id === interaction.startResourceId) || localResources[0];
      }

      const logicalDeltaX = e.clientX - interaction.startX + scrollDeltaX;
      const deltaSlots = Math.round(logicalDeltaX / activeSlotWidthRef.current);
      const durationSlots = interaction.startColEnd - interaction.startColStart;
      const newStartSlot = Math.max(0, Math.min(totalSlots - durationSlots, interaction.startColStart + deltaSlots));

      if (
        lastInteractionRef.current?.slot !== newStartSlot ||
        lastInteractionRef.current?.resourceId !== targetResource.id
      ) {
        lastInteractionRef.current = { slot: newStartSlot, resourceId: targetResource.id };
        setDropIndicator({ resourceId: targetResource.id, startCol: newStartSlot, endCol: newStartSlot + durationSlots });
      }
    },
    [activeModeRef, interaction, scrollContainerRef, metricsRef, activeSlotWidthRef, virtualizerRef, lastInteractionRef, totalSlots, localResources, canChangeRows],
  );

  const resetTransform = useCallback(() => {
    if (draggedElementRef.current) draggedElementRef.current.style.transform = 'translate3d(0, 0, 0)';
  }, []);

  const clear = useCallback(() => {
    setInteraction(null);
    setDropIndicator(null);
  }, []);

  return { interaction, setInteraction, dropIndicator, setDropIndicator, draggedElementRef, start, move, resetTransform, clear };
}
