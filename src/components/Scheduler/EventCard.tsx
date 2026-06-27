import React, { useState, useRef, useEffect } from 'react';
import type { Resource, EventItem } from './types';
import { cn } from '@/lib/cn';
import { SUICoreBadge, SUICorePopover, SUICorePopoverTrigger, SUICoreBodyText, SUICoreIcon } from '@/components/sui';
import { EventDetailPopover } from './EventDetailPopover';
import { STATUS_BADGE_VARIANT, getIsDispatched } from './constants';
import { useDetailOpen } from './_lib/detailOpen';

interface EventCardProps {
  event: EventItem;
  resource?: Resource;
  isDragging: boolean;
  onDragStart: (e: React.PointerEvent, eventId: string) => void;
  onResizeStart: (e: React.PointerEvent, eventId: string, direction: 'left' | 'right') => void;
  /** Whether the detail card opens on hover or on click. */
  detailTrigger?: 'hover' | 'click';
}

// A press that moves less than this (px) counts as a click, not a drag.
const DRAG_THRESHOLD = 4;

export const EventCard: React.FC<EventCardProps> = React.memo(({
  event,
  resource,
  isDragging,
  onDragStart,
  onResizeStart,
  detailTrigger = 'hover',
}) => {
  const location = event.metadata?.location || '';
  const price = event.metadata?.price || 0;

  const isHoverMode = detailTrigger === 'hover';

  // Click-mode open state is shared (single-open + outside-close) via context.
  const { openId, setOpenId } = useDetailOpen();
  const isClickOpen = openId === event.id;

  const [isHovering, setIsHovering] = useState(false);
  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  // Pointer x within the card, so the detail card opens near the pointer rather
  // than pinned to the card's left edge.
  const pointerOffsetRef = useRef(0);
  const [anchorOffset, setAnchorOffset] = useState(0);
  const trackPointer = (e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    pointerOffsetRef.current = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
  };

  // Click-mode drag is deferred until the pointer moves past the threshold, so a
  // plain click never starts a drag (and so never snaps/saves) — it just opens
  // the detail card.
  const downPosRef = useRef<{ x: number; y: number } | null>(null);
  const didDragRef = useRef(false);

  const open = isHoverMode ? (isHovering && !isDragging) : (isClickOpen && !isDragging);

  const clearTimers = () => {
    if (openTimerRef.current) window.clearTimeout(openTimerRef.current);
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
  };

  useEffect(() => () => clearTimers(), []);

  // Hover-mode open/close debounce, shared with the popover so the cursor can
  // cross the gap onto it without closing.
  const handlePointerEnter = (e: React.PointerEvent) => {
    trackPointer(e);
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (isHovering) return;
    openTimerRef.current = window.setTimeout(() => {
      setAnchorOffset(pointerOffsetRef.current);
      setIsHovering(true);
    }, 250);
  };

  const handlePointerLeave = () => {
    if (openTimerRef.current) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    closeTimerRef.current = window.setTimeout(() => setIsHovering(false), 120);
  };

  const handleCardPointerDown = (e: React.PointerEvent) => {
    clearTimers();
    trackPointer(e);
    if (isHoverMode) {
      setIsHovering(false);
      onDragStart(e, event.id); // hover mode: drag begins immediately
    } else if (e.button === 0) {
      // Click mode: defer drag until movement (left button only); don't
      // preventDefault so the trigger's click can toggle the detail card.
      downPosRef.current = { x: e.clientX, y: e.clientY };
      didDragRef.current = false;
    }
  };

  const handleCardPointerMove = (e: React.PointerEvent) => {
    trackPointer(e);
    if (isHoverMode) return;
    const down = downPosRef.current;
    if (!down || didDragRef.current) return;
    if (Math.abs(e.clientX - down.x) > DRAG_THRESHOLD || Math.abs(e.clientY - down.y) > DRAG_THRESHOLD) {
      didDragRef.current = true;
      setOpenId(null); // a drag isn't a detail-open
      onDragStart(e, event.id);
    }
  };

  const handleCardPointerUp = () => {
    if (!isHoverMode) downPosRef.current = null;
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (isHoverMode) return;
    if (didDragRef.current) {
      // This "click" was actually a drag — don't toggle the detail card.
      e.preventDefault();
      e.stopPropagation();
      didDragRef.current = false;
      return;
    }
    // Tap toggles this card's detail (single-open enforced by shared state).
    if (!isClickOpen) setAnchorOffset(pointerOffsetRef.current);
    setOpenId(isClickOpen ? null : event.id);
  };

  const formatFullTime = (start: Date, end: Date) => {
    return `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const role = resource?.metadata?.role || '';
  const borderClass = role === 'ELECTRICAL' ? 'border-l-[#CF4523]' : 'border-l-[#2563eb]';
  const isDispatched = getIsDispatched(event);

  return (
    <SUICorePopover open={open} onOpenChange={isHoverMode ? setIsHovering : (o) => { if (!o) setOpenId(null); }}>
      <SUICorePopoverTrigger asChild>
        <div
          data-event-card
          className={cn(
            "flex flex-col justify-between h-[85px] p-3 pl-4 rounded-xl border border-slate-100 bg-white dark:bg-[#1a1a24] dark:border-border/30 text-left shadow-md hover:shadow-lg relative select-none touch-none cursor-pointer group",
            "transition-[box-shadow,transform,background-color] duration-200",
            "border-l-[4px]", borderClass,
            isDragging && "opacity-60 scale-[1.02] shadow-md border-primary/40 ring-1 ring-primary/20"
          )}
          onPointerEnter={isHoverMode ? handlePointerEnter : undefined}
          onPointerLeave={isHoverMode ? handlePointerLeave : undefined}
          onPointerDown={handleCardPointerDown}
          onPointerMove={handleCardPointerMove}
          onPointerUp={isHoverMode ? undefined : handleCardPointerUp}
          onClick={isHoverMode ? undefined : handleCardClick}
          // Keep a card press from reaching the grid's pan handler (mousedown
          // fires after pointerdown; in click mode no drag has started yet, so
          // panning would otherwise hijack the press).
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Left Resize Handle Overlay */}
          <div
            className="absolute left-0 top-0 w-2.5 h-full cursor-ew-resize z-20 flex items-center justify-start rounded-l-xl opacity-0 group-hover:opacity-100 transition-opacity"
            onPointerDown={(e) => {
              e.stopPropagation();
              clearTimers();
              setIsHovering(false);
              downPosRef.current = null;
              onResizeStart(e, event.id, 'left');
            }}
          >
            <div className="w-1 h-1/2 bg-primary/40 rounded-r-md" />
          </div>

          {/* Right Resize Handle Overlay */}
          <div
            className="absolute right-0 top-0 w-2.5 h-full cursor-ew-resize z-20 flex items-center justify-end rounded-r-xl opacity-0 group-hover:opacity-100 transition-opacity"
            onPointerDown={(e) => {
              e.stopPropagation();
              clearTimers();
              setIsHovering(false);
              downPosRef.current = null;
              onResizeStart(e, event.id, 'right');
            }}
          >
            <div className="w-1 h-1/2 bg-primary/40 rounded-l-md" />
          </div>

          <div>
            <SUICoreBodyText as="span" size="xs" weight="bold" className="block truncate">{event.title}</SUICoreBodyText>
            {location && (
              <div className="flex items-center gap-1.5 text-body-xs text-fg-tertiary mt-0.5 min-w-0 font-normal leading-normal">
                <span className="truncate">{location}</span>
                <SUICoreIcon
                  name={isDispatched ? 'eye' : 'eyeOff'}
                  size="xs"
                  className={cn('shrink-0', isDispatched ? 'text-success-500' : 'text-warning-500')}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1.5 flex-nowrap overflow-hidden">
            <SUICoreBadge variant={STATUS_BADGE_VARIANT[event.status]} text={event.status} className="uppercase tracking-wider shrink-0" />
            <span className="text-body-xs font-bold text-fg-primary shrink-0">${price}</span>
            <span className="text-body-xs text-fg-tertiary shrink-0 truncate">{formatFullTime(event.startTime, event.endTime)}</span>
          </div>
        </div>
      </SUICorePopoverTrigger>

      {/* Only build the detail subtree once actually open. */}
      {open && (
        <EventDetailPopover
          event={event}
          resource={resource}
          pointerOffset={anchorOffset}
          onPointerEnter={isHoverMode ? handlePointerEnter : undefined}
          onPointerLeave={isHoverMode ? handlePointerLeave : undefined}
        />
      )}
    </SUICorePopover>
  );
});
