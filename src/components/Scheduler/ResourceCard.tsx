import React from 'react';
import type { Resource } from './types';
import { cn } from '@/lib/utils';
import { Calendar, GripVertical } from 'lucide-react';

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
        className="text-muted-foreground/40 cursor-grab touch-none hover:text-text-primary rounded hover:bg-muted/50 transition-all duration-200 ease-in-out w-0 opacity-0 overflow-hidden group-hover:w-7 group-hover:opacity-100 flex items-center justify-center shrink-0"
        onPointerDown={onGripMouseDown}
      >
        <GripVertical className="size-4" />
      </div>
      <div className={cn(
        "flex items-center justify-center w-9 h-9 rounded-full font-bold text-sm border shrink-0",
        role === 'ELECTRICAL' && "bg-[#FEF6F5] text-[#CF4523] border-[#FCDFD4]",
        role === 'PLUMBING' && "bg-[#F3F8FF] text-[#1D4ED8] border-[#DBEAFE]",
        role === 'HVAC' && "bg-[#EEFAFC] text-[#1E7BAF] border-[#C1E7EF]",
        role === 'UNASSIGNED' && "bg-[#F3F4F6] text-[#6A7282] border-[#E5E7EB]",
        !['ELECTRICAL', 'PLUMBING', 'HVAC', 'UNASSIGNED'].includes(role) && "bg-secondary text-secondary-foreground border-transparent"
      )}>
        {resource.avatar || resource.name.slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-text-primary text-sm truncate">{resource.name}</h3>
        <div className="flex items-center gap-1.5 mt-1 flex-nowrap overflow-hidden">
          {role && (<span className="text-[12px] tracking-wider text-text-tertiary uppercase shrink-0">{role}</span>)}
          {jobsCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-text-secondary font-medium shrink-0"><Calendar className="w-3 h-3" />
              {jobsCount} {jobsCount === 1 ? 'Job' : 'Jobs'}
            </span>)}
        </div>
      </div>
    </>
  );
});

ResourceCard.displayName = 'ResourceCard';
