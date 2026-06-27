import React, { memo } from 'react';
import type { Resource, EventItem, CardFieldKey } from './types';
import { EventCard } from './EventCard';
import { cn } from '@/lib/utils';
import type { VirtualItem } from '@tanstack/react-virtual';

type DropIndicator = { resourceId: string; startCol: number; endCol: number } | null;
type ResizeIndicator = { eventId: string; startCol: number; endCol: number } | null;
type Selection = { resourceId: string; startSlot: number; currentSlot: number } | null;

interface TimelineGridProps {
  gridRef: React.RefObject<HTMLDivElement | null>;
  draggedElementRef: React.RefObject<HTMLDivElement | null>;
  draggedGridRowRef: React.RefObject<HTMLDivElement | null>;
  dropIndicator: DropIndicator;
  resizeIndicator: ResizeIndicator;
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
  selection: Selection;
  /** Human-readable time range of the in-progress selection ghost. */
  selectionLabel: string | null;
  /** Live time range labels for the move/resize ghosts. */
  dropLabel: string | null;
  resizeLabel: string | null;
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
  animateLayout: boolean;
  detailTrigger: 'hover' | 'click';
  cardRows: CardFieldKey[][];
}

// ---------------------------------------------------------------------------
// Row content (selection / drop / events). Kept pure: it only reads the props
// that are narrowed per-row by the parent, so unaffected rows never re-render.
// ---------------------------------------------------------------------------
interface RowContentProps {
  resource: Resource;
  resourceEvents: EventItem[];
  totalSlots: number;
  isClone: boolean;
  selectionForRow: Selection;
  selectionLabel?: string | null;
  dropLabel?: string | null;
  resizeLabel?: string | null;
  dropIndicatorForRow: DropIndicator;
  resizeIndicatorForRow: ResizeIndicator;
  interactionEventId: string | undefined;
  isDragActive: boolean;
  eventSpans: Record<string, { gridColumnStart: number; gridColumnEnd: number }>;
  eventLanes: Record<string, number>;
  draggedElementRef: React.RefObject<HTMLDivElement | null>;
  startCardDrag: (e: React.PointerEvent, eventId: string) => void;
  startCardResize: (e: React.PointerEvent, eventId: string, direction: 'left' | 'right') => void;
  renderEvent?: TimelineGridProps['renderEvent'];
  detailTrigger: 'hover' | 'click';
  cardRows: CardFieldKey[][];
}

// Floating "start – end" pill shown above an interaction ghost.
const GhostTimeLabel: React.FC<{ label: string }> = ({ label }) => (
  <span className="absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+4px)] px-2 py-1 rounded-md bg-primary text-primary-foreground text-xs font-semibold whitespace-nowrap shadow-md pointer-events-none z-30">
    {label}
  </span>
);

const RowContent: React.FC<RowContentProps> = ({
  resource, resourceEvents, totalSlots, isClone,
  selectionForRow, selectionLabel, dropLabel, resizeLabel, dropIndicatorForRow, resizeIndicatorForRow,
  interactionEventId, isDragActive, eventSpans, eventLanes,
  draggedElementRef, startCardDrag, startCardResize, renderEvent, detailTrigger, cardRows,
}) => {
  const isSelectedRow = !!selectionForRow;
  const startCol = isSelectedRow ? Math.min(selectionForRow!.startSlot, selectionForRow!.currentSlot) : 0;
  const endCol = isSelectedRow ? Math.max(selectionForRow!.startSlot, selectionForRow!.currentSlot) : 0;

  return (
    <div className="absolute inset-0 grid content-center gap-y-2 pointer-events-none" style={{ gridTemplateColumns: `repeat(${totalSlots}, minmax(0, 1fr))` }}>
      {isSelectedRow && !isClone && (
        <div style={{ gridColumnStart: startCol + 1, gridColumnEnd: endCol + 2, gridRowStart: 1, zIndex: 20 }}
          className="relative bg-primary/15 border-2 border-dashed border-primary rounded-lg h-[85px] backdrop-blur-[1px]">
          {/* Floated above so it stays readable even for a 15-min sliver. */}
          {selectionLabel && <GhostTimeLabel label={selectionLabel} />}
        </div>
      )}
      {dropIndicatorForRow && !isClone && (
        <div style={{ gridColumnStart: dropIndicatorForRow.startCol + 1, gridColumnEnd: dropIndicatorForRow.endCol + 1, gridRowStart: 1, zIndex: 30 }}
          className="relative bg-primary/20 border-2 border-dashed border-primary rounded-xl h-[85px] mx-1 backdrop-blur-[2px] shadow-sm">
          {dropLabel && <GhostTimeLabel label={dropLabel} />}
        </div>
      )}
      {resourceEvents.map((event) => {
        const { gridColumnStart, gridColumnEnd } = eventSpans[event.id] || { gridColumnStart: 1, gridColumnEnd: 1 };
        const lane = eventLanes[event.id] || 1;
        const isDraggingThis = interactionEventId === event.id && isDragActive;
        const isResizingThis = interactionEventId === event.id && resizeIndicatorForRow !== null;
        const resizeGhostStart = isResizingThis ? resizeIndicatorForRow!.startCol + 1 : gridColumnStart;
        const resizeGhostEnd = isResizingThis ? resizeIndicatorForRow!.endCol + 1 : gridColumnEnd;

        const cardStyle: React.CSSProperties = {
          gridColumnStart: isResizingThis ? resizeGhostStart : gridColumnStart,
          gridColumnEnd: isResizingThis ? resizeGhostEnd : gridColumnEnd,
          gridRowStart: lane,
          zIndex: isDraggingThis || isResizingThis ? 50 : 10
        };
        if (!isDraggingThis || isClone) cardStyle.transform = 'translate3d(0, 0, 0)';

        return (
          <React.Fragment key={event.id}>
            {isResizingThis && !isClone && (
              <div style={{ gridColumnStart: resizeGhostStart, gridColumnEnd: resizeGhostEnd, gridRowStart: lane, zIndex: 30 }}
                className="relative bg-primary/20 border-2 border-dashed border-primary rounded-xl h-[85px] mx-1 backdrop-blur-[2px] shadow-sm">
                {resizeLabel && <GhostTimeLabel label={resizeLabel} />}
              </div>
            )}
            <div
              ref={isDraggingThis && !isClone ? draggedElementRef : null}
              style={cardStyle}
              className={cn("pointer-events-auto px-1 relative", isDraggingThis && "opacity-80 !transition-none", isResizingThis && "!transition-none")}
            >
              {renderEvent ? (
                renderEvent(event, (e) => startCardDrag(e, event.id), (e, _, direction) => startCardResize(e, event.id, direction))
              ) : (
                <EventCard
                  event={event} resource={resource} isDragging={isDraggingThis}
                  onDragStart={startCardDrag} onResizeStart={startCardResize}
                  detailTrigger={detailTrigger}
                  cardRows={cardRows}
                />
              )}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------
// A single virtualized row. Memoized so that during a drag/resize/selection
// gesture only the row(s) actually involved re-render — not every visible row.
// ---------------------------------------------------------------------------
interface TimelineRowProps {
  resource: Resource;
  resourceEvents: EventItem[];
  rowHeight: number;
  virtualStart: number;
  virtualIndex: number;
  totalSlots: number;
  totalHours: number;
  hourWidth: number;
  bgEvenOdd: string;
  selectionForRow: Selection;
  selectionLabel?: string | null;
  dropLabel?: string | null;
  resizeLabel?: string | null;
  dropIndicatorForRow: DropIndicator;
  resizeIndicatorForRow: ResizeIndicator;
  interactionEventId: string | undefined;
  isDragActive: boolean;
  hasActiveCard: boolean;
  isDraggingRow: boolean;
  showDropLine: boolean;
  dropLineBelow: boolean;
  animateLayout: boolean;
  eventSpans: Record<string, { gridColumnStart: number; gridColumnEnd: number }>;
  eventLanes: Record<string, number>;
  draggedElementRef: React.RefObject<HTMLDivElement | null>;
  draggedGridRowRef: React.RefObject<HTMLDivElement | null>;
  startCardDrag: (e: React.PointerEvent, eventId: string) => void;
  startCardResize: (e: React.PointerEvent, eventId: string, direction: 'left' | 'right') => void;
  handleRowPointerDown: (e: React.PointerEvent, resourceId: string) => void;
  renderEvent?: TimelineGridProps['renderEvent'];
  detailTrigger: 'hover' | 'click';
  cardRows: CardFieldKey[][];
}

const TimelineRow: React.FC<TimelineRowProps> = memo(({
  resource, resourceEvents, rowHeight, virtualStart, virtualIndex, totalSlots, totalHours, bgEvenOdd,
  selectionForRow, selectionLabel, dropLabel, resizeLabel, dropIndicatorForRow, resizeIndicatorForRow, interactionEventId, isDragActive,
  hasActiveCard, isDraggingRow, showDropLine, dropLineBelow, animateLayout,
  eventSpans, eventLanes, draggedElementRef, draggedGridRowRef,
  startCardDrag, startCardResize, handleRowPointerDown, renderEvent, detailTrigger, cardRows,
}) => {
  // Vertical hour separators, drawn as a tiled background so they sit above the
  // row stripe but below the event cards. Sized as a PERCENTAGE of the row
  // width (one tile per hour) so the lines stay aligned with the percentage-
  // positioned header columns — even when the timeline is stretched to fill a
  // viewport wider than its natural pixel width.
  const gridLineStyle: React.CSSProperties = totalHours > 0
    ? {
        backgroundImage: 'linear-gradient(to right, var(--grid-line) 0, var(--grid-line) 1px, transparent 1px)',
        backgroundSize: `calc(100% / ${totalHours}) 100%`,
        backgroundRepeat: 'repeat',
      }
    : {};

  return (
    <div
      data-index={virtualIndex}
      className="absolute w-full"
      style={{
        top: 0, left: 0,
        height: `${rowHeight}px`,
        transform: `translateY(${virtualStart}px)`,
        transition: animateLayout && !isDraggingRow ? "height 250ms ease, transform 250ms ease" : undefined,
        zIndex: isDraggingRow ? 50 : (hasActiveCard ? 40 : 1)
      }}
    >
      <div
        onPointerDown={(e) => handleRowPointerDown(e, resource.id)}
        className={cn(
          "border-b border-border absolute w-full h-full flex items-start transition-colors cursor-cell",
          isDraggingRow ? "opacity-30 bg-muted grayscale" : ""
        )}
        style={{ backgroundColor: isDraggingRow ? undefined : bgEvenOdd, ...gridLineStyle }}
      >
        <RowContent
          resource={resource} resourceEvents={resourceEvents} totalSlots={totalSlots} isClone={false}
          selectionForRow={selectionForRow} selectionLabel={selectionLabel}
          dropLabel={dropLabel} resizeLabel={resizeLabel} dropIndicatorForRow={dropIndicatorForRow}
          resizeIndicatorForRow={resizeIndicatorForRow} interactionEventId={interactionEventId}
          isDragActive={isDragActive} eventSpans={eventSpans} eventLanes={eventLanes}
          draggedElementRef={draggedElementRef} startCardDrag={startCardDrag}
          startCardResize={startCardResize} renderEvent={renderEvent} detailTrigger={detailTrigger} cardRows={cardRows}
        />
      </div>

      {isDraggingRow && (
        <div
          ref={draggedGridRowRef}
          className="border-b border-border absolute w-full h-full flex items-start opacity-100 border-primary/40 bg-primary/5 !transition-none pointer-events-none"
          style={{ backgroundColor: bgEvenOdd, ...gridLineStyle, zIndex: 50 }}
        >
          <RowContent
            resource={resource} resourceEvents={resourceEvents} totalSlots={totalSlots} isClone={true}
            selectionForRow={null} dropIndicatorForRow={null}
            resizeIndicatorForRow={null} interactionEventId={interactionEventId}
            isDragActive={isDragActive} eventSpans={eventSpans} eventLanes={eventLanes}
            draggedElementRef={draggedElementRef} startCardDrag={startCardDrag}
            startCardResize={startCardResize} renderEvent={renderEvent} detailTrigger={detailTrigger} cardRows={cardRows}
          />
        </div>
      )}

      {showDropLine && !isDraggingRow && (
        <div
          className="absolute left-0 right-0 h-0.5 bg-primary z-40 pointer-events-none"
          style={{ top: dropLineBelow ? '100%' : '0px' }}
        />
      )}
    </div>
  );
});

export const TimelineGrid: React.FC<TimelineGridProps> = memo(({
  gridRef, draggedElementRef, draggedGridRowRef, dropIndicator, resizeIndicator, rowDrag, rowDropIndicator, isPanning,
  onMouseDown, onMouseMove, onMouseUpOrLeave,
  totalWidth, hours, totalHours, formatHourLabel, resources,
  selection, selectionLabel, dropLabel, resizeLabel, totalSlots,
  startCardDrag, startCardResize, handleRowPointerDown,
  renderEvent, interactionEventId,
  virtualRows, totalSize, rowHeights, eventLanes, eventSpans, eventsByResource, animateLayout, detailTrigger, cardRows,
}) => {
  const isDragActive = dropIndicator !== null;
  // Width of one hour column in px — used to position the vertical hour lines.
  // Stable across pointer ticks (only changes on zoom), so it won't break the
  // per-row memoization.
  const hourWidth = totalHours > 0 ? totalWidth / totalHours : 0;

  return (
    <div
      ref={gridRef}
      onMouseDown={onMouseDown} onMouseMove={onMouseMove}
      onMouseUp={onMouseUpOrLeave} onMouseLeave={onMouseUpOrLeave}
      className={cn("flex-1 select-none", isPanning ? "cursor-grabbing" : "cursor-grab")}
      style={{ scrollBehavior: isPanning ? 'auto' : 'smooth' }}
    >
      <div className="flex flex-col relative" style={{ width: `${totalWidth}px`, minWidth: '100%' }}>
        <div className="h-14 border-b border-border flex items-center relative bg-card sticky top-0 z-30">
          {hours.map((hour, idx) => (
            <div key={hour} className="absolute text-[14px] font-medium text-text-secondary border-l border-border/50 h-full flex items-center pl-3" style={{ left: `${(idx / totalHours) * 100}%`, width: `${(1 / totalHours) * 100}%` }}>
              {formatHourLabel(hour)}
            </div>
          ))}
        </div>

        <div className="flex flex-col relative">
          <div style={{ height: `${totalSize}px`, width: '100%', position: 'relative' }}>
            {virtualRows.map((virtualRow) => {
              const resource = resources[virtualRow.index];
              if (!resource) return null;

              const resourceEvents = eventsByResource[resource.id] || [];
              const isDraggingRow = rowDrag?.resourceId === resource.id;

              // Narrow transient interaction state down to this row only, so that
              // rows not involved in the gesture keep identical props and skip render.
              const selectionForRow = selection && selection.resourceId === resource.id ? selection : null;
              const dropIndicatorForRow = dropIndicator && dropIndicator.resourceId === resource.id ? dropIndicator : null;
              const hasActiveCard = interactionEventId ? resourceEvents.some(e => e.id === interactionEventId) : false;
              const resizeIndicatorForRow = resizeIndicator && hasActiveCard ? resizeIndicator : null;
              const showDropLine = rowDropIndicator === virtualRow.index && !!rowDrag;
              const dropLineBelow = !!rowDrag && rowDropIndicator !== null && rowDropIndicator > rowDrag.currentIndex;
              const bgEvenOdd = virtualRow.index % 2 === 0 ? 'var(--row-bg-even)' : 'var(--row-bg-odd)';

              return (
                <TimelineRow
                  key={virtualRow.key}
                  resource={resource}
                  resourceEvents={resourceEvents}
                  rowHeight={rowHeights[resource.id] || 140}
                  virtualStart={virtualRow.start}
                  virtualIndex={virtualRow.index}
                  totalSlots={totalSlots}
                  totalHours={totalHours}
                  hourWidth={hourWidth}
                  bgEvenOdd={bgEvenOdd}
                  selectionForRow={selectionForRow}
                  selectionLabel={selectionForRow ? selectionLabel : undefined}
                  dropLabel={dropIndicatorForRow ? dropLabel : undefined}
                  resizeLabel={resizeIndicatorForRow ? resizeLabel : undefined}
                  dropIndicatorForRow={dropIndicatorForRow}
                  resizeIndicatorForRow={resizeIndicatorForRow}
                  interactionEventId={hasActiveCard ? interactionEventId : undefined}
                  isDragActive={isDragActive}
                  hasActiveCard={hasActiveCard}
                  isDraggingRow={isDraggingRow}
                  showDropLine={showDropLine}
                  dropLineBelow={dropLineBelow}
                  animateLayout={animateLayout}
                  eventSpans={eventSpans}
                  eventLanes={eventLanes}
                  draggedElementRef={draggedElementRef}
                  draggedGridRowRef={draggedGridRowRef}
                  startCardDrag={startCardDrag}
                  startCardResize={startCardResize}
                  handleRowPointerDown={handleRowPointerDown}
                  renderEvent={renderEvent}
                  detailTrigger={detailTrigger}
                  cardRows={cardRows}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});
