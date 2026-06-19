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
  renderEvent?: (event: EventItem, onDragStart?: (e: React.PointerEvent) => void, onResizeStart?: (e: React.PointerEvent, direction: 'left' | 'right') => void) => React.ReactNode;
  onEventChange?: (event: EventItem) => void;
  onEventAdd?: (event: EventItem) => void;
  onResourcesReorder?: (resources: Resource[]) => void;
}

export const ResourceScheduler: React.FC<ResourceSchedulerProps> = ({
  resources, events, dayStartHour = 6, dayEndHour = 20, canChangeRows = true,
  renderResource, renderEvent, onEventChange, onEventAdd, onResourcesReorder
}) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null);

  // --- High-Performance Refs ---
  const draggedElementRef = useRef<HTMLDivElement>(null);
  const activeModeRef = useRef<'NONE' | 'PANNING' | 'DRAGGING_CARD' | 'RESIZING_CARD' | 'DRAGGING_ROW' | 'SELECTING_SLOT'>('NONE');
  const lastInteractionRef = useRef<{ slot: number; resourceId?: string } | null>(null);
  const pointerStartPosRef = useRef({ x: 0, y: 0 });
  const activeSlotWidthRef = useRef<number>(0);

  // FIXED: Cache DOM Rects to prevent Layout Thrashing on Pointer Move
  const metricsRef = useRef({ gridLeft: 0, containerTop: 0 });

  const [localResources, setLocalResources] = useState<Resource[]>(resources);
  const [localEvents, setLocalEvents] = useState<EventItem[]>(events);
  const lastResourcesPropRef = useRef<Resource[]>(resources);
  const lastEventsPropRef = useRef<EventItem[]>(events);

  const [currentDate, setCurrentDate] = useState<Date>(new Date('2026-06-18'));
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

  const [rowDrag, setRowDrag] = useState<{ resourceId: string; startY: number; currentIndex: number; } | null>(null);
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

  const slotsPerHour = 4;
  const totalHours = useMemo(() => dayEndHour - dayStartHour, [dayEndHour, dayStartHour]);
  const totalSlots = useMemo(() => totalHours * slotsPerHour, [totalHours]);
  const hourWidth = useMemo(() => getHourWidth(zoomMinutes), [zoomMinutes]);
  const totalWidth = useMemo(() => totalHours * hourWidth, [totalHours, hourWidth]);
  const hours = useMemo(() => Array.from({ length: totalHours }, (_, i) => dayStartHour + i), [totalHours, dayStartHour]);

  const layoutEngine = useMemo(() => {
    const rowHeights: Record<string, number> = {};
    const eventLanes: Record<string, number> = {};
    const eventsByResource: Record<string, EventItem[]> = {};

    localResources.forEach(r => { eventsByResource[r.id] = []; rowHeights[r.id] = LAYOUT_CONSTANTS.ROW_MIN_HEIGHT; });
    localEvents.forEach(e => { if (eventsByResource[e.resourceId]) eventsByResource[e.resourceId].push(e); });

    localResources.forEach(resource => {
      const resourceEvents = eventsByResource[resource.id].sort((a, b) => {
        const diff = a.startTime.getTime() - b.startTime.getTime();
        return diff !== 0 ? diff : a.id.localeCompare(b.id);
      });

      if (resourceEvents.length === 0) return;
      const lanes: number[] = [];

      resourceEvents.forEach(event => {
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

    return { rowHeights, eventLanes, eventsByResource };
  }, [localResources, localEvents]);

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
    initialRect: { width: 1200, height: 800 }
  });

  useEffect(() => { rowVirtualizer.measure(); }, [layoutEngine.rowHeights, rowVirtualizer]);

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
    if (activeModeRef.current !== 'NONE' || !gridRef.current) return;
    activeModeRef.current = 'PANNING';
    setIsPanning(true);
    setStartX(e.pageX - gridRef.current.offsetLeft);
    setScrollLeft(gridRef.current.scrollLeft);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning || activeModeRef.current !== 'PANNING' || !gridRef.current) return;
    e.preventDefault();
    const walk = ((e.pageX - gridRef.current.offsetLeft) - startX) * 1.5;
    gridRef.current.scrollLeft = scrollLeft - walk;
  }, [isPanning, startX, scrollLeft]);

  const handleMouseUpOrLeave = useCallback(() => {
    if (activeModeRef.current === 'PANNING') { setIsPanning(false); activeModeRef.current = 'NONE'; }
  }, []);

  // FIXED: Caching DOM Metrics on pointer down to prevent Layout Thrashing
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

    const { gridColumnStart, gridColumnEnd } = getEventGridSpan(event.startTime, event.endTime, dayStartHour, totalHours, slotsPerHour);
    lastInteractionRef.current = { slot: gridColumnStart - 1, resourceId: event.resourceId };

    setInteraction({
      eventId, type: 'move', startX: e.clientX, startY: e.clientY,
      startScrollLeft: scrollContainerRef.current?.scrollLeft || 0,
      startScrollTop: scrollContainerRef.current?.scrollTop || 0,
      startColStart: gridColumnStart - 1, startColEnd: gridColumnEnd - 1, startResourceId: event.resourceId
    });

    setDropIndicator({ resourceId: event.resourceId, startCol: gridColumnStart - 1, endCol: gridColumnEnd - 1 });
  }, [localEvents, dayStartHour, totalHours, slotsPerHour, captureMetrics]);

  const startCardResize = useCallback((e: React.PointerEvent, eventId: string, direction: 'left' | 'right') => {
    e.preventDefault(); e.stopPropagation();
    if (activeModeRef.current !== 'NONE' || !gridRef.current) return;
    activeModeRef.current = 'RESIZING_CARD';

    captureMetrics();

    const event = localEvents.find(evt => evt.id === eventId);
    if (!event) { activeModeRef.current = 'NONE'; return; }

    const { gridColumnStart, gridColumnEnd } = getEventGridSpan(event.startTime, event.endTime, dayStartHour, totalHours, slotsPerHour);
    lastInteractionRef.current = { slot: direction === 'left' ? gridColumnStart - 1 : gridColumnEnd - 1 };

    setInteraction({
      eventId, type: 'resize', startX: e.clientX, startY: e.clientY,
      startScrollLeft: scrollContainerRef.current?.scrollLeft || 0,
      startScrollTop: scrollContainerRef.current?.scrollTop || 0,
      startColStart: gridColumnStart - 1, startColEnd: gridColumnEnd - 1,
      startResourceId: event.resourceId, resizeDirection: direction
    });

    setResizeIndicator({ eventId, startCol: gridColumnStart - 1, endCol: gridColumnEnd - 1 });
  }, [localEvents, dayStartHour, totalHours, slotsPerHour, captureMetrics]);

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
    if (idx !== -1) setRowDrag({ resourceId, startY: e.clientY, currentIndex: idx });
  }, [localResources, captureMetrics]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const gridEl = gridRef.current;
    const scrollContainerEl = scrollContainerRef.current;
    if (!gridEl || !scrollContainerEl) return;

    if (activeModeRef.current === 'RESIZING_CARD' && interaction) {
      const currentSlot = Math.max(0, Math.floor((e.clientX - metricsRef.current.gridLeft + gridEl.scrollLeft) / activeSlotWidthRef.current));
      if (lastInteractionRef.current?.slot === currentSlot) return;
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
    } else if (activeModeRef.current === 'DRAGGING_CARD' && interaction) {
      const scrollDeltaX = scrollContainerEl.scrollLeft - interaction.startScrollLeft;
      const scrollDeltaY = scrollContainerEl.scrollTop - interaction.startScrollTop;

      // FIXED: Direct DOM style updates (Zero React Re-renders)
      if (draggedElementRef.current) {
        const x = (e.clientX - interaction.startX) + scrollDeltaX;
        const y = (e.clientY - interaction.startY) + scrollDeltaY;
        draggedElementRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }

      let targetResource: Resource;

      if (canChangeRows) {
        // FIXED: Zero Layout Thrashing (Using Cached containerTop)
        const gridY = (e.clientY - metricsRef.current.containerTop + scrollContainerEl.scrollTop) - LAYOUT_CONSTANTS.HEADER_OFFSET;

        const virtualItems = rowVirtualizer.getVirtualItems();
        let targetRowIdx = localResources.length - 1;
        const found = virtualItems.find(item => gridY >= item.start && gridY <= (item.start + item.size));
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

      if (lastInteractionRef.current?.slot === newStartSlot && lastInteractionRef.current?.resourceId === targetResource.id) return;
      lastInteractionRef.current = { slot: newStartSlot, resourceId: targetResource.id };

      setDropIndicator({ resourceId: targetResource.id, startCol: newStartSlot, endCol: newStartSlot + durationSlots });

    } else if (activeModeRef.current === 'DRAGGING_ROW' && rowDrag) {
      const gridY = (e.clientY - metricsRef.current.containerTop + scrollContainerEl.scrollTop) - LAYOUT_CONSTANTS.HEADER_OFFSET;

      const virtualItems = rowVirtualizer.getVirtualItems();
      let newIndex = localResources.length - 1;
      const found = virtualItems.find(item => gridY >= item.start && gridY <= (item.start + item.size));
      if (found) newIndex = found.index;

      newIndex = Math.max(0, Math.min(localResources.length - 1, newIndex));
      if (newIndex !== rowDrag.currentIndex) {
        const reordered = [...localResources];
        const [draggedItem] = reordered.splice(rowDrag.currentIndex, 1);
        reordered.splice(newIndex, 0, draggedItem);
        setLocalResources(reordered);
        setRowDrag({ resourceId: rowDrag.resourceId, startY: e.clientY, currentIndex: newIndex });
      }
    } else if (activeModeRef.current === 'SELECTING_SLOT' && selection) {
      const slotIdx = Math.max(0, Math.min(totalSlots, Math.floor((e.clientX - metricsRef.current.gridLeft + gridEl.scrollLeft) / activeSlotWidthRef.current)));
      if (lastInteractionRef.current?.slot === slotIdx) return;
      lastInteractionRef.current = { slot: slotIdx };
      setSelection(prev => prev ? { ...prev, currentSlot: slotIdx } : null);
    }
  }, [interaction, rowDrag, selection, localResources, totalSlots, rowVirtualizer, canChangeRows]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (activeModeRef.current === 'DRAGGING_CARD') {
      if (interaction && dropIndicator) {
        const finalEvent = localEvents.find(evt => evt.id === interaction.eventId);
        if (finalEvent) {
          const updatedEvent = {
            ...finalEvent,
            resourceId: dropIndicator.resourceId,
            startTime: slotToDate(dropIndicator.startCol, currentDate, dayStartHour, slotsPerHour),
            endTime: slotToDate(dropIndicator.endCol, currentDate, dayStartHour, slotsPerHour)
          };
          setLocalEvents(prev => prev.map(evt => evt.id === interaction.eventId ? updatedEvent : evt));
          if (onEventChange) onEventChange(updatedEvent);
        }
      }
      if (draggedElementRef.current) draggedElementRef.current.style.transform = 'translate3d(0, 0, 0)';
      setInteraction(null);
      setDropIndicator(null);
    } else if (activeModeRef.current === 'RESIZING_CARD') {
      if (interaction && resizeIndicator) {
        const finalEvent = localEvents.find(evt => evt.id === interaction.eventId);
        if (finalEvent) {
          const updatedEvent = {
            ...finalEvent,
            startTime: slotToDate(resizeIndicator.startCol, currentDate, dayStartHour, slotsPerHour),
            endTime: slotToDate(resizeIndicator.endCol, currentDate, dayStartHour, slotsPerHour)
          };
          setLocalEvents(prev => prev.map(evt => evt.id === interaction.eventId ? updatedEvent : evt));
          if (onEventChange) onEventChange(updatedEvent);
        }
      }
      setInteraction(null);
      setResizeIndicator(null);
    } else if (activeModeRef.current === 'DRAGGING_ROW') {
      if (onResourcesReorder) onResourcesReorder(localResources);
      setRowDrag(null);
    } else if (activeModeRef.current === 'SELECTING_SLOT' && selection) {
      const dx = Math.abs(e.clientX - pointerStartPosRef.current.x);
      const dy = Math.abs(e.clientY - pointerStartPosRef.current.y);

      if (dx > 5 || dy > 5) {
        const start = Math.min(selection.startSlot, selection.currentSlot);
        const end = Math.max(selection.startSlot, selection.currentSlot);
        const finalEnd = start === end ? start + 1 : end;

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
  }, [interaction, dropIndicator, resizeIndicator, localEvents, localResources, currentDate, dayStartHour, slotsPerHour, onEventChange, onResourcesReorder, selection, checkAndSyncProps]);

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
    setCurrentDate(new Date('2026-06-18'));
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
      <div
        ref={setScrollContainerRefs}
        className="flex-1 min-h-0 flex relative overflow-y-auto overflow-x-hidden select-none"
        onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}
      >
        <ResourceSidebar
          resources={localResources}
          virtualRows={rowVirtualizer.getVirtualItems()}
          totalSize={rowVirtualizer.getTotalSize()}
          rowDragResourceId={rowDrag?.resourceId}
          startRowDrag={startRowDrag}
          renderResource={renderResource}
        />
        <TimelineGrid
          gridRef={gridRef}
          virtualRows={rowVirtualizer.getVirtualItems()}
          totalSize={rowVirtualizer.getTotalSize()}
          isPanning={isPanning}
          draggedElementRef={draggedElementRef}
          dropIndicator={dropIndicator}
          resizeIndicator={resizeIndicator}
          onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUpOrLeave={handleMouseUpOrLeave}
          totalWidth={totalWidth} hours={hours} totalHours={totalHours} formatHourLabel={formatHourLabel}
          resources={localResources} rowDragResourceId={rowDrag?.resourceId} selection={selection}
          totalSlots={totalSlots} dayStartHour={dayStartHour} slotsPerHour={slotsPerHour} getEventGridSpan={getEventGridSpan}
          startCardDrag={startCardDrag} startCardResize={startCardResize} handleRowPointerDown={handleRowPointerDown}
          renderEvent={renderEvent} interactionEventId={interaction?.eventId}
          rowHeights={layoutEngine.rowHeights} eventLanes={layoutEngine.eventLanes} eventsByResource={layoutEngine.eventsByResource}
        />
      </div>
      <JobCreationDialog
        isOpen={showJobCreationModal} onClose={() => { setShowJobCreationModal(false); setNewEventData(null); }}
        newEventData={newEventData} onChange={setNewEventData} onSave={handleSaveJob} resources={localResources}
      />
    </div>
  );
};
