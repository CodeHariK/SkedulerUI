import React, { useRef, useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import type { Resource, EventItem, NewEventData, CardFieldKey } from './types';
import { TimelineControlsHeader } from './TimelineControlsHeader';
import { ResourceSidebar } from './ResourceSidebar';
import { TimelineGrid } from './TimelineGrid';
// Lazy-loaded: the job-creation modal (and its dialog/select/calendar deps) is
// only needed once the user opens it, so keep it out of the initial bundle.
const JobCreationDialog = lazy(() =>
  import('./JobCreationDialog').then((m) => ({ default: m.JobCreationDialog }))
);
const TechnicianCreationDialog = lazy(() =>
  import('./TechnicianCreationDialog').then((m) => ({ default: m.TechnicianCreationDialog }))
);
import { useVirtualizer } from '@tanstack/react-virtual';
import { LAYOUT_CONSTANTS, DEFAULT_CARD_ROWS } from './constants';
import { getHourWidth } from './_lib/zoom';
import { slotToDate, formatSlotRange } from './_lib/format';
import { computeLayout } from './_lib/computeLayout';
import type { ActiveMode, InteractionContext } from './_lib/interactionTypes';
import { useSlotSelection } from './_lib/useSlotSelection';
import { useRowReorder } from './_lib/useRowReorder';
import { useCardDrag } from './_lib/useCardDrag';
import { useCardResize } from './_lib/useCardResize';
import { DetailOpenContext } from './_lib/detailOpen';
// Shallow metadata comparison — avoids the cost of JSON.stringify on every
// item during prop-sync checks (which run on each pointer-up and prop change).
const isShallowMetaDifferent = (a?: Record<string, unknown>, b?: Record<string, unknown>) => {
  if (a === b) return false;
  if (!a || !b) return true;
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return true;
  for (let i = 0; i < ak.length; i++) {
    const k = ak[i];
    if (a[k] !== b[k]) return true;
  }
  return false;
};

const areResourcesDifferent = (a: Resource[], b: Resource[]) => {
  if (a.length !== b.length) return true;
  for (let i = 0; i < a.length; i++) {
    if (a[i].id !== b[i].id || a[i].name !== b[i].name || a[i].avatar !== b[i].avatar) return true;
    if (isShallowMetaDifferent(a[i].metadata, b[i].metadata)) return true;
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
    if (isShallowMetaDifferent(ea.metadata, eb.metadata)) return true;
  }
  return false;
};

export interface ResourceSchedulerProps {
  resources: Resource[];
  events: EventItem[];
  dayStartHour?: number;
  dayEndHour?: number;
  /** Snap/grid interval in minutes; drives how many slots make up an hour. */
  snapMinutes?: number;
  /** Whether an event's detail card opens on hover or on click. */
  detailTrigger?: 'hover' | 'click';
  /** Which fields are visible on the timeline event card, arranged by row. */
  cardRows?: CardFieldKey[][];
  canChangeRows?: boolean;
  renderResource?: (resource: Resource, onGripMouseDown?: (e: React.PointerEvent) => void) => React.ReactNode;
  renderEvent?: (event: EventItem, onDragStart?: (e: React.PointerEvent, eventId: string) => void, onResizeStart?: (e: React.PointerEvent, eventId: string, direction: 'left' | 'right') => void) => React.ReactNode;
  onEventChange?: (event: EventItem) => Promise<any> | void;
  onEventAdd?: (event: EventItem) => void;
  onResourcesReorder?: (resources: Resource[]) => void;
  fetchEventsForDate: (resources: Resource[], date: Date) => Promise<{ resources: Resource[]; events: EventItem[] }>;
  onSaveEvent?: (event: EventItem) => Promise<any>;
  /** Opens the template dialog (button lives in the controls header). */
  onOpenTemplates?: () => void;
  /** Called when a technician is added via the header's Add Technician button. */
  onResourceAdd?: (resource: Resource) => void;
}

export const ResourceScheduler: React.FC<ResourceSchedulerProps> = ({
  resources, events, dayStartHour = 6, dayEndHour = 20, snapMinutes = 15, detailTrigger = 'hover', canChangeRows = true,
  renderResource, renderEvent, onEventChange, onEventAdd, onResourcesReorder, fetchEventsForDate, onSaveEvent, onOpenTemplates, onResourceAdd, cardRows = DEFAULT_CARD_ROWS
}) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null);

  // Interaction element refs (draggedElementRef / draggedSidebar+GridRowRef) and
  // the per-mode state now live in the controller hooks (_lib/use*).

  const activeModeRef = useRef<ActiveMode>('NONE');
  const lastInteractionRef = useRef<{ slot: number; resourceId?: string } | null>(null);
  const pointerStartPosRef = useRef({ x: 0, y: 0 });
  const activeSlotWidthRef = useRef<number>(0);
  const metricsRef = useRef({ gridLeft: 0, containerTop: 0 });

  const [localResources, setLocalResources] = useState<Resource[]>(resources);
  const [localEvents, setLocalEvents] = useState<EventItem[]>(events);
  const lastResourcesPropRef = useRef<Resource[]>(resources);
  const lastEventsPropRef = useRef<EventItem[]>(events);

  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 5, 18));
  const [zoomMinutes, setZoomMinutes] = useState<number>(60);
  const [isMapViewActive, setIsMapViewActive] = useState<boolean>(false);

  const [isPanning, setIsPanning] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Which event's detail card is open (click mode) — single-open, shared via context.
  const [detailOpenId, setDetailOpenId] = useState<string | null>(null);
  const detailOpenValue = useMemo(() => ({ openId: detailOpenId, setOpenId: setDetailOpenId }), [detailOpenId]);

  const [showJobCreationModal, setShowJobCreationModal] = useState(false);
  const [newEventData, setNewEventData] = useState<NewEventData | null>(null);
  const [showTechnicianModal, setShowTechnicianModal] = useState(false);

  // Enables CSS transitions on row height/position for a short window after a
  // layout-changing drop, so rows grow/shift smoothly. Kept time-boxed because
  // the same row transform is driven by scrolling — a permanent transition
  // would make normal scrolling feel laggy.
  const [animateLayout, setAnimateLayout] = useState(false);
  const animateTimeoutRef = useRef<number | null>(null);
  const triggerLayoutAnimation = useCallback(() => {
    setAnimateLayout(true);
    if (animateTimeoutRef.current) window.clearTimeout(animateTimeoutRef.current);
    animateTimeoutRef.current = window.setTimeout(() => setAnimateLayout(false), 260);
  }, []);
  useEffect(() => () => {
    if (animateTimeoutRef.current) window.clearTimeout(animateTimeoutRef.current);
  }, []);

  const checkAndSyncProps = useCallback(() => {
    if (activeModeRef.current === 'NONE') {
      if (areResourcesDifferent(resources, lastResourcesPropRef.current)) {
        setLocalResources(resources);
        lastResourcesPropRef.current = resources;
      }
      if (areEventsDifferent(events, lastEventsPropRef.current)) {
        setLocalEvents(events);
        lastEventsPropRef.current = events;
      }
    }
  }, [resources, events]);

  useEffect(() => { checkAndSyncProps(); }, [resources, events, checkAndSyncProps]);

  // Stable signature of which resources are present, so a same-size technician
  // swap (e.g. switching templates) still triggers a refetch.
  const resourceIdsKey = useMemo(() => localResources.map(r => r.id).join(','), [localResources]);

  // Dynamically fetch events for currentDate whenever it (or the roster) changes
  useEffect(() => {
    let active = true;
    if (localResources.length > 0) {
      fetchEventsForDate(localResources, currentDate).then(({ events: newEvents }) => {
        if (active) {
          setLocalEvents(newEvents);
        }
      });
    }

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, resourceIdsKey, fetchEventsForDate]);

  // Slots per hour derived from the snap interval (e.g. 15 min → 4, 1 min → 60).
  const slotsPerHour = useMemo(() => Math.max(1, Math.round(60 / snapMinutes)), [snapMinutes]);
  const totalHours = useMemo(() => dayEndHour - dayStartHour, [dayEndHour, dayStartHour]);
  const totalSlots = useMemo(() => totalHours * slotsPerHour, [totalHours, slotsPerHour]);
  const hourWidth = useMemo(() => getHourWidth(zoomMinutes), [zoomMinutes]);
  const totalWidth = useMemo(() => totalHours * hourWidth, [totalHours, hourWidth]);
  const hours = useMemo(() => Array.from({ length: totalHours }, (_, i) => dayStartHour + i), [totalHours, dayStartHour]);

  // Filter events to only show those scheduled on the current date
  const dailyEvents = useMemo(() => {
    return localEvents.filter(e => {
      const d = e.startTime;
      return d.getFullYear() === currentDate.getFullYear() &&
        d.getMonth() === currentDate.getMonth() &&
        d.getDate() === currentDate.getDate();
    });
  }, [localEvents, currentDate]);

  // Delegates to the pure `computeLayout` engine in _lib. Depends on `dailyEvents`
  // (the actual input) rather than `localEvents`, so the layout recomputes on date
  // change and isn't recomputed for events on other days.
  const layoutEngine = useMemo(
    () => computeLayout({ resources: localResources, dailyEvents, dayStartHour, totalHours, slotsPerHour }),
    [localResources, dailyEvents, dayStartHour, totalHours, slotsPerHour],
  );

  // Mirror the latest events + event spans in refs so the card drag/resize
  // callbacks can stay referentially stable. Otherwise listing `localEvents` /
  // `layoutEngine.eventSpans` as deps gives those callbacks a new identity on
  // every event mutation or layout recompute, which breaks the memo on every
  // visible TimelineRow and re-renders the whole viewport.
  const localEventsRef = useRef(localEvents);
  localEventsRef.current = localEvents;
  const eventSpansRef = useRef(layoutEngine.eventSpans);
  eventSpansRef.current = layoutEngine.eventSpans;

  const estimateSize = useCallback((index: number) => {
    const resource = localResources[index];
    if (!resource) return LAYOUT_CONSTANTS.ROW_MIN_HEIGHT;
    return layoutEngine.rowHeights[resource.id] || LAYOUT_CONSTANTS.ROW_MIN_HEIGHT;
  }, [localResources, layoutEngine.rowHeights]);

  const rowVirtualizer = useVirtualizer({
    count: localResources.length,
    getScrollElement: () => scrollElement,
    estimateSize,
    overscan: 5,
    initialRect: { width: 1200, height: 800 },
  });

  // FIXED: Force React to instantly paint the new layout heights instead of waiting for a manual scroll
  useEffect(() => {
    rowVirtualizer.measure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutEngine.rowHeights]);

  // Keep a stable reference to the virtualizer so pointer-move handlers can read
  // the latest virtual items without listing `virtualRows` as a dependency
  // (which would otherwise rebuild the handler on every scroll tick).
  const virtualizerRef = useRef(rowVirtualizer);
  virtualizerRef.current = rowVirtualizer;

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  const formatHourLabel = useCallback((hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour} ${period}`;
  }, []);

  const handleMapViewToggle = useCallback(() => setIsMapViewActive(prev => !prev), []);
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Left-drag pans empty gutter; middle-drag pans anywhere (incl. over rows,
    // since the row's pointerdown bails on non-left and lets this fire).
    if (e.button !== 0 && e.button !== 1) return; // ignore right click
    if (e.button === 1) e.preventDefault(); // suppress browser middle-click autoscroll
    if (activeModeRef.current !== 'NONE' || !scrollContainerRef.current) return;
    activeModeRef.current = 'PANNING';
    setIsPanning(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning || activeModeRef.current !== 'PANNING' || !scrollContainerRef.current) return;
    e.preventDefault();
    const walk = ((e.pageX - scrollContainerRef.current.offsetLeft) - startX) * 1.5;
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  }, [isPanning, startX, scrollLeft]);

  const handleMouseUpOrLeave = useCallback(() => {
    if (activeModeRef.current === 'PANNING') { setIsPanning(false); activeModeRef.current = 'NONE'; }
  }, []);

  const captureMetrics = useCallback(() => {
    if (gridRef.current && scrollContainerRef.current) {
      activeSlotWidthRef.current = gridRef.current.scrollWidth / totalSlots;
      metricsRef.current = {
        gridLeft: gridRef.current.getBoundingClientRect().left,
        containerTop: scrollContainerRef.current.getBoundingClientRect().top
      };
    }
  }, [totalSlots]);

  // Shared context the pointer-controller hooks read from (refs + metrics owned
  // here so the state-machine semantics are unchanged).
  const interactionCtx: InteractionContext = {
    gridRef, scrollContainerRef, activeModeRef, lastInteractionRef, metricsRef,
    activeSlotWidthRef, pointerStartPosRef, virtualizerRef, captureMetrics, totalSlots, localResources,
  };

  const cardDrag = useCardDrag(interactionCtx, { localEventsRef, eventSpansRef, canChangeRows });
  const cardResize = useCardResize(interactionCtx, {
    interaction: cardDrag.interaction,
    setInteraction: cardDrag.setInteraction,
    localEventsRef,
    eventSpansRef,
  });
  const rowReorder = useRowReorder(interactionCtx);
  const slotSel = useSlotSelection(interactionCtx);

  // Live "start – end" labels for the in-progress ghosts. Duration tracks the
  // drag distance only — a bare click is one slot.
  const selectionLabel = useMemo(() => {
    const selection = slotSel.selection;
    if (!selection) return null;
    const start = Math.min(selection.startSlot, selection.currentSlot);
    const end = Math.max(selection.startSlot, selection.currentSlot);
    const endSlot = Math.min(totalSlots, end + 1);
    return formatSlotRange(start, endSlot, currentDate, dayStartHour, slotsPerHour);
  }, [slotSel.selection, totalSlots, currentDate, dayStartHour, slotsPerHour]);

  const dropLabel = useMemo(
    () => cardDrag.dropIndicator ? formatSlotRange(cardDrag.dropIndicator.startCol, cardDrag.dropIndicator.endCol, currentDate, dayStartHour, slotsPerHour) : null,
    [cardDrag.dropIndicator, currentDate, dayStartHour, slotsPerHour],
  );
  const resizeLabel = useMemo(
    () => cardResize.resizeIndicator ? formatSlotRange(cardResize.resizeIndicator.startCol, cardResize.resizeIndicator.endCol, currentDate, dayStartHour, slotsPerHour) : null,
    [cardResize.resizeIndicator, currentDate, dayStartHour, slotsPerHour],
  );

  // Esc cancels any in-progress interaction and clears its ghost/indicators.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      activeModeRef.current = 'NONE';
      setIsPanning(false);
      slotSel.setSelection(null);
      cardDrag.clear();
      cardDrag.resetTransform();
      cardResize.clear();
      rowReorder.setRowDrag(null);
      rowReorder.setRowDropIndicator(null);
      setDetailOpenId(null);
      lastInteractionRef.current = null;
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [slotSel, cardDrag, cardResize, rowReorder]);

  // Close the open detail card when clicking anywhere that isn't a card or a
  // popover surface (handles outside-click dismissal across the independent cards).
  useEffect(() => {
    if (detailOpenId === null) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (t && (t.closest('[data-event-card]') || t.closest('[data-radix-popper-content-wrapper]'))) return;
      setDetailOpenId(null);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [detailOpenId]);

  // Routes a pointer-move to whichever controller matches the active mode. Each
  // hook's `move` guards on its own mode/state, so this just dispatches.
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!gridRef.current || !scrollContainerRef.current) return;
    switch (activeModeRef.current) {
      case 'RESIZING_CARD': cardResize.move(e); break;
      case 'DRAGGING_CARD': cardDrag.move(e); break;
      case 'DRAGGING_ROW': rowReorder.move(e); break;
      case 'SELECTING_SLOT': slotSel.move(e); break;
    }
  }, [cardResize, cardDrag, rowReorder, slotSel]);

  const handlePointerUp = useCallback(() => {
    if (activeModeRef.current === 'DRAGGING_CARD') {
      const interaction = cardDrag.interaction;
      const dropIndicator = cardDrag.dropIndicator;
      // Only commit if the card actually moved. A click (no movement) leaves the
      // drop at the start columns/row — committing then would snap an off-grid
      // event to the grid and fire a spurious save.
      const moved = !!interaction && !!dropIndicator && (
        dropIndicator.resourceId !== interaction.startResourceId ||
        dropIndicator.startCol !== interaction.startColStart ||
        dropIndicator.endCol !== interaction.startColEnd
      );
      if (interaction && dropIndicator && moved) {
        const finalEvent = localEvents.find(evt => evt.id === interaction.eventId);
        if (finalEvent) {
          const newResourceId = dropIndicator.resourceId;
          const newStartTime = slotToDate(dropIndicator.startCol, currentDate, dayStartHour, slotsPerHour);
          const newEndTime = slotToDate(dropIndicator.endCol, currentDate, dayStartHour, slotsPerHour);

          const hasChanged = finalEvent.resourceId !== newResourceId ||
            finalEvent.startTime.getTime() !== newStartTime.getTime() ||
            finalEvent.endTime.getTime() !== newEndTime.getTime();

          if (hasChanged) {
            const updatedEvent = { ...finalEvent, resourceId: newResourceId, startTime: newStartTime, endTime: newEndTime };
            setLocalEvents(prev => prev.map(evt => evt.id === interaction.eventId ? updatedEvent : evt));
            if (onEventChange) onEventChange(updatedEvent);
            if (onSaveEvent) onSaveEvent(updatedEvent);
          }
        }
      }
      cardDrag.resetTransform();
      cardDrag.clear();
    } else if (activeModeRef.current === 'RESIZING_CARD') {
      const interaction = cardDrag.interaction;
      const resizeIndicator = cardResize.resizeIndicator;
      // Only commit if an edge actually moved (a click on a handle shouldn't snap/save).
      const resized = !!interaction && !!resizeIndicator && (
        resizeIndicator.startCol !== interaction.startColStart ||
        resizeIndicator.endCol !== interaction.startColEnd
      );
      if (interaction && resizeIndicator && resized) {
        const finalEvent = localEvents.find(evt => evt.id === interaction.eventId);
        if (finalEvent) {
          const newStartTime = slotToDate(resizeIndicator.startCol, currentDate, dayStartHour, slotsPerHour);
          const newEndTime = slotToDate(resizeIndicator.endCol, currentDate, dayStartHour, slotsPerHour);

          const hasChanged = finalEvent.startTime.getTime() !== newStartTime.getTime() ||
            finalEvent.endTime.getTime() !== newEndTime.getTime();

          if (hasChanged) {
            const updatedEvent = { ...finalEvent, startTime: newStartTime, endTime: newEndTime };
            setLocalEvents(prev => prev.map(evt => evt.id === interaction.eventId ? updatedEvent : evt));
            if (onEventChange) onEventChange(updatedEvent);
            if (onSaveEvent) onSaveEvent(updatedEvent);
          }
        }
      }
      cardDrag.setInteraction(null);
      cardResize.clear();
    } else if (activeModeRef.current === 'DRAGGING_ROW') {
      const rowDrag = rowReorder.rowDrag;
      const rowDropIndicator = rowReorder.rowDropIndicator;
      // Apply the final array mutation ONLY on drop.
      if (rowDrag && rowDropIndicator !== null && rowDropIndicator !== rowDrag.currentIndex) {
        const reordered = [...localResources];
        const [draggedItem] = reordered.splice(rowDrag.currentIndex, 1);
        const insertIndex = rowDropIndicator > rowDrag.currentIndex ? rowDropIndicator - 1 : rowDropIndicator;
        reordered.splice(insertIndex, 0, draggedItem);
        setLocalResources(reordered);
        if (onResourcesReorder) onResourcesReorder(reordered);
      }
      // Clear the GPU transforms + state.
      if (rowReorder.draggedSidebarRowRef.current) rowReorder.draggedSidebarRowRef.current.style.transform = '';
      if (rowReorder.draggedGridRowRef.current) rowReorder.draggedGridRowRef.current.style.transform = '';
      rowReorder.setRowDrag(null);
      rowReorder.setRowDropIndicator(null);
    } else if (activeModeRef.current === 'SELECTING_SLOT' && slotSel.selection) {
      const selection = slotSel.selection;
      const start = Math.min(selection.startSlot, selection.currentSlot);
      const end = Math.max(selection.startSlot, selection.currentSlot);
      // `selection` only exists after a real drag (a bare click sets none), so
      // reaching here always means the user swept a range.
      const finalEnd = Math.min(totalSlots, end + 1);

      setNewEventData({
        resourceId: selection.resourceId,
        startTime: slotToDate(start, currentDate, dayStartHour, slotsPerHour),
        endTime: slotToDate(finalEnd, currentDate, dayStartHour, slotsPerHour),
        title: 'New Job', location: '', price: 150, status: 'New'
      });
      setShowJobCreationModal(true);
      slotSel.setSelection(null);
    }

    // A card move, resize, or row reorder can change row heights — animate the
    // resulting layout shift for one short window.
    triggerLayoutAnimation();

    activeModeRef.current = 'NONE';
    lastInteractionRef.current = null;
    checkAndSyncProps();
  }, [cardDrag, cardResize, rowReorder, slotSel, localEvents, localResources, currentDate, dayStartHour, slotsPerHour, totalSlots, onEventChange, onSaveEvent, onResourcesReorder, checkAndSyncProps, triggerLayoutAnimation]);

  const handleCreateJobHeader = useCallback(() => {
    setNewEventData({
      resourceId: localResources[0]?.id || '',
      startTime: slotToDate(0, currentDate, dayStartHour, slotsPerHour),
      endTime: slotToDate(slotsPerHour, currentDate, dayStartHour, slotsPerHour), // default 1-hour job
      title: '', location: '', price: 150, status: 'New'
    });
    setShowJobCreationModal(true);
  }, [localResources, currentDate, dayStartHour, slotsPerHour]);

  const handleReset = useCallback(() => {
    setCurrentDate(new Date(2026, 5, 18));
    setZoomMinutes(60);
    setLocalResources(resources);
    setLocalEvents(events);
  }, [resources, events]);

  const handleSaveJob = useCallback(() => {
    if (newEventData) {
      const newlyCreatedEvent: EventItem = {
        id: `job-created-${Date.now()}`,
        resourceId: newEventData.resourceId,
        title: newEventData.title || 'New Job',
        startTime: newEventData.startTime,
        endTime: newEventData.endTime,
        status: newEventData.status,
        metadata: { location: newEventData.location, price: newEventData.price }
      };
      setLocalEvents(prev => [...prev, newlyCreatedEvent]);
      if (onEventAdd) onEventAdd(newlyCreatedEvent);
      triggerLayoutAnimation();
    }
    setShowJobCreationModal(false);
    setNewEventData(null);
  }, [newEventData, onEventAdd, triggerLayoutAnimation]);

  const handleSaveTechnician = useCallback((resource: Resource) => {
    // Bubble up so App keeps the roster (and template technician list) in sync;
    // fall back to local state when no handler is provided (e.g. stress test).
    if (onResourceAdd) onResourceAdd(resource);
    else setLocalResources(prev => [...prev, resource]);
    setShowTechnicianModal(false);
    triggerLayoutAnimation();
  }, [onResourceAdd, triggerLayoutAnimation]);

  const setScrollContainerRefs = useCallback((node: HTMLDivElement | null) => {
    if (node) { scrollContainerRef.current = node; setScrollElement(node); }
  }, []);

  return (
    <DetailOpenContext.Provider value={detailOpenValue}>
    <div className="flex flex-col w-full h-full flex-1 bg-background overflow-hidden relative transition-colors duration-200">
      <TimelineControlsHeader
        currentDate={currentDate} onDateChange={setCurrentDate}
        zoomMinutes={zoomMinutes} onZoomChange={setZoomMinutes}
        onReset={handleReset} onCreateJob={handleCreateJobHeader}
        onAddTechnician={() => setShowTechnicianModal(true)}
        isMapViewActive={isMapViewActive} onMapViewToggle={handleMapViewToggle}
        onOpenTemplates={onOpenTemplates}
      />
      <div className="flex-1 min-h-0 relative overflow-hidden">
        <div
          ref={setScrollContainerRefs}
          className="absolute inset-0 flex overflow-auto select-none"
          onContextMenu={(e) => e.preventDefault()}
          onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}
        >
          <ResourceSidebar
            resources={localResources}
            virtualRows={virtualRows}
            totalSize={totalSize}
            rowDrag={rowReorder.rowDrag}
            rowDropIndicator={rowReorder.rowDropIndicator}
            draggedSidebarRowRef={rowReorder.draggedSidebarRowRef}
            startRowDrag={rowReorder.start}
            renderResource={renderResource}
          />
          <TimelineGrid
            gridRef={gridRef}
            virtualRows={virtualRows}
            totalSize={totalSize}
            isPanning={isPanning}
            draggedElementRef={cardDrag.draggedElementRef}
            draggedGridRowRef={rowReorder.draggedGridRowRef}
            dropIndicator={cardDrag.dropIndicator}
            resizeIndicator={cardResize.resizeIndicator}
            rowDrag={rowReorder.rowDrag}
            rowDropIndicator={rowReorder.rowDropIndicator}
            onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUpOrLeave={handleMouseUpOrLeave}
            totalWidth={totalWidth} hours={hours} totalHours={totalHours} formatHourLabel={formatHourLabel}
            resources={localResources} selection={slotSel.selection} selectionLabel={selectionLabel}
            dropLabel={dropLabel} resizeLabel={resizeLabel}
            totalSlots={totalSlots}
            startCardDrag={cardDrag.start} startCardResize={cardResize.start} handleRowPointerDown={slotSel.start}
            renderEvent={renderEvent} interactionEventId={cardDrag.interaction?.eventId}
            detailTrigger={detailTrigger}
            cardRows={cardRows}
            rowHeights={layoutEngine.rowHeights} eventLanes={layoutEngine.eventLanes}
            eventSpans={layoutEngine.eventSpans} eventsByResource={layoutEngine.eventsByResource}
            animateLayout={animateLayout}
          />
        </div>
      </div>
      {showJobCreationModal && (
        <Suspense fallback={null}>
          <JobCreationDialog
            isOpen={showJobCreationModal} onClose={() => { setShowJobCreationModal(false); setNewEventData(null); }}
            newEventData={newEventData} onChange={setNewEventData} onSave={handleSaveJob} resources={localResources}
          />
        </Suspense>
      )}
      {showTechnicianModal && (
        <Suspense fallback={null}>
          <TechnicianCreationDialog
            isOpen={showTechnicianModal}
            onClose={() => setShowTechnicianModal(false)}
            onSave={handleSaveTechnician}
          />
        </Suspense>
      )}
    </div>
    </DetailOpenContext.Provider>
  );
};
