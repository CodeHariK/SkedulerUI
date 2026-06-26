import React from 'react';
import type { Resource } from './types';
import { cn } from '@/lib/cn';
import { SUICoreIcon, SUICoreBodyText } from '@/components/sui';

interface ResourceCardProps {
  resource: Resource;
  /** Pointer-down handler wired to the drag grip; omit to render a non-draggable card. */
  onGripMouseDown?: (e: React.PointerEvent) => void;
}

/**
 * Default sidebar card for a single resource (technician). Mirrors EventCard:
 * a standalone, memoized component that ResourceSidebar falls back to when no
 * custom `renderResource` render prop is supplied.
 */
export const ResourceCard: React.FC<ResourceCardProps> = React.memo(({ resource, onGripMouseDown }) => {
  const role = resource.metadata?.role || '';
  const jobsCount = resource.metadata?.jobsCount || 0;

  return (
    <>
      <div
        className="text-fg-tertiary/50 cursor-grab touch-none hover:text-fg-primary rounded hover:bg-neutral-100 transition-all duration-200 ease-in-out w-0 opacity-0 overflow-hidden group-hover:w-7 group-hover:opacity-100 flex items-center justify-center shrink-0"
        onPointerDown={onGripMouseDown}
      >
        <SUICoreIcon name="gripVertical" size="sm" />
      </div>
      <div className={cn(
        "flex items-center justify-center w-9 h-9 rounded-full font-bold text-body-sm border shrink-0",
        role === 'ELECTRICAL' && "bg-trade-electrical-bg text-trade-electrical border-trade-electrical-ring",
        role === 'PLUMBING' && "bg-trade-plumbing-bg text-trade-plumbing border-trade-plumbing-ring",
        role === 'HVAC' && "bg-trade-hvac-bg text-trade-hvac border-trade-hvac-ring",
        role === 'UNASSIGNED' && "bg-trade-unassigned-bg text-trade-unassigned border-trade-unassigned-ring",
        !['ELECTRICAL', 'PLUMBING', 'HVAC', 'UNASSIGNED'].includes(role) && "bg-neutral-100 text-fg-secondary border-transparent"
      )}>
        {resource.avatar || resource.name.slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <SUICoreBodyText size="sm" weight="bold" className="truncate">{resource.name}</SUICoreBodyText>
        <div className="flex items-center gap-1.5 mt-1 flex-nowrap overflow-hidden">
          {role && (<span className="text-body-xs tracking-wider text-fg-tertiary uppercase shrink-0">{role}</span>)}
          {jobsCount > 0 && (
            <span className="flex items-center gap-1 text-body-2xs text-fg-secondary font-medium shrink-0"><SUICoreIcon name="calendar" size="xs" />
              {jobsCount} {jobsCount === 1 ? 'Job' : 'Jobs'}
            </span>)}
        </div>
      </div>
    </>
  );
});

ResourceCard.displayName = 'ResourceCard';
