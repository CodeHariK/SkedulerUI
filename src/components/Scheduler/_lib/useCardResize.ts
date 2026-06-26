// Card-resize controller: drag an event card's left/right edge to change its
// start or end time. Shares the `interaction` snapshot with the card-drag
// controller (passed in) and owns the `resizeIndicator` ghost. The commit
// (optimistic setLocalEvents + onSaveEvent/onEventChange with rollback) stays in
// ResourceScheduler, which reads `resizeIndicator` on pointer-up.
import { useCallback, useState } from 'react';
import type { MutableRefObject, PointerEvent as ReactPointerEvent } from 'react';
import type { GridSpan } from './computeLayout';
import type { EventItem } from '../types';
import type { InteractionContext, Interaction, ResizeIndicator } from './interactionTypes';

export type CardResizeBridge = {
  // The shared interaction snapshot lives in the card-drag hook.
  interaction: Interaction;
  setInteraction: (i: Interaction) => void;
  localEventsRef: MutableRefObject<EventItem[]>;
  eventSpansRef: MutableRefObject<Record<string, GridSpan>>;
};

export function useCardResize(ctx: InteractionContext, bridge: CardResizeBridge) {
  const [resizeIndicator, setResizeIndicator] = useState<ResizeIndicator>(null);

  const { gridRef, scrollContainerRef, activeModeRef, lastInteractionRef, metricsRef, activeSlotWidthRef, captureMetrics, totalSlots } = ctx;
  const { interaction, setInteraction, localEventsRef, eventSpansRef } = bridge;

  const start = useCallback(
    (e: ReactPointerEvent, eventId: string, direction: 'left' | 'right') => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      if (activeModeRef.current !== 'NONE' || !gridRef.current) return;
      activeModeRef.current = 'RESIZING_CARD';
      captureMetrics();

      const event = localEventsRef.current.find((evt) => evt.id === eventId);
      if (!event) {
        activeModeRef.current = 'NONE';
        return;
      }

      const span = eventSpansRef.current[eventId] || { gridColumnStart: 1, gridColumnEnd: 1 };
      lastInteractionRef.current = {
        slot: direction === 'left' ? span.gridColumnStart - 1 : span.gridColumnEnd - 1,
      };

      setInteraction({
        eventId,
        type: 'resize',
        startX: e.clientX,
        startY: e.clientY,
        startScrollLeft: scrollContainerRef.current?.scrollLeft || 0,
        startScrollTop: scrollContainerRef.current?.scrollTop || 0,
        startColStart: span.gridColumnStart - 1,
        startColEnd: span.gridColumnEnd - 1,
        startResourceId: event.resourceId,
        resizeDirection: direction,
      });

      setResizeIndicator({ eventId, startCol: span.gridColumnStart - 1, endCol: span.gridColumnEnd - 1 });
    },
    [activeModeRef, gridRef, captureMetrics, localEventsRef, eventSpansRef, lastInteractionRef, scrollContainerRef, setInteraction],
  );

  const move = useCallback(
    (e: ReactPointerEvent) => {
      const gridEl = gridRef.current;
      if (activeModeRef.current !== 'RESIZING_CARD' || !interaction || !gridEl) return;

      const currentSlot = Math.max(
        0,
        Math.floor((e.clientX - metricsRef.current.gridLeft + gridEl.scrollLeft) / activeSlotWidthRef.current),
      );
      if (lastInteractionRef.current?.slot !== currentSlot) {
        lastInteractionRef.current = { slot: currentSlot };
        if (interaction.resizeDirection === 'left') {
          setResizeIndicator({
            eventId: interaction.eventId,
            startCol: Math.max(0, Math.min(interaction.startColEnd - 1, currentSlot)),
            endCol: interaction.startColEnd,
          });
        } else {
          setResizeIndicator({
            eventId: interaction.eventId,
            startCol: interaction.startColStart,
            endCol: Math.max(interaction.startColStart + 1, Math.min(totalSlots, currentSlot)),
          });
        }
      }
    },
    [gridRef, activeModeRef, interaction, metricsRef, activeSlotWidthRef, lastInteractionRef, totalSlots],
  );

  const clear = useCallback(() => setResizeIndicator(null), []);

  return { resizeIndicator, setResizeIndicator, start, move, clear };
}
