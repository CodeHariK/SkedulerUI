import React, { useState, useRef, useEffect } from 'react';
import type { Resource, EventItem } from './types';
import { cn } from '@/lib/cn';
import { SUICoreBadge, SUICorePopover, SUICorePopoverTrigger, SUICoreBodyText, SUICoreIcon } from '@/components/sui';
import { EventDetailPopover } from './EventDetailPopover';
import { STATUS_BADGE_VARIANT, getIsDispatched } from './constants';

interface EventCardProps {
  event: EventItem;
  resource?: Resource;
  isDragging: boolean;
  onDragStart: (e: React.PointerEvent, eventId: string) => void;
  onResizeStart: (e: React.PointerEvent, eventId: string, direction: 'left' | 'right') => void;
}

export const EventCard: React.FC<EventCardProps> = React.memo(({
  event,
  resource,
  isDragging,
  onDragStart,
  onResizeStart,
}) => {
  const location = event.metadata?.location || '';
  const price = event.metadata?.price || 0;

  const [isHovering, setIsHovering] = useState(false);
  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const clearTimers = () => {
    if (openTimerRef.current) window.clearTimeout(openTimerRef.current);
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
  };

  // Clean up timers on unmount to prevent leaks
  useEffect(() => () => clearTimers(), []);

  // Shared by the card and the popover so the cursor can cross the gap onto the
  // popover without it closing.
  const handlePointerEnter = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (isHovering) return;
    // 250ms debounce prevents portal leaks during scrolling
    openTimerRef.current = window.setTimeout(() => setIsHovering(true), 250);
  };

  const handlePointerLeave = () => {
    if (openTimerRef.current) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    // Brief close delay so the cursor can travel from the card onto the popover.
    closeTimerRef.current = window.setTimeout(() => setIsHovering(false), 120);
  };

  const formatFullTime = (start: Date, end: Date) => {
    return `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const role = resource?.metadata?.role || '';
  const borderClass = role === 'ELECTRICAL' ? 'border-l-[#CF4523]' : 'border-l-[#2563eb]';
  const isDispatched = getIsDispatched(event);

  return (
    <SUICorePopover
      open={isHovering && !isDragging}
      onOpenChange={setIsHovering}
    >
      <SUICorePopoverTrigger asChild>
        <div
          className={cn(
            "flex flex-col justify-between h-[85px] p-3 pl-4 rounded-xl border border-slate-100 bg-white dark:bg-[#1a1a24] dark:border-border/30 text-left shadow-md hover:shadow-lg relative select-none touch-none cursor-pointer group",
            "transition-[box-shadow,transform,background-color] duration-200",
            "border-l-[4px]", borderClass,
            isDragging && "opacity-60 scale-[1.02] shadow-md border-primary/40 ring-1 ring-primary/20"
          )}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          onPointerDown={(e) => {
            clearTimers();
            setIsHovering(false);
            onDragStart(e, event.id);
          }}
        >
          {/* Left Resize Handle Overlay */}
          <div
            className="absolute left-0 top-0 w-2.5 h-full cursor-ew-resize z-20 flex items-center justify-start rounded-l-xl opacity-0 group-hover:opacity-100 transition-opacity"
            onPointerDown={(e) => {
              e.stopPropagation();
              clearTimers();
              setIsHovering(false);
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

      {/* Only build the detail subtree once the card is actually hovered, so the
          thousands of idle cards never construct their popover content. */}
      {isHovering && !isDragging && (
        <EventDetailPopover
          event={event}
          resource={resource}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
        />
      )}
    </SUICorePopover>
  );
});
