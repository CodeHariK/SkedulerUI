import React, { memo } from 'react';
import type { Resource, EventItem } from './types';
import { EventCard } from './EventCard';
import { cn } from '@/lib/utils';

const assignEventLanes = (events: EventItem[]) => {
  const sorted = [...events].sort((a, b) => {
    const diff = a.startTime.getTime() - b.startTime.getTime();
    return diff !== 0 ? diff : a.id.localeCompare(b.id);
  });
  const lanes: number[] = [];
  const eventLanes: Record<string, number> = {};

  sorted.forEach(event => {
    let placed = false;
    for (let i = 0; i < lanes.length; i++) {
      if (lanes[i] <= event.startTime.getTime()) {
        lanes[i] = event.endTime.getTime();
        eventLanes[event.id] = i + 1;
        placed = true;
        break;
      }
    }
    if (!placed) {
      lanes.push(event.endTime.getTime());
      eventLanes[event.id] = lanes.length;
    }
  });
  return eventLanes;
};

interface TimelineGridProps {
  gridRef: React.RefObject<HTMLDivElement | null>;
  dragPosition: { x: number; y: number } | null;
  dropIndicator: { resourceId: string; startCol: number; endCol: number } | null;
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
  dragPosition,
  dropIndicator,
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
          {resources.map((resource, index) => {
            const resourceEvents = events.filter((e) => e.resourceId === resource.id);
            const eventLanes = assignEventLanes(resourceEvents);

            const isDraggingRow = rowDragResourceId === resource.id;
            const isSelectedRow = selection && selection.resourceId === resource.id;
            const isDropTargetRow = dropIndicator && dropIndicator.resourceId === resource.id;

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
                style={{ 
                  height: `${rowHeights[resource.id] || 140}px`,
                  backgroundColor: index % 2 === 0 ? 'var(--row-bg-even)' : 'var(--row-bg-odd)'
                }}
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
                        gridColumnEnd: (startCol === endCol ? startCol + 4 : endCol) + 1,
                        gridRowStart: 1
                      }}
                      className="bg-primary/15 border-2 border-dashed border-primary/30 rounded-lg h-[85px] z-0"
                    />
                  )}

                  {/* Dashed Ghost Drop Indicator */}
                  {isDropTargetRow && dropIndicator && (
                    <div
                      style={{
                        gridColumnStart: dropIndicator.startCol + 1,
                        gridColumnEnd: dropIndicator.endCol + 1,
                        gridRowStart: 1
                      }}
                      className="bg-primary/10 border-2 border-dashed border-primary/40 rounded-xl h-[85px] z-0 mx-1"
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

                    const lane = eventLanes[event.id] || 1;
                    const isDraggingThis = interactionEventId === event.id;

                    const transformStyle = isDraggingThis && dragPosition
                      ? `translate3d(${dragPosition.x}px, ${dragPosition.y}px, 0)`
                      : 'translate3d(0, 0, 0)';

                    return (
                      <div
                        key={event.id}
                        style={{
                          gridColumnStart,
                          gridColumnEnd,
                          gridRowStart: lane,
                          transform: transformStyle,
                          zIndex: isDraggingThis ? 50 : 10
                        }}
                        className={cn(
                          "pointer-events-auto px-1 relative",
                          isDraggingThis && "opacity-90"
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
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Grid Column Line Separators Overlay */}
          <div className="absolute inset-0 pointer-events-none flex">
            {hours.map((hour, idx) => (
              <div
                key={`line-${hour}`}
                className="absolute h-full border-l border-border"
                style={{ left: `${(idx / totalHours) * 100}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});
