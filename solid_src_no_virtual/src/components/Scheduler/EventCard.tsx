import { createSignal, Show, type Component, onCleanup } from 'solid-js';
import type { Resource, EventItem } from './types';
import { cn } from '../../lib/utils';
import { Badge } from '../../components/ui/badge';
import { Popover, PopoverTrigger } from '../../components/ui/popover';
import { EventDetailPopover } from './EventDetailPopover';
import { Eye, EyeOff } from 'lucide-solid';

import { STATUS_COLORS, getIsDispatched } from './constants';

interface EventCardProps {
  event: EventItem;
  resource?: Resource;
  isDragging: boolean;
  onDragStart: (e: PointerEvent, eventId: string) => void;
  onResizeStart: (e: PointerEvent, eventId: string, direction: 'left' | 'right') => void;
}

export const EventCard: Component<EventCardProps> = (props) => {
  const [isHovering, setIsHovering] = createSignal(false);
  let hoverTimeoutRef: number | undefined;

  const handlePointerEnter = () => {
    if (hoverTimeoutRef) clearTimeout(hoverTimeoutRef);
    hoverTimeoutRef = setTimeout(() => setIsHovering(true), 150) as unknown as number;
  };

  const handlePointerLeave = () => {
    if (hoverTimeoutRef) clearTimeout(hoverTimeoutRef);
    setIsHovering(false);
  };

  onCleanup(() => {
    if (hoverTimeoutRef) clearTimeout(hoverTimeoutRef);
  });

  const formatFullTime = (start: Date, end: Date) => {
    return `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const location = () => props.event.metadata?.location || '';
  const price = () => props.event.metadata?.price || 0;
  const role = () => props.resource?.metadata?.role || '';
  const borderClass = () => role() === 'ELECTRICAL' ? 'border-l-[#CF4523]' : 'border-l-[#2563eb]';
  const isDispatched = () => getIsDispatched(props.event);

  return (
    <Popover open={isHovering() && !props.isDragging}>
      <PopoverTrigger as="div">
        <div
          class={cn(
            "flex flex-col justify-between h-[85px] p-3 pl-4 rounded-xl border border-slate-100 bg-white dark:bg-[#1a1a24] dark:border-border/30 text-left shadow-md hover:shadow-lg relative select-none touch-none cursor-pointer group",
            "transition-[box-shadow,transform,background-color] duration-200",
            "border-l-[4px]",
            borderClass(),
            props.isDragging && "opacity-60 scale-[1.02] shadow-md border-primary/40 ring-1 ring-primary/20"
          )}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          onPointerDown={(e) => {
            if (hoverTimeoutRef) clearTimeout(hoverTimeoutRef);
            setIsHovering(false);
            props.onDragStart(e, props.event.id);
          }}
          onClick={(e) => e.preventDefault()}
        >
          <div
            class="absolute left-0 top-0 w-2.5 h-full cursor-ew-resize z-20 flex items-center justify-start rounded-l-xl opacity-0 group-hover:opacity-100 transition-opacity"
            onPointerDown={(e) => {
              e.stopPropagation();
              if (hoverTimeoutRef) clearTimeout(hoverTimeoutRef);
              setIsHovering(false);
              props.onResizeStart(e, props.event.id, 'left');
            }}
          >
            <div class="w-1 h-1/2 bg-primary/40 rounded-r-md" />
          </div>

          <div
            class="absolute right-0 top-0 w-2.5 h-full cursor-ew-resize z-20 flex items-center justify-end rounded-r-xl opacity-0 group-hover:opacity-100 transition-opacity"
            onPointerDown={(e) => {
              e.stopPropagation();
              if (hoverTimeoutRef) clearTimeout(hoverTimeoutRef);
              setIsHovering(false);
              props.onResizeStart(e, props.event.id, 'right');
            }}
          >
            <div class="w-1 h-1/2 bg-primary/40 rounded-l-md" />
          </div>

          <div>
            <h4 class="font-sans font-bold text-text-primary text-[12px] leading-[16px] truncate">{props.event.title}</h4>
            <Show when={location()}>
              <div class="flex items-center gap-1.5 text-[12px] text-text-tertiary mt-0.5 min-w-0 font-roboto font-normal leading-normal">
                <span class="truncate">{location()}</span>
                <Show
                  when={isDispatched()}
                  fallback={<EyeOff class="w-3.5 h-3.5 text-orange-500 dark:text-orange-400 shrink-0" />}
                >
                  <Eye class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                </Show>
              </div>
            </Show>
          </div>

          <div class="flex items-center gap-3 mt-1.5 flex-nowrap overflow-hidden">
            <Badge
              variant="outline"
              class={cn(
                "text-[9px] font-bold px-2 py-0.5 rounded-full border-none uppercase tracking-wider shrink-0",
                STATUS_COLORS[props.event.status] || "bg-muted text-muted-foreground"
              )}
            >
              {props.event.status}
            </Badge>
            <span class="text-[12px] font-bold text-text-primary shrink-0">${price()}</span>
            <span class="text-[12px] text-text-tertiary shrink-0 truncate">{formatFullTime(props.event.startTime, props.event.endTime)}</span>
          </div>
        </div>
      </PopoverTrigger>

      <div onPointerEnter={handlePointerEnter} onPointerLeave={handlePointerLeave}>
        <EventDetailPopover event={props.event} resource={props.resource} />
      </div>
    </Popover>
  );
};
