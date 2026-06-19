import React, { memo } from 'react';
import type { Resource, EventItem } from './types';
import { EventCard } from './EventCard';
import { cn } from '@/lib/utils';
import type { VirtualItem } from '@tanstack/react-virtual';

interface TimelineGridProps {
  gridRef: React.RefObject<HTMLDivElement | null>;
  draggedElementRef: React.RefObject<HTMLDivElement | null>;
  dropIndicator: { resourceId: string; startCol: number; endCol: number } | null;
  resizeIndicator: { eventId: string; startCol: number; endCol: number } | null;
  isPanning: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUpOrLeave: () => void;
  totalWidth: number;
  hours: number[];
  totalHours: number;
  formatHourLabel: (hour: number) => string;
  resources: Resource[];
  rowDragResourceId: string | undefined;
  selection: { resourceId: string; startSlot: number; currentSlot: number; } | null;
  totalSlots: number;
  dayStartHour: number;
  slotsPerHour: number;
  getEventGridSpan: (start: Date, end: Date, dayStartHour: number, totalHours: number, slotsPerHour: number) => { gridColumnStart: number; gridColumnEnd: number };
  startCardDrag: (e: React.PointerEvent, eventId: string) => void;
  startCardResize: (e: React.PointerEvent, eventId: string, direction: 'left' | 'right') => void;
  handleRowPointerDown: (e: React.PointerEvent, resourceId: string) => void;
  renderEvent?: (event: EventItem, onDragStart?: (e: React.PointerEvent) => void, onResizeStart?: (e: React.PointerEvent, direction: 'left' | 'right') => void) => React.ReactNode;
  interactionEventId: string | undefined;
  virtualRows: VirtualItem[];
  totalSize: number;
  rowHeights: Record<string, number>;
  eventLanes: Record<string, number>;
  eventsByResource: Record<string, EventItem[]>;
}

export const TimelineGrid: React.FC<TimelineGridProps> = memo(({
  gridRef, draggedElementRef, dropIndicator, resizeIndicator, isPanning,
  onMouseDown, onMouseMove, onMouseUpOrLeave,
  totalWidth, hours, totalHours, formatHourLabel, resources,
  rowDragResourceId, selection, totalSlots, dayStartHour, slotsPerHour,
  getEventGridSpan, startCardDrag, startCardResize, handleRowPointerDown,
  renderEvent, interactionEventId,
  virtualRows, totalSize, rowHeights, eventLanes, eventsByResource,
}) => {
  return (
    <div
      ref={gridRef}
      onMouseDown={onMouseDown} onMouseMove={onMouseMove}
      onMouseUp={onMouseUpOrLeave} onMouseLeave={onMouseUpOrLeave}
      className={cn("flex-1 overflow-x-auto select-none", isPanning ? "cursor-grabbing" : "cursor-grab")}
      style={{ scrollBehavior: isPanning ? 'auto' : 'smooth' }}
    >
      <div className="flex flex-col relative" style={{ width: `${totalWidth}px`, minWidth: '100%' }}>
        <div className="h-14 border-b border-border flex items-center relative bg-card sticky top-0 z-30">
          {hours.map((hour, idx) => (
            <div
              key={hour}
              className="absolute text-[10px] font-semibold text-text-secondary border-l border-border/50 h-full flex items-center pl-3"
              style={{ left: `${(idx / totalHours) * 100}%`, width: `${(1 / totalHours) * 100}%` }}
            >
              {formatHourLabel(hour)}
            </div>
          ))}
        </div>

        <div className="flex flex-col relative">
          <div className="absolute inset-0 pointer-events-none flex z-[0]">
            {hours.map((hour, idx) => (
              <div key={`line-${hour}`} className="absolute h-full border-l border-border/40" style={{ left: `${(idx / totalHours) * 100}%` }} />
            ))}
          </div>

          <div style={{ height: `${totalSize}px`, width: '100%', position: 'relative' }}>
            {virtualRows.map((virtualRow) => {
              const resource = resources[virtualRow.index];
              if (!resource) return null;

              const resourceEvents = eventsByResource[resource.id] || [];

              const isDraggingRow = rowDragResourceId === resource.id;
              const isSelectedRow = selection && selection.resourceId === resource.id;
              const isDropTargetRow = dropIndicator && dropIndicator.resourceId === resource.id;

              const startCol = isSelectedRow ? Math.min(selection.startSlot, selection.currentSlot) : 0;
              const endCol = isSelectedRow ? Math.max(selection.startSlot, selection.currentSlot) : 0;

              return (
                <div
                  key={`row-${resource.id}`}
                  data-index={virtualRow.index}
                  onPointerDown={(e) => handleRowPointerDown(e, resource.id)}
                  className={cn(
                    "border-b border-border absolute w-full flex items-start transition-colors cursor-cell",
                    isDraggingRow && "bg-primary/5 border-primary/20"
                  )}
                  style={{
                    top: 0, left: 0,
                    height: `${rowHeights[resource.id] || 140}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                    backgroundColor: virtualRow.index % 2 === 0 ? 'var(--row-bg-even)' : 'var(--row-bg-odd)'
                  }}
                >
                  <div
                    className="absolute inset-0 grid content-center gap-y-2 px-2 pointer-events-none"
                    style={{ gridTemplateColumns: `repeat(${totalSlots}, minmax(0, 1fr))` }}
                  >
                    {isSelectedRow && (
                      <div
                        style={{ gridColumnStart: startCol + 1, gridColumnEnd: (startCol === endCol ? startCol + 4 : endCol) + 1, gridRowStart: 1 }}
                        className="bg-primary/15 border-2 border-dashed border-primary/30 rounded-lg h-[85px] z-0 mx-1"
                      />
                    )}

                    {isDropTargetRow && dropIndicator && (
                      <div
                        style={{ gridColumnStart: dropIndicator.startCol + 1, gridColumnEnd: dropIndicator.endCol + 1, gridRowStart: 1 }}
                        className="bg-primary/10 border-2 border-dashed border-primary/40 rounded-xl h-[85px] z-20 mx-1"
                      />
                    )}

                    {resourceEvents.map((event) => {
                      const { gridColumnStart, gridColumnEnd } = getEventGridSpan(event.startTime, event.endTime, dayStartHour, totalHours, slotsPerHour);
                      const lane = eventLanes[event.id] || 1;

                      const isDraggingThis = interactionEventId === event.id && dropIndicator !== null;
                      const isResizingThis = interactionEventId === event.id && resizeIndicator !== null;

                      const resizeGhostStart = isResizingThis ? resizeIndicator!.startCol + 1 : gridColumnStart;
                      const resizeGhostEnd = isResizingThis ? resizeIndicator!.endCol + 1 : gridColumnEnd;

                      return (
                        <React.Fragment key={event.id}>
                          {/* Live Resize Indicator overlay */}
                          {isResizingThis && (
                            <div
                              style={{
                                gridColumnStart: resizeGhostStart,
                                gridColumnEnd: resizeGhostEnd,
                                gridRowStart: lane,
                              }}
                              className="bg-primary/10 border-2 border-dashed border-primary/40 rounded-xl h-[85px] z-10 mx-1 transition-all duration-75"
                            />
                          )}

                          <div
                            ref={isDraggingThis ? draggedElementRef : null} // ✅ Safely attaches to wrapper without state updates
                            style={{
                              gridColumnStart: isResizingThis ? resizeGhostStart : gridColumnStart,
                              gridColumnEnd: isResizingThis ? resizeGhostEnd : gridColumnEnd,
                              gridRowStart: lane,
                              // FIXED: Explicitly set transform to undefined when dragging so React doesn't overwrite it
                              transform: isDraggingThis ? undefined : 'translate3d(0, 0, 0)',
                              zIndex: isDraggingThis || isResizingThis ? 50 : 10
                            }}
                            className={cn(
                              "pointer-events-auto px-1 relative",
                              isDraggingThis && "opacity-80 !transition-none",
                              isResizingThis && "!transition-none"
                            )}
                          >
                            {renderEvent ? (
                              renderEvent(
                                event,
                                (e) => startCardDrag(e, event.id),
                                (e, direction) => startCardResize(e, event.id, direction)
                              )
                            ) : (
                              <EventCard
                                event={event}
                                resource={resource}
                                isDragging={isDraggingThis}
                                onDragStart={(e) => startCardDrag(e, event.id)}
                                onResizeStart={(e, direction) => startCardResize(e, event.id, direction)}
                              />
                            )}
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});
