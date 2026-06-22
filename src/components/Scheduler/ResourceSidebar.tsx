import React from 'react';
import type { Resource } from './types';
import { cn } from '@/lib/utils';
import type { VirtualItem } from '@tanstack/react-virtual';
import { ResourceCard } from './ResourceCard';

interface ResourceSidebarProps {
  resources: Resource[];
  virtualRows: VirtualItem[];
  totalSize: number;
  rowDrag: { resourceId: string; currentIndex: number } | null;
  rowDropIndicator: number | null;
  draggedSidebarRowRef: React.RefObject<HTMLDivElement | null>;
  startRowDrag: (e: React.PointerEvent, resourceId: string) => void;
  renderResource?: (resource: Resource, onGripMouseDown?: (e: React.PointerEvent) => void) => React.ReactNode;
}

export const ResourceSidebar: React.FC<ResourceSidebarProps> = React.memo(({
  resources, virtualRows, totalSize, rowDrag, rowDropIndicator, draggedSidebarRowRef, startRowDrag, renderResource,
}) => {
  const defaultRenderResource = (resource: Resource, onGripMouseDown?: (e: React.PointerEvent) => void) => (
    <ResourceCard resource={resource} onGripMouseDown={onGripMouseDown} />
  );

  return (
    <div
      className="w-[240px] flex-shrink-0 select-none sticky left-0 z-40"
      style={{ height: `${totalSize + 56}px` }}
    >
      <div className="h-14 flex items-center px-6 border-b border-r border-border bg-card sticky top-0 left-0 z-50">
        <span className="text-[10px] font-bold tracking-wider text-text-tertiary uppercase">TECHNICIANS</span>
      </div>

      <div className="sticky left-0 bg-card border-r border-border" style={{ height: `${totalSize}px`, width: '100%', position: 'relative' }}>
        {virtualRows.map((virtualRow) => {
          const resource = resources[virtualRow.index];
          if (!resource) return null;

          const isDraggingRow = rowDrag?.resourceId === resource.id;
          const bgEvenOdd = virtualRow.index % 2 === 0 ? 'var(--row-bg-even)' : 'var(--row-bg-odd)';

          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute', top: 0, left: 0, width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
                zIndex: isDraggingRow ? 50 : 1 // The outer wrapper needs z-index 50 so the clone can float
              }}
            >
              {/* THE STATIC PLACEHOLDER: Stays behind, slightly opaque, holding the space */}
              <div
                className={cn(
                  "flex items-center gap-3 px-4 border-b border-border relative select-none h-full",
                  isDraggingRow ? "opacity-30 bg-muted grayscale" : "hover:bg-muted/10 transition-colors group"
                )}
                style={{ backgroundColor: isDraggingRow ? undefined : bgEvenOdd }}
              >
                {renderResource
                  ? renderResource(resource, (e) => startRowDrag(e, resource.id))
                  : defaultRenderResource(resource, (e) => startRowDrag(e, resource.id))}
              </div>

              {/* THE FLOATING CLONE: Rendered ONLY when this row is being dragged */}
              {isDraggingRow && (
                <div
                  ref={draggedSidebarRowRef}
                  className="flex items-center gap-3 px-4 border-b border-border select-none h-full absolute inset-0 opacity-100 border-primary/40 bg-primary/5 !transition-none cursor-grabbing"
                  style={{ backgroundColor: bgEvenOdd }}
                >
                  {renderResource
                    ? renderResource(resource, () => { }) // Disable drag triggers on the clone
                    : defaultRenderResource(resource, () => { })}
                </div>
              )}

              {rowDropIndicator === virtualRow.index && !isDraggingRow && rowDrag && (
                <div
                  className="absolute left-0 right-0 h-0.5 bg-primary z-40 pointer-events-none"
                  style={{ top: rowDropIndicator > rowDrag.currentIndex ? '100%' : '0px' }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});
