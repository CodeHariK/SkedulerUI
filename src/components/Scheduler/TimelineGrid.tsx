import React, { memo } from 'react';
import type { Resource, EventItem } from './types';
import { EventCard } from './EventCard';
import { cn } from '@/lib/utils';

interface TimelineGridProps {
  gridRef: React.RefObject<HTMLDivElement | null>;
  isPanning: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUpOrLeave: () => void;
  totalWidth: number;
  hours: number[];
  totalHours: number;
  formatHourLabel: (hour: number) => string;
  resources: Resource[];
  events: EventItem[];
  rowDragResourceId: string | undefined;
  selection: { resourceId: string; startSlot: number; currentSlot: number; } | null;
  totalSlots: number;
  dayStartHour: number;
  slotsPerHour: number;
  getEventGridSpan: (
    start: Date,
    end: Date,
    dayStartHour: number,
    totalHours: number,
    slotsPerHour: number
  ) => { gridColumnStart: number; gridColumnEnd: number };
  startCardDrag: (e: React.PointerEvent, eventId: string) => void;
  startCardResize: (e: React.PointerEvent, eventId: string, direction: 'left' | 'right') => void;
  handleRowPointerDown: (e: React.PointerEvent, resourceId: string) => void;
  renderEvent?: (
    event: EventItem,
    onDragStart?: (e: React.PointerEvent) => void,
    onResizeStart?: (e: React.PointerEvent, direction: 'left' | 'right') => void
  ) => React.ReactNode;
  interactionEventId: string | undefined;
  rowHeights: Record<string, number>;
}

export const TimelineGrid: React.FC<TimelineGridProps> = memo(({
  gridRef,
  isPanning,
  onMouseDown,
  onMouseMove,
  onMouseUpOrLeave,
  totalWidth,
  hours,
  totalHours,
  formatHourLabel,
  resources,
  events,
  rowHeights,
  rowDragResourceId,
  selection,
  totalSlots,
  dayStartHour,
  slotsPerHour,
  getEventGridSpan,
  startCardDrag,
  startCardResize,
  handleRowPointerDown,
  renderEvent,
  interactionEventId,
}) => {
  return (
    <div
      ref={gridRef}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUpOrLeave}
      onMouseLeave={onMouseUpOrLeave}
      className={cn(
        "flex-1 overflow-x-auto select-none",
        isPanning ? "cursor-grabbing" : "cursor-grab"
      )}
      style={{ scrollBehavior: isPanning ? 'auto' : 'smooth' }}
    >
      <div className="flex flex-col relative" style={{ width: `${totalWidth}px` }}>
        {/* Hour Headers Row */}
        <div className="h-14 border-b border-border flex items-center relative bg-card">
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
          {/* Vertical grid lines (background) */}
          <div className="absolute inset-0 pointer-events-none flex">
            {hours.map((hour, idx) => (
              <div
                key={`line-${hour}`}
                className="absolute h-full border-l border-border/20"
                style={{ left: `${(idx / totalHours) * 100}%` }}
              />
            ))}
          </div>

          {/* Resource rows with events */}
          {resources.map((resource) => {
            const resourceEvents = events.filter((e) => e.resourceId === resource.id);
            const isDraggingRow = rowDragResourceId === resource.id;
            const isSelectedRow = selection && selection.resourceId === resource.id;

            const startCol = isSelectedRow ? Math.min(selection.startSlot, selection.currentSlot) : 0;
            const endCol = isSelectedRow ? Math.max(selection.startSlot, selection.currentSlot) : 0;

            return (
              <div
                key={`row-${resource.id}`}
                onPointerDown={(e) => handleRowPointerDown(e, resource.id)}
                className={cn(
                  "border-b border-border flex items-start relative transition-colors cursor-cell",
                  isDraggingRow && "bg-primary/5 border-primary/20"
                )}
                style={{ height: `${rowHeights[resource.id] || 140}px` }}
              >
                {/* Events Placement Area */}
                <div
                  className="absolute inset-0 grid items-start py-4 gap-y-2 px-2 pointer-events-none"
                  style={{ gridTemplateColumns: `repeat(${totalSlots}, minmax(0, 1fr))` }}
                >
                  {/* Temporary Selection Block Highlight */}
                  {isSelectedRow && (
                    <div
                      style={{
                        gridColumnStart: startCol + 1,
                        gridColumnEnd: (startCol === endCol ? startCol + 4 : endCol) + 1
                      }}
                      className="bg-primary/15 border-2 border-dashed border-primary/30 rounded-lg h-[85px] z-0"
                    />
                  )}

                  {resourceEvents.map((event) => {
                    const { gridColumnStart, gridColumnEnd } = getEventGridSpan(
                      event.startTime,
                      event.endTime,
                      dayStartHour,
                      totalHours,
                      slotsPerHour
                    );
                    const isDraggingThis = interactionEventId === event.id;

                    return (
                      <div
                        key={event.id}
                        style={{ gridColumnStart, gridColumnEnd }}
                        className="pointer-events-auto px-1 z-10"
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
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
