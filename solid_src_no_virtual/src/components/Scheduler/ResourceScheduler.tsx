import { createSignal, createMemo, createEffect, onCleanup, mergeProps, type Component, type JSX } from 'solid-js';
import { TimelineControlsHeader } from './TimelineControlsHeader';
import { ResourceSidebar } from './ResourceSidebar';
import { TimelineGrid } from './TimelineGrid';
import { JobCreationDialog } from './JobCreationDialog';
import { LAYOUT_CONSTANTS } from './constants';
import type { Resource, EventItem, NewEventData } from './types';

// Helper functions (Pure JavaScript)
const areResourcesDifferent = (a: Resource[], b: Resource[]) => {
  if (a.length !== b.length) return true;
  for (let i = 0; i < a.length; i++) {
    if (a[i].id !== b[i].id || a[i].name !== b[i].name || a[i].avatar !== b[i].avatar) return true;
    if (JSON.stringify(a[i].metadata) !== JSON.stringify(b[i].metadata)) return true;
  }
  return false;
};

const areEventsDifferent = (a: EventItem[], b: EventItem[]) => {
  if (a.length !== b.length) return true;
  for (let i = 0; i < a.length; i++) {
    const ea = a[i], eb = b[i];
    if (
      ea.id !== eb.id || ea.resourceId !== eb.resourceId || ea.title !== eb.title ||
      ea.status !== eb.status || ea.startTime.getTime() !== eb.startTime.getTime() ||
      ea.endTime.getTime() !== eb.endTime.getTime()
    ) return true;
    if (JSON.stringify(ea.metadata) !== JSON.stringify(eb.metadata)) return true;
  }
  return false;
};

const getHourWidth = (zoom: number) => {
  switch (zoom) {
    case 15: return 240; case 30: return 180; case 45: return 140;
    case 60: return 100; case 90: return 80; case 120: return 60;
    default: return 100;
  }
};

const slotToDate = (slot: number, currentDate: Date, dayStartHour: number, slotsPerHour: number) => {
  const date = new Date(currentDate);
  const hoursDecimal = dayStartHour + slot / slotsPerHour;
  const hours = Math.floor(hoursDecimal);
  const minutes = Math.round((hoursDecimal - hours) * 60);
  date.setHours(hours, minutes, 0, 0);
  return date;
};

const getEventGridSpan = (start: Date, end: Date, dayStartHour: number, totalHours: number, slotsPerHour: number) => {
  const startHourObj = start.getHours() + start.getMinutes() / 60;
  const endHourObj = end.getHours() + end.getMinutes() / 60;
  const relativeStart = Math.max(0, startHourObj - dayStartHour);
  const relativeEnd = Math.min(totalHours, endHourObj - dayStartHour);
  return {
    gridColumnStart: Math.round(relativeStart * slotsPerHour) + 1,
    gridColumnEnd: Math.round(relativeEnd * slotsPerHour) + 1
  };
};

export interface ResourceSchedulerProps {
  resources: Resource[];
  events: EventItem[];
  dayStartHour?: number;
  dayEndHour?: number;
  canChangeRows?: boolean;
  renderResource?: (resource: Resource, onGripMouseDown?: (e: PointerEvent) => void) => JSX.Element;
  renderEvent?: (event: EventItem, onDragStart?: (e: PointerEvent, eventId: string) => void, onResizeStart?: (e: PointerEvent, eventId: string, direction: 'left' | 'right') => void) => JSX.Element;
  onEventChange?: (event: EventItem) => Promise<any> | void;
  onEventAdd?: (event: EventItem) => void;
  onResourcesReorder?: (resources: Resource[]) => void;
  fetchEventsForDate: (resourceCount: number, date: Date) => Promise<{ resources: Resource[]; events: EventItem[] }>;
  onSaveEvent?: (event: EventItem) => Promise<any>;
}

export const ResourceScheduler: Component<ResourceSchedulerProps> = (rawProps) => {
  const props = mergeProps({ dayStartHour: 6, dayEndHour: 20, canChangeRows: true }, rawProps);

  let gridRef: HTMLDivElement | undefined;
  let draggedElementRef: HTMLDivElement | undefined;
  let draggedSidebarRowRef: HTMLDivElement | undefined;
  let draggedGridRowRef: HTMLDivElement | undefined;

  let activeMode = 'NONE';
  let lastInteraction: { slot: number; resourceId?: string } | null = null;
  let pointerStartPos = { x: 0, y: 0 };
  let activeSlotWidth = 0;
  let metrics = { gridLeft: 0, containerTop: 0 };

  let lastResourcesProp = props.resources;
  let lastEventsProp = props.events;

  const [localResources, setLocalResources] = createSignal<Resource[]>(props.resources);
  const [localEvents, setLocalEvents] = createSignal<EventItem[]>(props.events);
  const [scrollElement, setScrollElement] = createSignal<HTMLDivElement | null>(null);

  const [currentDate, setCurrentDate] = createSignal<Date>(new Date(2026, 5, 18));
  const [zoomMinutes, setZoomMinutes] = createSignal<number>(60);
  const [isMapViewActive, setIsMapViewActive] = createSignal<boolean>(false);
  const [theme, setTheme] = createSignal<'light' | 'dark'>('light');

  const [isPanning, setIsPanning] = createSignal(false);
  const [startX, setStartX] = createSignal(0);
  const [scrollLeft, setScrollLeft] = createSignal(0);

  const [interaction, setInteraction] = createSignal<any>(null);
  const [dropIndicator, setDropIndicator] = createSignal<any>(null);
  const [resizeIndicator, setResizeIndicator] = createSignal<any>(null);

  const [rowDrag, setRowDrag] = createSignal<any>(null);
  const [rowDropIndicator, setRowDropIndicator] = createSignal<number | null>(null);
  const [selection, setSelection] = createSignal<any>(null);

  const [showJobCreationModal, setShowJobCreationModal] = createSignal(false);
  const [newEventData, setNewEventData] = createSignal<NewEventData | null>(null);

  createEffect(() => {
    if (activeMode === 'NONE') {
      if (areResourcesDifferent(props.resources, lastResourcesProp)) {
        setLocalResources(props.resources);
        lastResourcesProp = props.resources;
      }
      if (areEventsDifferent(props.events, lastEventsProp)) {
        setLocalEvents(props.events);
        lastEventsProp = props.events;
      }
    }
  });

  createEffect(() => {
    let active = true;
    const current = currentDate();

    const hasEventsForDate = localEvents().some(e => {
      const d = e.startTime;
      return d.getFullYear() === current.getFullYear() &&
        d.getMonth() === current.getMonth() &&
        d.getDate() === current.getDate();
    });

    if (!hasEventsForDate && localResources().length > 0) {
      props.fetchEventsForDate(localResources().length, current).then(({ events: newEvents }) => {
        if (active) {
          setLocalEvents(prev => [...prev, ...newEvents]);
        }
      });
    }

    onCleanup(() => { active = false; });
  });

  const slotsPerHour = 4;
  const totalHours = createMemo(() => props.dayEndHour - props.dayStartHour);
  const totalSlots = createMemo(() => totalHours() * slotsPerHour);
  const hourWidth = createMemo(() => getHourWidth(zoomMinutes()));
  const totalWidth = createMemo(() => totalHours() * hourWidth());
  const hours = createMemo(() => Array.from({ length: totalHours() }, (_, i) => props.dayStartHour + i));

  const dailyEvents = createMemo(() => {
    const current = currentDate();
    return localEvents().filter(e => {
      const d = e.startTime;
      return d.getFullYear() === current.getFullYear() &&
        d.getMonth() === current.getMonth() &&
        d.getDate() === current.getDate();
    });
  });

  const layoutEngine = createMemo(() => {
    const t0 = performance.now(); // START TIMER
    const rowHeights: Record<string, number> = {};
    const eventLanes: Record<string, number> = {};
    const eventSpans: Record<string, { gridColumnStart: number, gridColumnEnd: number }> = {};
    const eventsByResource: Record<string, EventItem[]> = {};

    const resources = localResources();
    const events = dailyEvents();

    resources.forEach(r => { eventsByResource[r.id] = []; rowHeights[r.id] = LAYOUT_CONSTANTS.ROW_MIN_HEIGHT; });
    events.forEach(e => { if (eventsByResource[e.resourceId]) eventsByResource[e.resourceId].push(e); });

    resources.forEach(resource => {
      const resourceEvents = eventsByResource[resource.id].sort((a, b) => {
        const diff = a.startTime.getTime() - b.startTime.getTime();
        return diff !== 0 ? diff : a.id.localeCompare(b.id);
      });

      if (resourceEvents.length === 0) return;
      const lanes: number[] = [];

      resourceEvents.forEach(event => {
        eventSpans[event.id] = getEventGridSpan(event.startTime, event.endTime, props.dayStartHour, totalHours(), slotsPerHour);

        let placed = false;
        for (let i = 0; i < lanes.length; i++) {
          if (lanes[i] <= event.startTime.getTime()) {
            lanes[i] = event.endTime.getTime();
            eventLanes[event.id] = i + 1;
            placed = true;
            break;
          }
        }
        if (!placed) { lanes.push(event.endTime.getTime()); eventLanes[event.id] = lanes.length; }
      });

      rowHeights[resource.id] = Math.max(LAYOUT_CONSTANTS.ROW_MIN_HEIGHT, lanes.length * LAYOUT_CONSTANTS.LANE_HEIGHT + LAYOUT_CONSTANTS.LANE_OFFSET);
    });

    const t1 = performance.now(); // END TIMER
    console.log(`⏱️ layoutEngine Calculation: ${(t1 - t0).toFixed(2)}ms for ${localEvents().length} events`);

    return { rowHeights, eventLanes, eventSpans, eventsByResource };
  });


  const formatHourLabel = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour} ${period}`;
  };

  const handleMapViewToggle = () => setIsMapViewActive(prev => !prev);
  const handleThemeToggle = () => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      next === 'dark' ? document.documentElement.classList.add('dark') : document.documentElement.classList.remove('dark');
      return next;
    });
  };

  const handleMouseDown = (e: MouseEvent) => {
    if (activeMode !== 'NONE' || !gridRef) return;
    activeMode = 'PANNING';
    setIsPanning(true);
    setStartX(e.pageX - gridRef.offsetLeft);
    setScrollLeft(gridRef.scrollLeft);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isPanning() || activeMode !== 'PANNING' || !gridRef) return;
    e.preventDefault();
    const walk = ((e.pageX - gridRef.offsetLeft) - startX()) * 1.5;
    gridRef.scrollLeft = scrollLeft() - walk;
  };

  const handleMouseUpOrLeave = () => {
    if (activeMode === 'PANNING') { setIsPanning(false); activeMode = 'NONE'; }
  };

  const captureMetrics = () => {
    const scrollContainerEl = scrollElement();
    if (gridRef && scrollContainerEl) {
      activeSlotWidth = gridRef.scrollWidth / totalSlots();
      metrics = {
        gridLeft: gridRef.getBoundingClientRect().left,
        containerTop: scrollContainerEl.getBoundingClientRect().top
      };
    }
  };

  const getRowIndexAtY = (y: number) => {
    let currentY = 0;
    const resources = localResources();
    const engine = layoutEngine();

    for (let i = 0; i < resources.length; i++) {
      const h = engine.rowHeights[resources[i].id] || LAYOUT_CONSTANTS.ROW_MIN_HEIGHT;
      if (y >= currentY && y < currentY + h) return i;
      currentY += h;
    }
    return resources.length - 1;
  };

  const startCardDrag = (e: PointerEvent, eventId: string) => {
    e.preventDefault(); e.stopPropagation();
    if (activeMode !== 'NONE' || !gridRef) return;
    activeMode = 'DRAGGING_CARD';

    captureMetrics();

    const event = localEvents().find(evt => evt.id === eventId);
    if (!event) { activeMode = 'NONE'; return; }

    const span = layoutEngine().eventSpans[eventId] || { gridColumnStart: 1, gridColumnEnd: 1 };
    lastInteraction = { slot: span.gridColumnStart - 1, resourceId: event.resourceId };

    setInteraction({
      eventId, type: 'move', startX: e.clientX, startY: e.clientY,
      startScrollLeft: scrollElement()?.scrollLeft || 0,
      startScrollTop: scrollElement()?.scrollTop || 0,
      startColStart: span.gridColumnStart - 1, startColEnd: span.gridColumnEnd - 1, startResourceId: event.resourceId
    });

    setDropIndicator({ resourceId: event.resourceId, startCol: span.gridColumnStart - 1, endCol: span.gridColumnEnd - 1 });
  };

  const startCardResize = (e: PointerEvent, eventId: string, direction: 'left' | 'right') => {
    e.preventDefault(); e.stopPropagation();
    if (activeMode !== 'NONE' || !gridRef) return;
    activeMode = 'RESIZING_CARD';

    captureMetrics();

    const event = localEvents().find(evt => evt.id === eventId);
    if (!event) { activeMode = 'NONE'; return; }

    const span = layoutEngine().eventSpans[eventId] || { gridColumnStart: 1, gridColumnEnd: 1 };
    lastInteraction = { slot: direction === 'left' ? span.gridColumnStart - 1 : span.gridColumnEnd - 1 };

    setInteraction({
      eventId, type: 'resize', startX: e.clientX, startY: e.clientY,
      startScrollLeft: scrollElement()?.scrollLeft || 0,
      startScrollTop: scrollElement()?.scrollTop || 0,
      startColStart: span.gridColumnStart - 1, startColEnd: span.gridColumnEnd - 1,
      startResourceId: event.resourceId, resizeDirection: direction
    });

    setResizeIndicator({ eventId, startCol: span.gridColumnStart - 1, endCol: span.gridColumnEnd - 1 });
  };

  const handleRowPointerDown = (e: PointerEvent, resourceId: string) => {
    if (e.target !== e.currentTarget || !gridRef || activeMode !== 'NONE') return;
    e.preventDefault(); e.stopPropagation();

    activeMode = 'SELECTING_SLOT';
    pointerStartPos = { x: e.clientX, y: e.clientY };
    captureMetrics();

    const slotIdx = Math.max(0, Math.floor((e.clientX - metrics.gridLeft + gridRef.scrollLeft) / activeSlotWidth));

    setSelection({ resourceId, startSlot: slotIdx, currentSlot: slotIdx });
    lastInteraction = { slot: slotIdx };
  };

  const startRowDrag = (e: PointerEvent, resourceId: string) => {
    e.preventDefault(); e.stopPropagation();
    if (activeMode !== 'NONE') return;
    activeMode = 'DRAGGING_ROW';
    captureMetrics();
    const idx = localResources().findIndex(r => r.id === resourceId);
    if (idx !== -1) {
      setRowDrag({ resourceId, startY: e.clientY, currentIndex: idx, startScrollTop: scrollElement()?.scrollTop || 0 });
      setRowDropIndicator(idx);
    }
  };

  const handlePointerMove = (e: PointerEvent) => {
    const scrollContainerEl = scrollElement();
    if (!gridRef || !scrollContainerEl) return;

    if (activeMode !== 'RESIZING_CARD' && activeMode !== 'DRAGGING_CARD' && activeMode !== 'DRAGGING_ROW' && activeMode !== 'SELECTING_SLOT') {
      return;
    }

    const t0 = performance.now(); // START TIMER

    const interact = interaction();
    const currentDrag = rowDrag();
    const selectState = selection();

    if (activeMode === 'RESIZING_CARD' && interact) {
      const currentSlot = Math.max(0, Math.floor((e.clientX - metrics.gridLeft + gridRef.scrollLeft) / activeSlotWidth));
      if (lastInteraction?.slot !== currentSlot) {
        lastInteraction = { slot: currentSlot };

        if (interact.resizeDirection === 'left') {
          setResizeIndicator({
            eventId: interact.eventId,
            startCol: Math.max(0, Math.min(interact.startColEnd - 1, currentSlot)),
            endCol: interact.startColEnd
          });
        } else {
          setResizeIndicator({
            eventId: interact.eventId,
            startCol: interact.startColStart,
            endCol: Math.max(interact.startColStart + 1, Math.min(totalSlots(), currentSlot))
          });
        }
      }
    } else if (activeMode === 'DRAGGING_CARD' && interact) {
      const scrollDeltaX = scrollContainerEl.scrollLeft - interact.startScrollLeft;
      const scrollDeltaY = scrollContainerEl.scrollTop - interact.startScrollTop;

      if (draggedElementRef) {
        const x = (e.clientX - interact.startX) + scrollDeltaX;
        const y = (e.clientY - interact.startY) + scrollDeltaY;
        draggedElementRef.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }

      let targetResource: Resource;

      if (props.canChangeRows) {
        const gridY = (e.clientY - metrics.containerTop + scrollContainerEl.scrollTop) - LAYOUT_CONSTANTS.HEADER_OFFSET;
        let targetRowIdx = getRowIndexAtY(gridY);
        targetRowIdx = Math.max(0, Math.min(localResources().length - 1, targetRowIdx));
        targetResource = localResources()[targetRowIdx];
      } else {
        targetResource = localResources().find(r => r.id === interact.startResourceId) || localResources()[0];
      }

      const logicalDeltaX = (e.clientX - interact.startX) + scrollDeltaX;
      const deltaSlots = Math.round(logicalDeltaX / activeSlotWidth);
      const durationSlots = interact.startColEnd - interact.startColStart;
      const newStartSlot = Math.max(0, Math.min(totalSlots() - durationSlots, interact.startColStart + deltaSlots));

      if (lastInteraction?.slot !== newStartSlot || lastInteraction?.resourceId !== targetResource.id) {
        lastInteraction = { slot: newStartSlot, resourceId: targetResource.id };
        setDropIndicator({ resourceId: targetResource.id, startCol: newStartSlot, endCol: newStartSlot + durationSlots });
      }

    } else if (activeMode === 'DRAGGING_ROW' && currentDrag) {
      const scrollDeltaY = scrollContainerEl.scrollTop - currentDrag.startScrollTop;
      const translateY = (e.clientY - currentDrag.startY) + scrollDeltaY;

      if (draggedSidebarRowRef) draggedSidebarRowRef.style.transform = `translate3d(0, ${translateY}px, 0)`;
      if (draggedGridRowRef) draggedGridRowRef.style.transform = `translate3d(0, ${translateY}px, 0)`;

      const gridY = (e.clientY - metrics.containerTop + scrollContainerEl.scrollTop) - LAYOUT_CONSTANTS.HEADER_OFFSET;
      let newIndex = getRowIndexAtY(gridY);
      newIndex = Math.max(0, Math.min(localResources().length - 1, newIndex));

      if (lastInteraction?.slot !== newIndex) {
        lastInteraction = { slot: newIndex };
        setRowDropIndicator(newIndex);
      }
    } else if (activeMode === 'SELECTING_SLOT' && selectState) {
      const slotIdx = Math.max(0, Math.min(totalSlots(), Math.floor((e.clientX - metrics.gridLeft + gridRef.scrollLeft) / activeSlotWidth)));
      if (lastInteraction?.slot !== slotIdx) {
        lastInteraction = { slot: slotIdx };
        setSelection({ ...selectState, currentSlot: slotIdx });
      }
    }

    const t1 = performance.now(); // END TIMER
    const duration = t1 - t0;

    // Log if the pointer move calculation takes longer than 8ms (threatening 60FPS)
    if (duration > 8) {
      console.warn(`⚠️ Slow PointerMove (${activeMode}): ${duration.toFixed(2)}ms`);
    }
  };

  const handlePointerUp = (e: PointerEvent) => {
    const interact = interaction();
    const currentDropIndicator = dropIndicator();
    const currentResizeIndicator = resizeIndicator();
    const currentDrag = rowDrag();
    const selectState = selection();

    if (activeMode === 'DRAGGING_CARD') {
      if (interact && currentDropIndicator) {
        const finalEvent = localEvents().find(evt => evt.id === interact.eventId);
        if (finalEvent) {
          const newResourceId = currentDropIndicator.resourceId;
          const newStartTime = slotToDate(currentDropIndicator.startCol, currentDate(), props.dayStartHour, slotsPerHour);
          const newEndTime = slotToDate(currentDropIndicator.endCol, currentDate(), props.dayStartHour, slotsPerHour);

          const hasChanged = finalEvent.resourceId !== newResourceId ||
            finalEvent.startTime.getTime() !== newStartTime.getTime() ||
            finalEvent.endTime.getTime() !== newEndTime.getTime();

          if (hasChanged) {
            const updatedEvent = { ...finalEvent, resourceId: newResourceId, startTime: newStartTime, endTime: newEndTime };
            setLocalEvents(prev => prev.map(evt => evt.id === interact.eventId ? updatedEvent : evt));
            if (props.onEventChange) props.onEventChange(updatedEvent);
            if (props.onSaveEvent) props.onSaveEvent(updatedEvent);
          }
        }
      }
      if (draggedElementRef) draggedElementRef.style.transform = '';
      setInteraction(null);
      setDropIndicator(null);
    } else if (activeMode === 'RESIZING_CARD') {
      if (interact && currentResizeIndicator) {
        const finalEvent = localEvents().find(evt => evt.id === interact.eventId);
        if (finalEvent) {
          const newStartTime = slotToDate(currentResizeIndicator.startCol, currentDate(), props.dayStartHour, slotsPerHour);
          const newEndTime = slotToDate(currentResizeIndicator.endCol, currentDate(), props.dayStartHour, slotsPerHour);

          const hasChanged = finalEvent.startTime.getTime() !== newStartTime.getTime() ||
            finalEvent.endTime.getTime() !== newEndTime.getTime();

          if (hasChanged) {
            const updatedEvent = { ...finalEvent, startTime: newStartTime, endTime: newEndTime };
            setLocalEvents(prev => prev.map(evt => evt.id === interact.eventId ? updatedEvent : evt));
            if (props.onEventChange) props.onEventChange(updatedEvent);
            if (props.onSaveEvent) props.onSaveEvent(updatedEvent);
          }
        }
      }
      setInteraction(null);
      setResizeIndicator(null);
    } else if (activeMode === 'DRAGGING_ROW') {
      const dropIdx = rowDropIndicator();
      if (currentDrag && dropIdx !== null && dropIdx !== currentDrag.currentIndex) {
        const reordered = [...localResources()];
        const [draggedItem] = reordered.splice(currentDrag.currentIndex, 1);
        const insertIndex = dropIdx > currentDrag.currentIndex ? dropIdx - 1 : dropIdx;
        reordered.splice(insertIndex, 0, draggedItem);

        setLocalResources(reordered);
        if (props.onResourcesReorder) props.onResourcesReorder(reordered);
      }

      if (draggedSidebarRowRef) draggedSidebarRowRef.style.transform = '';
      if (draggedGridRowRef) draggedGridRowRef.style.transform = '';

      setRowDrag(null);
      setRowDropIndicator(null);
    } else if (activeMode === 'SELECTING_SLOT' && selectState) {
      const dx = Math.abs(e.clientX - pointerStartPos.x);
      const dy = Math.abs(e.clientY - pointerStartPos.y);

      if (dx > 5 || dy > 5) {
        const start = Math.min(selectState.startSlot, selectState.currentSlot);
        const end = Math.max(selectState.startSlot, selectState.currentSlot);
        const finalEnd = start === end ? start + 1 : end;

        setNewEventData({
          resourceId: selectState.resourceId,
          startTime: slotToDate(start, currentDate(), props.dayStartHour, slotsPerHour),
          endTime: slotToDate(finalEnd, currentDate(), props.dayStartHour, slotsPerHour),
          title: 'New Job', location: '', price: 150, status: 'New'
        });
        setShowJobCreationModal(true);
      }
      setSelection(null);
    }

    activeMode = 'NONE';
    lastInteraction = null;
  };

  const handleCreateJobHeader = () => {
    setNewEventData({
      resourceId: localResources()[0]?.id || '',
      startTime: slotToDate(0, currentDate(), props.dayStartHour, slotsPerHour),
      endTime: slotToDate(4, currentDate(), props.dayStartHour, slotsPerHour),
      title: '', location: '', price: 150, status: 'New'
    });
    setShowJobCreationModal(true);
  };

  const handleReset = () => {
    setCurrentDate(new Date(2026, 5, 18));
    setZoomMinutes(60);
    setLocalResources(props.resources);
    setLocalEvents(props.events);
  };

  const handleSaveJob = () => {
    const data = newEventData();
    if (data) {
      const newlyCreatedEvent: EventItem = {
        id: `job-created-${Date.now()}`,
        resourceId: data.resourceId,
        title: data.title || 'New Job',
        startTime: data.startTime,
        endTime: data.endTime,
        status: data.status,
        metadata: { location: data.location, price: data.price }
      };
      setLocalEvents(prev => [...prev, newlyCreatedEvent]);
      if (props.onEventAdd) props.onEventAdd(newlyCreatedEvent);
    }
    setShowJobCreationModal(false);
    setNewEventData(null);
  };

  return (
    <div class="flex flex-col w-full h-full flex-1 bg-background overflow-hidden relative transition-colors duration-200">
      <TimelineControlsHeader
        currentDate={currentDate()} onDateChange={setCurrentDate}
        zoomMinutes={zoomMinutes()} onZoomChange={setZoomMinutes}
        onReset={handleReset} onCreateJob={handleCreateJobHeader}
        isMapViewActive={isMapViewActive()} onMapViewToggle={handleMapViewToggle}
        theme={theme()} onThemeToggle={handleThemeToggle}
      />

      <div
        ref={setScrollElement}
        class="flex-1 min-h-0 flex relative overflow-y-auto overflow-x-hidden select-none"
        onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}
      >
        <ResourceSidebar
          resources={localResources()}
          rowDrag={rowDrag()}
          rowDropIndicator={rowDropIndicator()}
          draggedSidebarRowRef={(el) => draggedSidebarRowRef = el}
          startRowDrag={startRowDrag}
          renderResource={props.renderResource}
          layoutEngine={layoutEngine}
        />

        <TimelineGrid
          gridRef={(el) => gridRef = el}
          isPanning={isPanning()}
          draggedElementRef={(el) => draggedElementRef = el}
          draggedGridRowRef={(el) => draggedGridRowRef = el}
          dropIndicator={dropIndicator()}
          resizeIndicator={resizeIndicator()}
          rowDrag={rowDrag()}
          rowDropIndicator={rowDropIndicator()}
          onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUpOrLeave={handleMouseUpOrLeave}
          totalWidth={totalWidth()}
          hours={hours()}
          totalHours={totalHours()}
          formatHourLabel={formatHourLabel}
          resources={localResources()}
          selection={selection()}
          totalSlots={totalSlots()}
          startCardDrag={startCardDrag}
          startCardResize={startCardResize}
          handleRowPointerDown={handleRowPointerDown}
          renderEvent={props.renderEvent}
          interactionEventId={interaction()?.eventId}
          layoutEngine={layoutEngine}
        />

      </div>
      <JobCreationDialog
        isOpen={showJobCreationModal()} onClose={() => { setShowJobCreationModal(false); setNewEventData(null); }}
        newEventData={newEventData()} onChange={setNewEventData} onSave={handleSaveJob} resources={localResources()}
      />
    </div>
  );
};
