import React from 'react';
import type { Resource } from './types';
import { cn } from '@/lib/utils';
import { Calendar, GripVertical } from 'lucide-react';

import type { VirtualItem } from '@tanstack/react-virtual';

interface ResourceSidebarProps {
  resources: Resource[];
  virtualRows: VirtualItem[];
  totalSize: number;
  rowDragResourceId: string | undefined;
  startRowDrag: (e: React.PointerEvent, resourceId: string) => void;
  renderResource?: (resource: Resource, onGripMouseDown?: (e: React.PointerEvent) => void) => React.ReactNode;
}

export const ResourceSidebar: React.FC<ResourceSidebarProps> = React.memo(({
  resources,
  virtualRows,
  totalSize,
  rowDragResourceId,
  startRowDrag,
  renderResource,
}) => {
  const defaultRenderResource = (resource: Resource, index: number, onGripMouseDown?: (e: React.PointerEvent) => void) => {
    const role = resource.metadata?.role || '';
    const jobsCount = resource.metadata?.jobsCount || 0;
    const isDraggingRow = rowDragResourceId === resource.id;

    return (
      <div
        className={cn(
          "flex items-center gap-3 px-4 border-b border-border hover:bg-muted/10 transition-colors relative select-none group h-full",
          isDraggingRow && "opacity-50 border-primary/20 bg-primary/5 z-20 shadow-inner"
        )}
        style={{
          backgroundColor: index % 2 === 0 ? 'var(--row-bg-even)' : 'var(--row-bg-odd)'
        }}
      >
        {/* Grip Icon */}
        <div
          className="text-muted-foreground/40 cursor-grab touch-none hover:text-text-primary rounded hover:bg-muted/50 transition-all duration-200 ease-in-out w-0 opacity-0 overflow-hidden group-hover:w-7 group-hover:opacity-100 flex items-center justify-center shrink-0"
          onPointerDown={onGripMouseDown}
        >
          <GripVertical className="size-4" />
        </div>

        {/* Avatar */}
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

      </div>
    );
  };

  return (
    <div className="w-[240px] flex-shrink-0 border-r border-border bg-card z-10 select-none">
      {/* Header Spacer */}
      <div className="h-14 flex items-center px-6 border-b border-border bg-card sticky top-0 z-30">
        <span className="text-[10px] font-bold tracking-wider text-text-tertiary uppercase">TECHNICIANS</span>
      </div>

      {/* Resource list items */}
      <div style={{ height: `${totalSize}px`, width: '100%', position: 'relative' }}>
        {virtualRows.map((virtualRow) => {
          const resource = resources[virtualRow.index];
          if (!resource) return null;
          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,   // FIXED: Critical for virtualizer positioning!
                left: 0,  // FIXED: Critical for virtualizer positioning!
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {renderResource
                ? renderResource(resource, (e) => startRowDrag(e, resource.id))
                : defaultRenderResource(resource, virtualRow.index, (e) => startRowDrag(e, resource.id))}
            </div>
          );
        })}
      </div>
    </div>
  );
});
