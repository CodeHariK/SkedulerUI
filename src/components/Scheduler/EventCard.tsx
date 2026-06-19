import React from 'react';
import type { EventItem } from './types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface EventCardProps {
  event: EventItem;
  isDragging: boolean;
  onDragStart: (e: React.PointerEvent) => void;
  onResizeStart: (e: React.PointerEvent) => void;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  isDragging,
  onDragStart,
  onResizeStart,
}) => {
  const location = event.metadata?.location || '';
  const price = event.metadata?.price || 0;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const statusColors = {
    Ongoing: 'bg-amber-500/10 border-amber-500/20 text-amber-600',
    New: 'bg-blue-500/10 border-blue-500/20 text-blue-600',
    Completed: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600',
    Cancelled: 'bg-rose-500/10 border-rose-500/20 text-rose-600',
  };

  return (
    <div
      className={cn(
        "flex flex-col justify-between h-[85px] p-3 rounded-lg border bg-card text-left shadow-sm hover:shadow transition-all relative select-none touch-none",
        statusColors[event.status] || 'border-border',
        isDragging && "opacity-60 scale-[1.02] shadow-md border-primary/40 ring-1 ring-primary/20"
      )}
      onPointerDown={onDragStart}
    >
      <div>
        <h4 className="font-semibold text-text-primary text-xs truncate leading-snug">{event.title}</h4>
        {location && (
          <p className="text-[10px] text-text-secondary mt-0.5 truncate flex items-center gap-1">
            <span>{location}</span>
          </p>
        )}
      </div>
      <div className="flex items-center justify-between mt-1 pt-1 border-t border-border/20">
        <Badge
          variant="outline"
          className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-background/50 border-none"
        >
          {event.status}
        </Badge>
        <span className="text-[10px] text-text-primary font-medium pr-3 truncate">
          ${price} • {formatTime(event.startTime)}
        </span>
      </div>

      {/* Resize Handle at Bottom-Right */}
      <div
        className="absolute bottom-1 right-1 cursor-se-resize p-1 z-20 group"
        onPointerDown={onResizeStart}
      >
        <svg className="w-2.5 h-2.5 text-text-tertiary/40 group-hover:text-primary transition-colors" viewBox="0 0 10 10" fill="currentColor">
          <path d="M10 0 L10 10 L0 10 Z" />
        </svg>
      </div>
    </div>
  );
};
