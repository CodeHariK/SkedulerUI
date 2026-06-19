import React from 'react';
import type { Resource, EventItem } from './types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { PopoverContent } from '@/components/ui/popover';
import { MapPin, Eye } from 'lucide-react';

interface EventDetailPopoverProps {
  event: EventItem;
  resource?: Resource;
}

export const EventDetailPopover: React.FC<EventDetailPopoverProps> = ({
  event,
  resource,
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

  return (
    <PopoverContent className="w-[320px] p-5 bg-white dark:bg-[#1c1c1c] border border-border/70 shadow-xl rounded-2xl z-50 flex flex-col gap-4 select-none" side="bottom" align="start">
      {/* Header Section */}
      <div className="flex justify-between items-start gap-4">
        <div className="min-w-0">
          <h3 className="font-bold text-text-primary text-base leading-snug">{event.title}</h3>
          <p className="text-[11px] text-text-tertiary mt-1 font-medium">
            JOB #{event.id.replace('job-created-', '').slice(-4).toUpperCase()} • Compliance
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "text-xs font-semibold px-3 py-0.5 rounded-full border-none whitespace-nowrap",
            statusColors[event.status] || "bg-muted text-muted-foreground"
          )}
        >
          {event.status}
        </Badge>
      </div>

      {/* Location Section */}
      {location && (
        <div className="flex items-center gap-1.5 text-xs text-text-secondary font-medium">
          <MapPin className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
          <span>{location}</span>
        </div>
      )}

      <Separator className="bg-border/60" />

      {/* Details List */}
      <div className="flex flex-col gap-3.5 text-xs font-medium">
        {/* Time Row */}
        <div className="flex justify-between items-center gap-2">
          <span className="text-text-tertiary">Time</span>
          <span className="font-semibold text-text-primary">{formatFullTime(event.startTime, event.endTime)}</span>
        </div>

        {/* Technician Row */}
        <div className="flex justify-between items-center gap-2">
          <span className="text-text-tertiary">Technician</span>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 font-bold text-[9px] border border-orange-200/40 shrink-0">
              {resource ? (resource.avatar || resource.name.slice(0, 2).toUpperCase()) : 'UN'}
            </div>
            <span className="font-semibold text-text-primary">{resource ? resource.name : 'Unassigned'}</span>
          </div>
        </div>

        {/* Callout Fee Row */}
        <div className="flex justify-between items-center gap-2">
          <span className="text-text-tertiary">Callout fee</span>
          <span className="font-semibold text-text-primary">${price}</span>
        </div>

        {/* Dispatch Row */}
        <div className="flex justify-between items-center gap-2">
          <span className="text-text-tertiary">Dispatch</span>
          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
            <Eye className="w-3.5 h-3.5" />
            <span>Dispatched</span>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex gap-2.5 mt-2">
        <Button className="flex-1 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-full font-medium h-9 text-xs">
          View Job
        </Button>
        <Button variant="outline" className="flex-1 border-border/80 hover:bg-muted text-text-primary rounded-full font-medium h-9 text-xs">
          Reschedule
        </Button>
      </div>
    </PopoverContent>
  );
};
