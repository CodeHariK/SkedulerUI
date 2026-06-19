import React, { useRef } from 'react';
import type { Resource, EventItem } from './types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverTrigger } from '@/components/ui/popover';
import { EventDetailPopover } from './EventDetailPopover';
import { Eye, EyeOff } from 'lucide-react';

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
  const dragStartPos = useRef({ x: 0, y: 0 });
  const location = event.metadata?.location || '';
  const price = event.metadata?.price || 0;

  const formatFullTime = (start: Date, end: Date) => {
    return `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const statusColors = {
    Ongoing: 'bg-[#FEF6F5] text-[#CF4523] border-[#FCDFD4] dark:bg-[#791D09]/20 dark:text-[#F98A66]',
    New: 'bg-[#FEF6F5] text-[#CF4523] border-[#FCDFD4] dark:bg-[#791D09]/20 dark:text-[#F98A66]',
    Completed: 'bg-[#EEFDF4] text-[#15803D] border-[#DCFCE7] dark:bg-[#14532D]/20 dark:text-[#4ADE80]',
    Cancelled: 'bg-[#FEF2F2] text-[#B91C1C] border-[#FEE2E2] dark:bg-[#7F1D1D]/20 dark:text-[#F87171]',
  };

  const role = resource?.metadata?.role || '';
  const borderClass = role === 'ELECTRICAL' 
    ? 'border-l-[#CF4523]' 
    : 'border-l-[#2563eb]';

  // Determine dispatch status to match Figma screenshot
  const isDispatched = ['job-1', 'job-2', 'job-20', 'job-22'].some(id => event.id.includes(id));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div
          className={cn(
            "flex flex-col justify-between h-[85px] p-3 pl-4 rounded-xl border border-slate-100 bg-white dark:bg-[#1a1a24] dark:border-border/30 text-left shadow-xs hover:shadow-md relative select-none touch-none cursor-pointer group",
            "transition-[box-shadow,transform,background-color] duration-200",
            "border-l-[4px]",
            borderClass,
            isDragging && "opacity-60 scale-[1.02] shadow-md border-primary/40 ring-1 ring-primary/20"
          )}
          onPointerDown={(e) => {
            dragStartPos.current = { x: e.clientX, y: e.clientY };
            onDragStart(e);
          }}
          onClickCapture={(e) => {
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
                {isDispatched ? (
                  <Eye className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400 shrink-0" />
                )}
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
