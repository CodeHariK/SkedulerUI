import { For, Show, createEffect, type Component, type JSX } from 'solid-js';
import type { Resource, EventItem } from './types';
import { EventCard } from './EventCard';
import { cn } from '../../lib/utils';

interface TimelineGridProps {
  gridRef: (el: HTMLDivElement) => void;
  draggedElementRef: (el: HTMLDivElement) => void;
  draggedGridRowRef: (el: HTMLDivElement) => void;
  dropIndicator: { resourceId: string; startCol: number; endCol: number } | null;
  resizeIndicator: { eventId: string; startCol: number; endCol: number } | null;
  rowDrag: { resourceId: string; currentIndex: number } | null;
  rowDropIndicator: number | null;
  isPanning: boolean;
  onMouseDown: (e: MouseEvent) => void;
  onMouseMove: (e: MouseEvent) => void;
  onMouseUpOrLeave: () => void;
  totalWidth: number;
  hours: number[];
  totalHours: number;
  formatHourLabel: (hour: number) => string;
  resources: Resource[];
  selection: { resourceId: string; startSlot: number; currentSlot: number; } | null;
  totalSlots: number;
  startCardDrag: (e: PointerEvent, eventId: string) => void;
  startCardResize: (e: PointerEvent, eventId: string, direction: 'left' | 'right') => void;
  handleRowPointerDown: (e: PointerEvent, resourceId: string) => void;
  renderEvent?: (event: EventItem, onDragStart?: (e: PointerEvent, eventId: string) => void, onResizeStart?: (e: PointerEvent, eventId: string, direction: 'left' | 'right') => void) => JSX.Element;
  interactionEventId: string | undefined;
  layoutEngine: () => any;
}

export const TimelineGrid: Component<TimelineGridProps> = (props) => {

  const GridRow = (rowProps: { resource: Resource, index: () => number }) => {
    const res = () => rowProps.resource;

    // Reactively binds height to the layout engine
    const height = () => props.layoutEngine().rowHeights[res().id] || 140;

    const resourceEvents = () => props.layoutEngine().eventsByResource[res().id] || [];
    const isDraggingRow = () => props.rowDrag?.resourceId === res().id;
    const isSelectedRow = () => !!(props.selection && props.selection.resourceId === res().id);
    const isDropTargetRow = () => !!(props.dropIndicator && props.dropIndicator.resourceId === res().id);
    const hasActiveCard = () => props.interactionEventId ? resourceEvents().some((e: any) => e.id === props.interactionEventId) : false;

    const startCol = () => isSelectedRow() ? Math.min(props.selection!.startSlot, props.selection!.currentSlot) : 0;
    const endCol = () => isSelectedRow() ? Math.max(props.selection!.startSlot, props.selection!.currentSlot) : 0;
    const bgEvenOdd = () => rowProps.index() % 2 === 0 ? 'var(--row-bg-even)' : 'var(--row-bg-odd)';

    const renderRowContent = (isClone: boolean = false) => (
      <div class="absolute inset-0 grid content-center gap-y-2 px-2 pointer-events-none" style={{ "grid-template-columns": `repeat(${props.totalSlots}, minmax(0, 1fr))` }}>

        <Show when={isSelectedRow() && !isClone}>
          <div
            style={{ "grid-column-start": (startCol() + 1).toString(), "grid-column-end": ((startCol() === endCol() ? startCol() + 4 : endCol()) + 1).toString(), "grid-row-start": "1", "z-index": "20" }}
            class="bg-primary/15 border-2 border-dashed border-primary rounded-lg h-[85px] mx-1 backdrop-blur-[1px]"
          />
        </Show>

        <Show when={isDropTargetRow() && props.dropIndicator && !isClone}>
          <div
            style={{ "grid-column-start": (props.dropIndicator!.startCol + 1).toString(), "grid-column-end": (props.dropIndicator!.endCol + 1).toString(), "grid-row-start": "1", "z-index": "30" }}
            class="bg-primary/20 border-2 border-dashed border-primary rounded-xl h-[85px] mx-1 backdrop-blur-[2px] shadow-sm"
          />
        </Show>

        <For each={resourceEvents()}>
          {(event) => {
            const span = () => props.layoutEngine().eventSpans[event.id] || { gridColumnStart: 1, gridColumnEnd: 1 };
            const lane = () => props.layoutEngine().eventLanes[event.id] || 1;
            const isDraggingThis = () => props.interactionEventId === event.id && props.dropIndicator !== null;
            const isResizingThis = () => props.interactionEventId === event.id && props.resizeIndicator !== null;

            const resizeGhostStart = () => isResizingThis() ? props.resizeIndicator!.startCol + 1 : span().gridColumnStart;
            const resizeGhostEnd = () => isResizingThis() ? props.resizeIndicator!.endCol + 1 : span().gridColumnEnd;

            const assignCardRef = (el: HTMLDivElement) => {
              createEffect(() => {
                if (isDraggingThis() && !isClone && props.draggedElementRef) props.draggedElementRef(el);
              });
            };

            return (
              <>
                <Show when={isResizingThis() && !isClone}>
                  <div
                    style={{ "grid-column-start": resizeGhostStart().toString(), "grid-column-end": resizeGhostEnd().toString(), "grid-row-start": lane().toString(), "z-index": "30" }}
                    class="bg-primary/20 border-2 border-dashed border-primary rounded-xl h-[85px] mx-1 backdrop-blur-[2px] shadow-sm"
                  />
                </Show>

                <div
                  ref={assignCardRef}
                  style={{
                    "grid-column-start": (isResizingThis() ? resizeGhostStart() : span().gridColumnStart).toString(),
                    "grid-column-end": (isResizingThis() ? resizeGhostEnd() : span().gridColumnEnd).toString(),
                    "grid-row-start": lane().toString(),
                    "z-index": (isDraggingThis() || isResizingThis() ? 50 : 10).toString(),
                    transform: (!isDraggingThis() || isClone) ? 'translate3d(0, 0, 0)' : undefined
                  }}
                  class={cn("pointer-events-auto px-1 relative", isDraggingThis() && "opacity-80 !transition-none", isResizingThis() && "!transition-none")}
                >
                  <Show
                    when={props.renderEvent}
                    fallback={
                      <EventCard
                        event={event}
                        resource={res()}
                        isDragging={isDraggingThis()}
                        onDragStart={props.startCardDrag}
                        onResizeStart={props.startCardResize}
                      />
                    }
                  >
                    {props.renderEvent!(event, (e) => props.startCardDrag(e, event.id), (e, _, direction) => props.startCardResize(e, event.id, direction))}
                  </Show>
                </div>
              </>
            );
          }}
        </For>
      </div>
    );

    return (
      <div
        class="relative w-full transition-[height] duration-200"
        style={{
          height: `${height()}px`,
          "z-index": (isDraggingRow() ? 50 : (hasActiveCard() ? 40 : 1)).toString()
        }}
      >
        <div
          onPointerDown={(e) => props.handleRowPointerDown(e, res().id)}
          class={cn(
            "absolute inset-0 border-b border-border flex items-start transition-colors cursor-cell",
            isDraggingRow() ? "opacity-30 bg-muted grayscale" : ""
          )}
          style={{ "background-color": isDraggingRow() ? undefined : bgEvenOdd() }}
        >
          {renderRowContent(false)}
        </div>

        <Show when={isDraggingRow()}>
          <div
            ref={props.draggedGridRowRef}
            class="absolute inset-0 border-b border-border flex items-start opacity-100 border-primary/40 bg-primary/5 shadow-2xl !transition-none pointer-events-none"
            style={{ "background-color": bgEvenOdd(), "z-index": "50" }}
          >
            {renderRowContent(true)}
          </div>
        </Show>

        <Show when={props.rowDropIndicator === rowProps.index() && !isDraggingRow() && props.rowDrag}>
          <div
            class="absolute left-0 right-0 h-0.5 bg-primary z-40 pointer-events-none"
            style={{ top: props.rowDropIndicator! > props.rowDrag!.currentIndex ? '100%' : '0px' }}
          />
        </Show>
      </div>
    );
  };

  return (
    <div
      ref={props.gridRef}
      onMouseDown={props.onMouseDown}
      onMouseMove={props.onMouseMove}
      onMouseUp={props.onMouseUpOrLeave}
      onMouseLeave={props.onMouseUpOrLeave}
      class={cn("flex-1 overflow-x-auto select-none", props.isPanning ? "cursor-grabbing" : "cursor-grab")}
      style={{ "scroll-behavior": props.isPanning ? 'auto' : 'smooth' }}
    >
      <div class="flex flex-col relative" style={{ width: `${props.totalWidth}px`, "min-width": '100%' }}>
        <div class="h-14 border-b border-border flex items-center relative bg-card sticky top-0 z-30">
          <For each={props.hours}>
            {(hour, idx) => (
              <div
                class="absolute text-[14px] font-medium text-text-secondary border-l border-border/50 h-full flex items-center pl-3"
                style={{ left: `${(idx() / props.totalHours) * 100}%`, width: `${(1 / props.totalHours) * 100}%` }}
              >
                {props.formatHourLabel(hour)}
              </div>
            )}
          </For>
        </div>

        <div class="flex flex-col relative">
          <div class="absolute inset-0 pointer-events-none flex z-[0]">
            <For each={props.hours}>
              {(_, idx) => (
                <div class="absolute h-full border-l border-border/40" style={{ left: `${(idx() / props.totalHours) * 100}%` }} />
              )}
            </For>
          </div>

          <div class="flex flex-col relative w-full">
            <For each={props.resources}>
              {(resource, index) => <GridRow resource={resource} index={index} />}
            </For>
          </div>
        </div>
      </div>
    </div>
  );
};
