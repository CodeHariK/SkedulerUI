import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import type { Resource, EventItem, NewEventData } from './types';
import { TimelineControlsHeader } from './TimelineControlsHeader';
import { ResourceSidebar } from './ResourceSidebar';
import { TimelineGrid } from './TimelineGrid';
import { JobCreationDialog } from './JobCreationDialog';
import { useVirtualizer } from '@tanstack/react-virtual';
import { LAYOUT_CONSTANTS } from './constants';
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
  renderResource?: (resource: Resource, onGripMouseDown?: (e: React.PointerEvent) => void) => React.ReactNode;
  renderEvent?: (event: EventItem, onDragStart?: (e: React.PointerEvent, eventId: string) => void, onResizeStart?: (e: React.PointerEvent, eventId: string, direction: 'left' | 'right') => void) => React.ReactNode;
  onEventChange?: (event: EventItem) => Promise<any> | void;
  onEventAdd?: (event: EventItem) => void;
  onResourcesReorder?: (resources: Resource[]) => void;
  fetchEventsForDate: (resourceCount: number, date: Date) => Promise<{ resources: Resource[]; events: EventItem[] }>;
  onSaveEvent?: (event: EventItem) => Promise<any>;
}

export const ResourceScheduler: React.FC<ResourceSchedulerProps> = ({
  resources, events, dayStartHour = 6, dayEndHour = 20, canChangeRows = true,
  renderResource, renderEvent, onEventChange, onEventAdd, onResourcesReorder, fetchEventsForDate, onSaveEvent
}) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null);

  const draggedElementRef = useRef<HTMLDivElement>(null);
  const draggedSidebarRowRef = useRef<HTMLDivElement>(null);
  const draggedGridRowRef = useRef<HTMLDivElement>(null);

  const activeModeRef = useRef<'NONE' | 'PANNING' | 'DRAGGING_CARD' | 'RESIZING_CARD' | 'DRAGGING_ROW' | 'SELECTING_SLOT'>('NONE');
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
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const [isPanning, setIsPanning] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const [interaction, setInteraction] = useState<{
    eventId: string; type: 'move' | 'resize'; startX: number; startY: number;
    startScrollLeft: number; startScrollTop: number; startColStart: number; startColEnd: number;
    startResourceId: string; resizeDirection?: 'left' | 'right';
  } | null>(null);

  const [dropIndicator, setDropIndicator] = useState<{ resourceId: string; startCol: number; endCol: number; } | null>(null);
  const [resizeIndicator, setResizeIndicator] = useState<{ eventId: string; startCol: number; endCol: number; } | null>(null);

  const [rowDrag, setRowDrag] = useState<{ resourceId: string; startY: number; currentIndex: number; startScrollTop: number } | null>(null);
  const [rowDropIndicator, setRowDropIndicator] = useState<number | null>(null);
  const [selection, setSelection] = useState<{ resourceId: string; startSlot: number; currentSlot: number; } | null>(null);

  const [showJobCreationModal, setShowJobCreationModal] = useState(false);
  const [newEventData, setNewEventData] = useState<NewEventData | null>(null);

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

  // Dynamically generate events for currentDate if none exist yet
  useEffect(() => {
    let active = true;
    const hasEventsForDate = localEvents.some(e => {
      const d = e.startTime;
      return d.getFullYear() === currentDate.getFullYear() &&
        d.getMonth() === currentDate.getMonth() &&
        d.getDate() === currentDate.getDate();
    });

    if (!hasEventsForDate && localResources.length > 0) {
      fetchEventsForDate(localResources.length, currentDate).then(({ events: newEvents }) => {
        if (active) {
          setLocalEvents(prev => [...prev, ...newEvents]);
        }
      });
    }

    return () => {
      active = false;
    };
  }, [currentDate, localResources.length, localEvents, fetchEventsForDate]);

  const slotsPerHour = 4;
  const totalHours = useMemo(() => dayEndHour - dayStartHour, [dayEndHour, dayStartHour]);
  const totalSlots = useMemo(() => totalHours * slotsPerHour, [totalHours]);
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

  const layoutEngine = useMemo(() => {
    const t0 = performance.now(); // START TIMER

    const rowHeights: Record<string, number> = {};
    const eventLanes: Record<string, number> = {};
    const eventSpans: Record<string, { gridColumnStart: number, gridColumnEnd: number }> = {};
    const eventsByResource: Record<string, EventItem[]> = {};

    localResources.forEach(r => { eventsByResource[r.id] = []; rowHeights[r.id] = LAYOUT_CONSTANTS.ROW_MIN_HEIGHT; });
    dailyEvents.forEach(e => { if (eventsByResource[e.resourceId]) eventsByResource[e.resourceId].push(e); });

    localResources.forEach(resource => {
      const resourceEvents = eventsByResource[resource.id].sort((a, b) => {
        const diff = a.startTime.getTime() - b.startTime.getTime();
        return diff !== 0 ? diff : a.id.localeCompare(b.id);
      });

      if (resourceEvents.length === 0) return;
      const lanes: number[] = [];

      resourceEvents.forEach(event => {
        eventSpans[event.id] = getEventGridSpan(event.startTime, event.endTime, dayStartHour, totalHours, slotsPerHour);

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
    console.log(`⏱️ layoutEngine Calculation: ${(t1 - t0).toFixed(2)}ms for ${localEvents.length} events`);

    return { rowHeights, eventLanes, eventSpans, eventsByResource };
  }, [localResources, localEvents, dayStartHour, totalHours, slotsPerHour]);

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

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  const formatHourLabel = useCallback((hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour} ${period}`;
  }, []);

  const handleMapViewToggle = useCallback(() => setIsMapViewActive(prev => !prev), []);
  const handleThemeToggle = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      next === 'dark' ? document.documentElement.classList.add('dark') : document.documentElement.classList.remove('dark');
      return next;
    });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
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

  const startCardDrag = useCallback((e: React.PointerEvent, eventId: string) => {
    e.preventDefault(); e.stopPropagation();
    if (activeModeRef.current !== 'NONE' || !gridRef.current) return;
    activeModeRef.current = 'DRAGGING_CARD';

    captureMetrics();

    const event = localEvents.find(evt => evt.id === eventId);
    if (!event) { activeModeRef.current = 'NONE'; return; }

    const span = layoutEngine.eventSpans[eventId] || { gridColumnStart: 1, gridColumnEnd: 1 };
    lastInteractionRef.current = { slot: span.gridColumnStart - 1, resourceId: event.resourceId };

    setInteraction({
      eventId, type: 'move', startX: e.clientX, startY: e.clientY,
      startScrollLeft: scrollContainerRef.current?.scrollLeft || 0,
      startScrollTop: scrollContainerRef.current?.scrollTop || 0,
      startColStart: span.gridColumnStart - 1, startColEnd: span.gridColumnEnd - 1, startResourceId: event.resourceId
    });

    setDropIndicator({ resourceId: event.resourceId, startCol: span.gridColumnStart - 1, endCol: span.gridColumnEnd - 1 });
  }, [localEvents, captureMetrics, layoutEngine.eventSpans]);

  const startCardResize = useCallback((e: React.PointerEvent, eventId: string, direction: 'left' | 'right') => {
    e.preventDefault(); e.stopPropagation();
    if (activeModeRef.current !== 'NONE' || !gridRef.current) return;
    activeModeRef.current = 'RESIZING_CARD';

    captureMetrics();

    const event = localEvents.find(evt => evt.id === eventId);
    if (!event) { activeModeRef.current = 'NONE'; return; }

    const span = layoutEngine.eventSpans[eventId] || { gridColumnStart: 1, gridColumnEnd: 1 };
    lastInteractionRef.current = { slot: direction === 'left' ? span.gridColumnStart - 1 : span.gridColumnEnd - 1 };

    setInteraction({
      eventId, type: 'resize', startX: e.clientX, startY: e.clientY,
      startScrollLeft: scrollContainerRef.current?.scrollLeft || 0,
      startScrollTop: scrollContainerRef.current?.scrollTop || 0,
      startColStart: span.gridColumnStart - 1, startColEnd: span.gridColumnEnd - 1,
      startResourceId: event.resourceId, resizeDirection: direction
    });

    setResizeIndicator({ eventId, startCol: span.gridColumnStart - 1, endCol: span.gridColumnEnd - 1 });
  }, [localEvents, captureMetrics, layoutEngine.eventSpans]);

  const handleRowPointerDown = useCallback((e: React.PointerEvent, resourceId: string) => {
    if (e.target !== e.currentTarget || !gridRef.current || activeModeRef.current !== 'NONE') return;
    e.preventDefault(); e.stopPropagation();

    activeModeRef.current = 'SELECTING_SLOT';
    pointerStartPosRef.current = { x: e.clientX, y: e.clientY };
    captureMetrics();

    const slotIdx = Math.max(0, Math.floor((e.clientX - metricsRef.current.gridLeft + gridRef.current.scrollLeft) / activeSlotWidthRef.current));

    setSelection({ resourceId, startSlot: slotIdx, currentSlot: slotIdx });
    lastInteractionRef.current = { slot: slotIdx };
  }, [captureMetrics]);

  const startRowDrag = useCallback((e: React.PointerEvent, resourceId: string) => {
    e.preventDefault(); e.stopPropagation();
    if (activeModeRef.current !== 'NONE') return;
    activeModeRef.current = 'DRAGGING_ROW';
    captureMetrics();
    const idx = localResources.findIndex(r => r.id === resourceId);
    if (idx !== -1) {
      setRowDrag({ resourceId, startY: e.clientY, currentIndex: idx, startScrollTop: scrollContainerRef.current?.scrollTop || 0 });
      setRowDropIndicator(idx);
    }
  }, [localResources, captureMetrics]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const gridEl = gridRef.current;
    const scrollContainerEl = scrollContainerRef.current;
    if (!gridEl || !scrollContainerEl) return;

    // We only want to profile the heavy dragging/resizing work
    if (
      activeModeRef.current !== 'RESIZING_CARD' &&
      activeModeRef.current !== 'DRAGGING_CARD' &&
      activeModeRef.current !== 'DRAGGING_ROW' &&
      activeModeRef.current !== 'SELECTING_SLOT'
    ) {
      return;
    }

    const t0 = performance.now(); // START TIMER

    if (activeModeRef.current === 'RESIZING_CARD' && interaction) {
      const currentSlot = Math.max(0, Math.floor((e.clientX - metricsRef.current.gridLeft + gridEl.scrollLeft) / activeSlotWidthRef.current));
      if (lastInteractionRef.current?.slot !== currentSlot) {
        lastInteractionRef.current = { slot: currentSlot };

        if (interaction.resizeDirection === 'left') {
          setResizeIndicator({
            eventId: interaction.eventId,
            startCol: Math.max(0, Math.min(interaction.startColEnd - 1, currentSlot)),
            endCol: interaction.startColEnd
          });
        } else {
          setResizeIndicator({
            eventId: interaction.eventId,
            startCol: interaction.startColStart,
            endCol: Math.max(interaction.startColStart + 1, Math.min(totalSlots, currentSlot))
          });
        }
      }
    } else if (activeModeRef.current === 'DRAGGING_CARD' && interaction) {
      const scrollDeltaX = scrollContainerEl.scrollLeft - interaction.startScrollLeft;
      const scrollDeltaY = scrollContainerEl.scrollTop - interaction.startScrollTop;

      if (draggedElementRef.current) {
        const x = (e.clientX - interaction.startX) + scrollDeltaX;
        const y = (e.clientY - interaction.startY) + scrollDeltaY;
        draggedElementRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }

      let targetResource: Resource;

      if (canChangeRows) {
        const gridY = (e.clientY - metricsRef.current.containerTop + scrollContainerEl.scrollTop) - LAYOUT_CONSTANTS.HEADER_OFFSET;
        let targetRowIdx = localResources.length - 1;
        const found = virtualRows.find(item => gridY >= item.start && gridY <= (item.start + item.size));
        if (found) targetRowIdx = found.index;

        targetRowIdx = Math.max(0, Math.min(localResources.length - 1, targetRowIdx));
        targetResource = localResources[targetRowIdx];
      } else {
        targetResource = localResources.find(r => r.id === interaction.startResourceId) || localResources[0];
      }

      const logicalDeltaX = (e.clientX - interaction.startX) + scrollDeltaX;
      const deltaSlots = Math.round(logicalDeltaX / activeSlotWidthRef.current);
      const durationSlots = interaction.startColEnd - interaction.startColStart;
      const newStartSlot = Math.max(0, Math.min(totalSlots - durationSlots, interaction.startColStart + deltaSlots));

      if (lastInteractionRef.current?.slot !== newStartSlot || lastInteractionRef.current?.resourceId !== targetResource.id) {
        lastInteractionRef.current = { slot: newStartSlot, resourceId: targetResource.id };
        setDropIndicator({ resourceId: targetResource.id, startCol: newStartSlot, endCol: newStartSlot + durationSlots });
      }

    } else if (activeModeRef.current === 'DRAGGING_ROW' && rowDrag) {
      // 1. Calculate how far the mouse has moved since the drag started
      const scrollDeltaY = scrollContainerEl.scrollTop - rowDrag.startScrollTop;
      const translateY = (e.clientY - rowDrag.startY) + scrollDeltaY;

      // 2. Visually float the dragged row (Zero React State)
      if (draggedSidebarRowRef.current) draggedSidebarRowRef.current.style.transform = `translate3d(0, ${translateY}px, 0)`;
      if (draggedGridRowRef.current) draggedGridRowRef.current.style.transform = `translate3d(0, ${translateY}px, 0)`;

      // 3. Determine which row we are currently hovering over
      const gridY = (e.clientY - metricsRef.current.containerTop + scrollContainerEl.scrollTop) - LAYOUT_CONSTANTS.HEADER_OFFSET;

      let newIndex = localResources.length - 1;
      const found = virtualRows.find(item => gridY >= item.start && gridY <= (item.start + item.size));
      if (found) newIndex = found.index;
      newIndex = Math.max(0, Math.min(localResources.length - 1, newIndex));

      // 4. Update ONLY the lightweight drop indicator line state
      if (lastInteractionRef.current?.slot !== newIndex) {
        lastInteractionRef.current = { slot: newIndex };
        setRowDropIndicator(newIndex);
      }
    } else if (activeModeRef.current === 'SELECTING_SLOT' && selection) {
      const currentSlot = Math.max(0, Math.floor((e.clientX - metricsRef.current.gridLeft + gridEl.scrollLeft) / activeSlotWidthRef.current));
      
      // Update state only if the slot boundary has actually changed
      if (selection.currentSlot !== currentSlot) {
        setSelection(prev => prev ? { ...prev, currentSlot } : null);
      }
    }

    const t1 = performance.now(); // END TIMER
    const duration = t1 - t0;

    // Log if the pointer move calculation takes longer than 8ms (threatening 60FPS)
    if (duration > 8) {
      console.warn(`⚠️ Slow PointerMove (${activeModeRef.current}): ${duration.toFixed(2)}ms`);
    }

  }, [interaction, rowDrag, selection, localResources, totalSlots, virtualRows, canChangeRows]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (activeModeRef.current === 'DRAGGING_CARD') {
      if (interaction && dropIndicator) {
        const finalEvent = localEvents.find(evt => evt.id === interaction.eventId);
        if (finalEvent) {
          const newResourceId = dropIndicator.resourceId;
          const newStartTime = slotToDate(dropIndicator.startCol, currentDate, dayStartHour, slotsPerHour);
          const newEndTime = slotToDate(dropIndicator.endCol, currentDate, dayStartHour, slotsPerHour);

          const hasChanged = finalEvent.resourceId !== newResourceId ||
            finalEvent.startTime.getTime() !== newStartTime.getTime() ||
            finalEvent.endTime.getTime() !== newEndTime.getTime();

          if (hasChanged) {
            const updatedEvent = {
              ...finalEvent,
              resourceId: newResourceId,
              startTime: newStartTime,
              endTime: newEndTime
            };
            setLocalEvents(prev => prev.map(evt => evt.id === interaction.eventId ? updatedEvent : evt));
            if (onEventChange) onEventChange(updatedEvent);

            if (onSaveEvent) {
              onSaveEvent(updatedEvent);
            }
          }
        }
      }
      if (draggedElementRef.current) draggedElementRef.current.style.transform = 'translate3d(0, 0, 0)';
      setInteraction(null);
      setDropIndicator(null);
    } else if (activeModeRef.current === 'RESIZING_CARD') {
      if (interaction && resizeIndicator) {
        const finalEvent = localEvents.find(evt => evt.id === interaction.eventId);
        if (finalEvent) {
          const newStartTime = slotToDate(resizeIndicator.startCol, currentDate, dayStartHour, slotsPerHour);
          const newEndTime = slotToDate(resizeIndicator.endCol, currentDate, dayStartHour, slotsPerHour);

          const hasChanged = finalEvent.startTime.getTime() !== newStartTime.getTime() ||
            finalEvent.endTime.getTime() !== newEndTime.getTime();

          if (hasChanged) {
            const updatedEvent = {
              ...finalEvent,
              startTime: newStartTime,
              endTime: newEndTime
            };
            setLocalEvents(prev => prev.map(evt => evt.id === interaction.eventId ? updatedEvent : evt));
            if (onEventChange) onEventChange(updatedEvent);

            if (onSaveEvent) {
              onSaveEvent(updatedEvent);
            }
          }
        }
      }
      setInteraction(null);
      setResizeIndicator(null);
    } else if (activeModeRef.current === 'DRAGGING_ROW') {

      // 1. Apply the final array mutation ONLY on drop
      if (rowDrag && rowDropIndicator !== null && rowDropIndicator !== rowDrag.currentIndex) {
        const reordered = [...localResources];
        const [draggedItem] = reordered.splice(rowDrag.currentIndex, 1);

        // If we are dropping it further down the list, we need to adjust the insertion index
        const insertIndex = rowDropIndicator > rowDrag.currentIndex
          ? rowDropIndicator - 1
          : rowDropIndicator;

        reordered.splice(insertIndex, 0, draggedItem);

        // This single state update triggers the layout engine exactly ONCE at the end of the gesture
        setLocalResources(reordered);
        if (onResourcesReorder) onResourcesReorder(reordered);
      }

      // 2. Clear the GPU transforms
      if (draggedSidebarRowRef.current) draggedSidebarRowRef.current.style.transform = '';
      if (draggedGridRowRef.current) draggedGridRowRef.current.style.transform = '';

      // 3. Clear the states
      setRowDrag(null);
      setRowDropIndicator(null);
    } else if (activeModeRef.current === 'SELECTING_SLOT' && selection) {
      const dx = Math.abs(e.clientX - pointerStartPosRef.current.x);
      const dy = Math.abs(e.clientY - pointerStartPosRef.current.y);

      if (dx > 5 || dy > 5) {
        const start = Math.min(selection.startSlot, selection.currentSlot);
        const end = Math.max(selection.startSlot, selection.currentSlot);
        
        // 3. CHANGE `end` TO `end + 1` HERE
        const finalEnd = start === end ? start + 1 : end + 1; 

        setNewEventData({
          resourceId: selection.resourceId,
          startTime: slotToDate(start, currentDate, dayStartHour, slotsPerHour),
          endTime: slotToDate(finalEnd, currentDate, dayStartHour, slotsPerHour),
          title: 'New Job', location: '', price: 150, status: 'New'
        });
        setShowJobCreationModal(true);
      }
      setSelection(null);
    }

    activeModeRef.current = 'NONE';
    lastInteractionRef.current = null;
    checkAndSyncProps();
  }, [interaction, dropIndicator, resizeIndicator, localEvents, localResources, currentDate, dayStartHour, slotsPerHour, onEventChange, onResourcesReorder, selection, rowDrag, rowDropIndicator, checkAndSyncProps]);

  const handleCreateJobHeader = useCallback(() => {
    setNewEventData({
      resourceId: localResources[0]?.id || '',
      startTime: slotToDate(0, currentDate, dayStartHour, slotsPerHour),
      endTime: slotToDate(4, currentDate, dayStartHour, slotsPerHour),
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
    }
    setShowJobCreationModal(false);
    setNewEventData(null);
  }, [newEventData, onEventAdd]);

  const setScrollContainerRefs = useCallback((node: HTMLDivElement | null) => {
    if (node) { scrollContainerRef.current = node; setScrollElement(node); }
  }, []);

  return (
    <div className="flex flex-col w-full h-full flex-1 bg-background overflow-hidden relative transition-colors duration-200">
      <TimelineControlsHeader
        currentDate={currentDate} onDateChange={setCurrentDate}
        zoomMinutes={zoomMinutes} onZoomChange={setZoomMinutes}
        onReset={handleReset} onCreateJob={handleCreateJobHeader}
        isMapViewActive={isMapViewActive} onMapViewToggle={handleMapViewToggle}
        theme={theme} onThemeToggle={handleThemeToggle}
      />
      <div className="flex-1 min-h-0 relative overflow-hidden">
        <div
          ref={setScrollContainerRefs}
          className="absolute inset-0 flex overflow-auto select-none"
          onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}
        >
          <ResourceSidebar
            resources={localResources}
            virtualRows={virtualRows}
            totalSize={totalSize}
            rowDrag={rowDrag}
            rowDropIndicator={rowDropIndicator}
            draggedSidebarRowRef={draggedSidebarRowRef}
            startRowDrag={startRowDrag}
            renderResource={renderResource}
          />
          <TimelineGrid
            gridRef={gridRef}
            virtualRows={virtualRows}
            totalSize={totalSize}
            isPanning={isPanning}
            draggedElementRef={draggedElementRef}
            draggedGridRowRef={draggedGridRowRef}
            dropIndicator={dropIndicator}
            resizeIndicator={resizeIndicator}
            rowDrag={rowDrag}
            rowDropIndicator={rowDropIndicator}
            onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUpOrLeave={handleMouseUpOrLeave}
            totalWidth={totalWidth} hours={hours} totalHours={totalHours} formatHourLabel={formatHourLabel}
            resources={localResources} selection={selection}
            totalSlots={totalSlots}
            startCardDrag={startCardDrag} startCardResize={startCardResize} handleRowPointerDown={handleRowPointerDown}
            renderEvent={renderEvent} interactionEventId={interaction?.eventId}
            rowHeights={layoutEngine.rowHeights} eventLanes={layoutEngine.eventLanes}
            eventSpans={layoutEngine.eventSpans} eventsByResource={layoutEngine.eventsByResource}
          />
        </div>
      </div>
      <JobCreationDialog
        isOpen={showJobCreationModal} onClose={() => { setShowJobCreationModal(false); setNewEventData(null); }}
        newEventData={newEventData} onChange={setNewEventData} onSave={handleSaveJob} resources={localResources}
      />
    </div>
  );
};
