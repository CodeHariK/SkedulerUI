import React from 'react';
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
  onResizeStart: (e: React.PointerEvent) => void;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  resource,
  isDragging,
  onDragStart,
  onResizeStart,
}) => {
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
            "flex flex-col justify-between h-[85px] p-3 pl-4 rounded-xl border border-slate-100 bg-white dark:bg-[#1a1a24] dark:border-border/30 text-left shadow-xs hover:shadow transition-all relative select-none touch-none cursor-pointer",
            borderColors[event.status] || 'border-l-[4px] border-l-blue-500',
            isDragging && "opacity-60 scale-[1.02] shadow-md border-primary/40 ring-1 ring-primary/20"
          )}
          onPointerDown={onDragStart}
        >
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

          {/* Resize Handle at Bottom-Right */}
          <div
            className="absolute bottom-1 right-1 cursor-se-resize p-1 z-20 group"
            onPointerDown={(e) => {
              e.stopPropagation();
              onResizeStart(e);
            }}
          >
            <svg className="w-2.5 h-2.5 text-text-tertiary/40 group-hover:text-primary transition-colors" viewBox="0 0 10 10" fill="currentColor">
              <path d="M10 0 L10 10 L0 10 Z" />
            </svg>
          </div>
        </div>
      </PopoverTrigger>

      <EventDetailPopover event={event} resource={resource} />
    </Popover>
  );
};



