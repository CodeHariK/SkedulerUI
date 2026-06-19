import React, { useRef } from 'react';
import type { Resource, EventItem } from './types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverTrigger } from '@/components/ui/popover';
import { EventDetailPopover } from './EventDetailPopover';
import { Eye } from 'lucide-react';

interface EventCardProps {
  event: EventItem;
  resource?: Resource;
  isDragging: boolean;
  onDragStart: (e: React.PointerEvent) => void;
  onResizeStart: (e: React.PointerEvent, direction: 'left' | 'right') => void;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  resource,
  isDragging,
  onDragStart,
  onResizeStart,
}) => {
  // NEW: Track where the mouse started so we can distinguish a click from a drag
  const dragStartPos = useRef({ x: 0, y: 0 });
  const location = event.metadata?.location || '';
  const price = event.metadata?.price || 0;

  const formatFullTime = (start: Date, end: Date) => {
    return `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const statusColors = {
    Ongoing: 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/30',
    New: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30',
    Completed: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30',
    Cancelled: 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30',
  };

  const borderColors = {
    Ongoing: 'border-l-[4px] border-l-amber-500',
    New: 'border-l-[4px] border-l-blue-500',
    Completed: 'border-l-[4px] border-l-emerald-500',
    Cancelled: 'border-l-[4px] border-l-rose-500',
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div
          className={cn(
            "flex flex-col justify-between h-[85px] p-3 pl-4 rounded-xl border border-slate-100 bg-white dark:bg-[#1a1a24] dark:border-border/30 text-left shadow-xs hover:shadow-md relative select-none touch-none cursor-pointer group",
            "transition-[box-shadow,transform,background-color] duration-200", // FIXED: Replaced transition-all so positional transforms don't animate wildly
            borderColors[event.status] || 'border-l-[4px] border-l-blue-500',
            isDragging && "opacity-60 scale-[1.02] shadow-md border-primary/40 ring-1 ring-primary/20"
          )}
          onPointerDown={(e) => {
            dragStartPos.current = { x: e.clientX, y: e.clientY };
            onDragStart(e);
          }}
          onClickCapture={(e) => {
            // NEW: If the mouse moved more than 5px, it was a drag. Kill the click!
            const dx = Math.abs(e.clientX - dragStartPos.current.x);
            const dy = Math.abs(e.clientY - dragStartPos.current.y);
            if (dx > 5 || dy > 5) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
        >
          {/* Left Resize Handle Overlay */}
          <div
            className="absolute left-0 top-0 w-2.5 h-full cursor-ew-resize z-20 flex items-center justify-start rounded-l-xl opacity-0 group-hover:opacity-100 transition-opacity"
            onPointerDown={(e) => {
              e.stopPropagation();
              onResizeStart(e, 'left');
            }}
          >
            <div className="w-1 h-1/2 bg-primary/40 rounded-r-md" />
          </div>

          {/* Right Resize Handle Overlay */}
          <div
            className="absolute right-0 top-0 w-2.5 h-full cursor-ew-resize z-20 flex items-center justify-end rounded-r-xl opacity-0 group-hover:opacity-100 transition-opacity"
            onPointerDown={(e) => {
              e.stopPropagation();
              onResizeStart(e, 'right');
            }}
          >
            <div className="w-1 h-1/2 bg-primary/40 rounded-l-md" />
          </div>

          <div>
            <h4 className="font-bold text-text-primary text-xs truncate leading-snug">{event.title}</h4>
            {location && (
              <div className="flex items-center gap-1.5 text-[10px] text-text-secondary mt-0.5 min-w-0">
                <span className="truncate">{location}</span>
                <Eye className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400 shrink-0" />
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1.5 flex-nowrap overflow-hidden">
            <Badge
              variant="outline"
              className={cn(
                "text-[9px] font-bold px-2 py-0.5 rounded-full border-none uppercase tracking-wider shrink-0",
                statusColors[event.status] || "bg-muted text-muted-foreground"
              )}
            >
              {event.status}
            </Badge>
            <span className="text-[10px] font-bold text-text-primary shrink-0">${price}</span>
            <span className="text-[10px] text-text-tertiary shrink-0 truncate">{formatFullTime(event.startTime, event.endTime)}</span>
          </div>
        </div>
      </PopoverTrigger>

      <EventDetailPopover event={event} resource={resource} />
    </Popover>
  );
};
