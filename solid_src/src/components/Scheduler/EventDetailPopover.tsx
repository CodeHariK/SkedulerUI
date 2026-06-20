import { Show, splitProps, type Component } from 'solid-js';
import type { Resource, EventItem } from './types';
import { cn } from '../../lib/utils';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Separator } from '../../components/ui/separator';
import { PopoverContent } from '../../components/ui/popover';
import { MapPin, Eye, EyeOff } from 'lucide-solid';
import { STATUS_COLORS, getIsDispatched, formatJobNumber } from './constants';

interface EventDetailPopoverProps {
  event: EventItem;
  resource?: Resource;
  [key: string]: any; // Allows rest props like onPointerEnter/onPointerLeave
}

export const EventDetailPopover: Component<EventDetailPopoverProps> = (props) => {
  // Split custom props from DOM props so we can spread hover events
  const [local, rest] = splitProps(props, ['event', 'resource']);

  // Derived reactive state must be functions in SolidJS
  const location = () => local.event.metadata?.location || '';
  const price = () => local.event.metadata?.price || 0;
  const isDispatched = () => getIsDispatched(local.event);
  const isElectrical = () => local.resource?.metadata?.role === 'ELECTRICAL';

  const avatarBg = () => isElectrical()
    ? 'bg-[#FEF6F5] text-[#CF4523] border-[#FCDFD4]'
    : 'bg-[#F3F8FF] text-[#1D4ED8] border-[#DBEAFE]';

  const formatFullTime = (start: Date, end: Date) => {
    return `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <PopoverContent
      class="w-[320px] p-5 bg-white dark:bg-[#1c1c1c] border border-border/70 shadow-xl rounded-2xl z-50 flex flex-col gap-4 select-none"
      {...rest}
    >
      {/* Header Section */}
      <div class="flex justify-between items-start gap-4">
        <div class="min-w-0">
          <h3 class="font-bold text-text-primary text-base leading-snug">{local.event.title}</h3>
          <p class="text-[11px] text-text-tertiary mt-1 font-medium">
            JOB #{formatJobNumber(local.event.id)} • Compliance
          </p>
        </div>
        <Badge
          variant="outline"
          class={cn(
            "text-xs font-semibold px-3 py-0.5 rounded-full border-none whitespace-nowrap",
            STATUS_COLORS[local.event.status] || "bg-muted text-muted-foreground"
          )}
        >
          {local.event.status}
        </Badge>
      </div>

      {/* Location Section */}
      <Show when={location()}>
        <div class="flex items-center gap-1.5 text-xs text-text-secondary font-medium">
          <MapPin class="w-3.5 h-3.5 text-text-tertiary shrink-0" />
          <span>{location()}</span>
        </div>
      </Show>

      <Separator class="bg-border/60" />

      {/* Details List */}
      <div class="flex flex-col gap-3.5 text-xs font-medium">
        {/* Time Row */}
        <div class="flex justify-between items-center gap-2">
          <span class="text-text-tertiary">Time</span>
          <span class="font-semibold text-text-primary">{formatFullTime(local.event.startTime, local.event.endTime)}</span>
        </div>

        {/* Technician Row */}
        <div class="flex justify-between items-center gap-2">
          <span class="text-text-tertiary">Technician</span>
          <div class="flex items-center gap-2">
            <div class={cn(
              "flex items-center justify-center w-6 h-6 rounded-full font-bold text-[9px] border shrink-0",
              avatarBg()
            )}>
              {local.resource ? (local.resource.avatar || local.resource.name.slice(0, 2).toUpperCase()) : 'UN'}
            </div>
            <span class="font-semibold text-text-primary">{local.resource ? local.resource.name : 'Unassigned'}</span>
          </div>
        </div>

        {/* Callout Fee Row */}
        <div class="flex justify-between items-center gap-2">
          <span class="text-text-tertiary">Callout fee</span>
          <span class="font-semibold text-text-primary">${price()}</span>
        </div>

        {/* Dispatch Row */}
        <div class="flex justify-between items-center gap-2">
          <span class="text-text-tertiary">Dispatch</span>
          <Show
            when={isDispatched()}
            fallback={
              <div class="flex items-center gap-1 text-orange-500 dark:text-orange-400 font-semibold">
                <EyeOff class="w-3.5 h-3.5" />
                <span>Pending</span>
              </div>
            }
          >
            <div class="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
              <Eye class="w-3.5 h-3.5" />
              <span>Dispatched</span>
            </div>
          </Show>
        </div>
      </div>

      {/* Footer Actions */}
      <div class="flex gap-2.5 mt-2">
        <Button class="flex-1 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-full font-medium h-9 text-xs">
          View Job
        </Button>
        <Button variant="outline" class="flex-1 border-border/80 hover:bg-muted text-text-primary rounded-full font-medium h-9 text-xs">
          Reschedule
        </Button>
      </div>
    </PopoverContent>
  );
};
