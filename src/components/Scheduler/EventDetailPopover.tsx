import React from 'react';
import type { Resource, EventItem } from './types';
import { cn } from '@/lib/cn';
import {
  SUICoreBadge,
  SUICoreButton,
  SUICoreSeparator,
  SUICorePopoverContent,
  SUICoreBodyText,
  SUICoreIcon,
} from '@/components/sui';
import { STATUS_BADGE_VARIANT, getIsDispatched, formatJobNumber } from './constants';

// Keep in sync with the content width below (w-[320px]).
const DETAIL_WIDTH = 320;

interface EventDetailPopoverProps {
  event: EventItem;
  resource?: Resource;
  /** Pointer x measured from the card's left edge — the card is centered on it. */
  pointerOffset?: number;
  onPointerEnter?: React.PointerEventHandler<HTMLDivElement>;
  onPointerLeave?: React.PointerEventHandler<HTMLDivElement>;
}

export const EventDetailPopover: React.FC<EventDetailPopoverProps> = ({
  event,
  resource,
  pointerOffset = 0,
  onPointerEnter,
  onPointerLeave,
}) => {
  // Center the card on the pointer (align="start" anchors the left edge, so shift
  // left by half the width). Radix's collision handling keeps it on-screen.
  const alignOffset = pointerOffset - DETAIL_WIDTH / 2;
  const location = event.metadata?.location || '';
  const price = event.metadata?.price || 0;

  const formatFullTime = (start: Date, end: Date) =>
    `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

  const isDispatched = getIsDispatched(event);
  const role = resource?.metadata?.role;
  const avatarBg =
    role === 'ELECTRICAL'
      ? 'bg-trade-electrical-bg text-trade-electrical border-trade-electrical-ring'
      : 'bg-trade-plumbing-bg text-trade-plumbing border-trade-plumbing-ring';

  return (
    <SUICorePopoverContent
      className="w-[320px] p-5 rounded-card flex flex-col gap-4 select-none"
      side="bottom"
      align="start"
      alignOffset={alignOffset}
      collisionPadding={8}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <div className="flex justify-between items-start gap-4">
        <div className="min-w-0">
          <SUICoreBodyText size="md" weight="bold" className="leading-snug">{event.title}</SUICoreBodyText>
          <SUICoreBodyText size="2xs" tone="muted" weight="medium" className="mt-1">
            JOB #{formatJobNumber(event.id)} • Compliance
          </SUICoreBodyText>
        </div>
        <SUICoreBadge variant={STATUS_BADGE_VARIANT[event.status]} text={event.status} className="whitespace-nowrap" />
      </div>

      {location && (
        <div className="flex items-center gap-1.5 text-body-xs text-fg-secondary font-medium">
          <SUICoreIcon name="mapPin" size="xs" className="text-fg-tertiary shrink-0" />
          <span>{location}</span>
        </div>
      )}

      <SUICoreSeparator />

      <div className="flex flex-col gap-3.5 text-body-xs font-medium">
        <div className="flex justify-between items-center gap-2">
          <span className="text-fg-tertiary">Time</span>
          <span className="font-semibold text-fg-primary">{formatFullTime(event.startTime, event.endTime)}</span>
        </div>

        <div className="flex justify-between items-center gap-2">
          <span className="text-fg-tertiary">Technician</span>
          <div className="flex items-center gap-2">
            <div className={cn('flex items-center justify-center w-6 h-6 rounded-full font-bold text-body-2xs border shrink-0', avatarBg)}>
              {resource ? resource.avatar || resource.name.slice(0, 2).toUpperCase() : 'UN'}
            </div>
            <span className="font-semibold text-fg-primary">{resource ? resource.name : 'Unassigned'}</span>
          </div>
        </div>

        <div className="flex justify-between items-center gap-2">
          <span className="text-fg-tertiary">Callout fee</span>
          <span className="font-semibold text-fg-primary">${price}</span>
        </div>

        <div className="flex justify-between items-center gap-2">
          <span className="text-fg-tertiary">Dispatch</span>
          <div className={cn('flex items-center gap-1 font-semibold', isDispatched ? 'text-success-500' : 'text-warning-500')}>
            <SUICoreIcon name={isDispatched ? 'eye' : 'eyeOff'} size="xs" />
            <span>{isDispatched ? 'Dispatched' : 'Pending'}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2.5 mt-2">
        <SUICoreButton variant="primary" width="full" text="View Job" className="flex-1" />
        <SUICoreButton variant="outline" width="full" text="Reschedule" className="flex-1" />
      </div>
    </SUICorePopoverContent>
  );
};
