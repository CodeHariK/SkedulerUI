import React, { memo } from 'react';
import type { Resource, EventItem } from './types';
import { EventCard } from './EventCard';
import { cn } from '@/lib/utils';
import type { VirtualItem } from '@tanstack/react-virtual';

interface TimelineGridProps {
  gridRef: React.RefObject<HTMLDivElement | null>;
  draggedElementRef: React.RefObject<HTMLDivElement | null>;
  draggedGridRowRef: React.RefObject<HTMLDivElement | null>;
  dropIndicator: { resourceId: string; startCol: number; endCol: number } | null;
  resizeIndicator: { eventId: string; startCol: number; endCol: number } | null;
  rowDrag: { resourceId: string; currentIndex: number } | null;
  rowDropIndicator: number | null;
  isPanning: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUpOrLeave: () => void;
  totalWidth: number;
  hours: number[];
  totalHours: number;
  formatHourLabel: (hour: number) => string;
  resources: Resource[];
  selection: { resourceId: string; startSlot: number; currentSlot: number; } | null;
  totalSlots: number;
  startCardDrag: (e: React.PointerEvent, eventId: string) => void;
  startCardResize: (e: React.PointerEvent, eventId: string, direction: 'left' | 'right') => void;
  handleRowPointerDown: (e: React.PointerEvent, resourceId: string) => void;
  renderEvent?: (event: EventItem, onDragStart?: (e: React.PointerEvent, eventId: string) => void, onResizeStart?: (e: React.PointerEvent, eventId: string, direction: 'left' | 'right') => void) => React.ReactNode;
  interactionEventId: string | undefined;
  virtualRows: VirtualItem[];
  totalSize: number;
  rowHeights: Record<string, number>;
  eventLanes: Record<string, number>;
  eventSpans: Record<string, { gridColumnStart: number; gridColumnEnd: number }>;
  eventsByResource: Record<string, EventItem[]>;
}

export const TimelineGrid: React.FC<TimelineGridProps> = memo(({
  gridRef, draggedElementRef, draggedGridRowRef, dropIndicator, resizeIndicator, rowDrag, rowDropIndicator, isPanning,
  onMouseDown, onMouseMove, onMouseUpOrLeave,
  totalWidth, hours, totalHours, formatHourLabel, resources,
  selection, totalSlots,
  startCardDrag, startCardResize, handleRowPointerDown,
  renderEvent, interactionEventId,
  virtualRows, totalSize, rowHeights, eventLanes, eventSpans, eventsByResource,
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
        {/* Hour Headers Row */}
        <div className="h-14 border-b border-border flex items-center relative bg-card sticky top-0 z-50">
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

        {/* Grid Body */}
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

              const isDraggingRow = rowDrag?.resourceId === resource.id;
              const isSelectedRow = selection && selection.resourceId === resource.id;
              const isDropTargetRow = dropIndicator && dropIndicator.resourceId === resource.id;

              // FIXED: Check if the card currently being dragged belongs to THIS specific row
              const hasActiveCard = interactionEventId ? resourceEvents.some(e => e.id === interactionEventId) : false;

              const startCol = isSelectedRow ? Math.min(selection.startSlot, selection.currentSlot) : 0;
              const endCol = isSelectedRow ? Math.max(selection.startSlot, selection.currentSlot) : 0;

              return (
                <div
                  key={`row-${resource.id}`}
                  data-index={virtualRow.index}
                  className="absolute w-full"
                  style={{
                    top: 0, left: 0,
                    height: `${rowHeights[resource.id] || 140}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                    // FIXED: Elevate the ENTIRE ROW's Stacking Context to prevent clipping behind other rows
                    zIndex: isDraggingRow ? 50 : (hasActiveCard ? 40 : 1)
                  }}
                >
                  <div
                    ref={isDraggingRow ? draggedGridRowRef : null}
                    onPointerDown={(e) => handleRowPointerDown(e, resource.id)}
                    className={cn(
                      "border-b border-border absolute w-full h-full flex items-start transition-colors cursor-cell",
                      isDraggingRow && "bg-primary/5 border-primary/20 shadow-xl !transition-none"
                    )}
                    style={{
                      backgroundColor: virtualRow.index % 2 === 0 ? 'var(--row-bg-even)' : 'var(--row-bg-odd)',
                      transform: isDraggingRow ? undefined : 'translate3d(0,0,0)'
                    }}
                  >
                    <div
                      className="absolute inset-0 grid content-center gap-y-2 px-2 pointer-events-none"
                      style={{ gridTemplateColumns: `repeat(${totalSlots}, minmax(0, 1fr))` }}
                    >
                      {/* Slot Selection Box */}
                      {isSelectedRow && (
                        <div
                          style={{ gridColumnStart: startCol + 1, gridColumnEnd: (startCol === endCol ? startCol + 4 : endCol) + 1, gridRowStart: 1, zIndex: 20 }}
                          className="bg-primary/15 border-2 border-dashed border-primary rounded-lg h-[85px] mx-1 backdrop-blur-[1px]"
                        />
                      )}

                      {/* FIXED: Drag Drop Ghost -> Explicit zIndex 30 + Backdrop blur overrides resting cards */}
                      {isDropTargetRow && dropIndicator && (
                        <div
                          style={{ gridColumnStart: dropIndicator.startCol + 1, gridColumnEnd: dropIndicator.endCol + 1, gridRowStart: 1, zIndex: 30 }}
                          className="bg-primary/20 border-2 border-dashed border-primary rounded-xl h-[85px] mx-1 backdrop-blur-[2px] shadow-sm"
                        />
                      )}

                      {resourceEvents.map((event) => {
                        const { gridColumnStart, gridColumnEnd } = eventSpans[event.id] || { gridColumnStart: 1, gridColumnEnd: 1 };
                        const lane = eventLanes[event.id] || 1;

                        const isDraggingThis = interactionEventId === event.id && dropIndicator !== null;
                        const isResizingThis = interactionEventId === event.id && resizeIndicator !== null;

                        const resizeGhostStart = isResizingThis ? resizeIndicator!.startCol + 1 : gridColumnStart;
                        const resizeGhostEnd = isResizingThis ? resizeIndicator!.endCol + 1 : gridColumnEnd;

                        const cardStyle: React.CSSProperties = {
                          gridColumnStart: isResizingThis ? resizeGhostStart : gridColumnStart,
                          gridColumnEnd: isResizingThis ? resizeGhostEnd : gridColumnEnd,
                          gridRowStart: lane,
                          // Resting cards stay at zIndex 10 so ghosts render cleanly above them
                          zIndex: isDraggingThis || isResizingThis ? 50 : 10
                        };
                        if (!isDraggingThis) {
                          cardStyle.transform = 'translate3d(0, 0, 0)';
                        }

                        return (
                          <React.Fragment key={event.id}>

                            {/* FIXED: Resize Ghost -> Explicit zIndex 30 + Backdrop blur */}
                            {isResizingThis && (
                              <div
                                style={{ gridColumnStart: resizeGhostStart, gridColumnEnd: resizeGhostEnd, gridRowStart: lane, zIndex: 30 }}
                                className="bg-primary/20 border-2 border-dashed border-primary rounded-xl h-[85px] mx-1 backdrop-blur-[2px] shadow-sm"
                              />
                            )}

                            <div
                              ref={isDraggingThis ? draggedElementRef : null}
                              style={cardStyle}
                              className={cn(
                                "pointer-events-auto px-1 relative",
                                isDraggingThis && "opacity-80 !transition-none",
                                isResizingThis && "!transition-none"
                              )}
                            >
                              {renderEvent ? (
                                renderEvent(event, (e) => startCardDrag(e, event.id), (e, _, direction) => startCardResize(e, event.id, direction))
                              ) : (
                                <EventCard
                                  event={event}
                                  resource={resource}
                                  isDragging={isDraggingThis}
                                  onDragStart={startCardDrag}
                                  onResizeStart={startCardResize}
                                />
                              )}
                            </div>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>

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
      </div>
    </div>
  );
});
