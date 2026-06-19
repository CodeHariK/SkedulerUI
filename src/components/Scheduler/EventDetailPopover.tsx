import React from 'react';
import type { Resource, EventItem } from './types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { PopoverContent } from '@/components/ui/popover';
import { MapPin, Eye, EyeOff } from 'lucide-react';

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
    Ongoing: 'bg-[#FEF6F5] text-[#CF4523] border-[#FCDFD4] dark:bg-[#791D09]/20 dark:text-[#F98A66]',
    New: 'bg-[#FEF6F5] text-[#CF4523] border-[#FCDFD4] dark:bg-[#791D09]/20 dark:text-[#F98A66]',
    Completed: 'bg-[#EEFDF4] text-[#15803D] border-[#DCFCE7] dark:bg-[#14532D]/20 dark:text-[#4ADE80]',
    Cancelled: 'bg-[#FEF2F2] text-[#B91C1C] border-[#FEE2E2] dark:bg-[#7F1D1D]/20 dark:text-[#F87171]',
  };

  // Determine dispatch status to match Figma design
  const isDispatched = ['job-1', 'job-2', 'job-20', 'job-22'].some(id => event.id.includes(id));

  // Determine technician avatar colors based on role
  const isElectrical = resource?.metadata?.role === 'ELECTRICAL';
  const avatarBg = isElectrical 
    ? 'bg-[#FEF6F5] text-[#CF4523] border-[#FCDFD4]' 
    : 'bg-[#F3F8FF] text-[#1D4ED8] border-[#DBEAFE]';

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
            <div className={cn(
              "flex items-center justify-center w-6 h-6 rounded-full font-bold text-[9px] border shrink-0",
              avatarBg
            )}>
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
          {isDispatched ? (
            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
              <Eye className="w-3.5 h-3.5" />
              <span>Dispatched</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-orange-500 dark:text-orange-400 font-semibold">
              <EyeOff className="w-3.5 h-3.5" />
              <span>Pending</span>
            </div>
          )}
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
