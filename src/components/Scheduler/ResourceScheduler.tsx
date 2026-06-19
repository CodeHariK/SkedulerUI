import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import type { Resource, EventItem } from './types';
import { TimelineControlsHeader } from './TimelineControlsHeader';
import { ResourceSidebar } from './ResourceSidebar';
import { TimelineGrid } from './TimelineGrid';
import { JobCreationDialog } from './JobCreationDialog';
import { useVirtualizer } from '@tanstack/react-virtual';

const getHourWidth = (zoom: number) => {
  switch (zoom) {
    case 15: return 240;
    case 30: return 180;
    case 45: return 140;
    case 60: return 100;
    case 90: return 80;
    case 120: return 60;
    default: return 100;
  }
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

const slotToDate = (slot: number, currentDate: Date, dayStartHour: number, slotsPerHour: number) => {
  const date = new Date(currentDate);
  const hoursDecimal = dayStartHour + slot / slotsPerHour;
  const hours = Math.floor(hoursDecimal);
  const minutes = Math.round((hoursDecimal - hours) * 60);
  date.setHours(hours, minutes, 0, 0);
  return date;
};

export interface ResourceSchedulerProps {
  resources: Resource[];
  events: EventItem[];
  dayStartHour?: number;
  dayEndHour?: number;
  canChangeRows?: boolean;
  renderResource?: (resource: Resource, onGripMouseDown?: (e: React.PointerEvent) => void) => React.ReactNode;
  renderEvent?: (
    event: EventItem,
    onDragStart?: (e: React.PointerEvent) => void,
    onResizeStart?: (e: React.PointerEvent, direction: 'left' | 'right') => void
  ) => React.ReactNode;
  onEventChange?: (event: EventItem) => void;
  onEventAdd?: (event: EventItem) => void;
  onResourcesReorder?: (resources: Resource[]) => void;
}

export const ResourceScheduler: React.FC<ResourceSchedulerProps> = ({
  resources,
  events,
  dayStartHour = 6,
  dayEndHour = 20,
  canChangeRows = true,
  renderResource,
  renderEvent,
  onEventChange,
  onEventAdd,
  onResourcesReorder
}) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null);
  const [virtualVersion, setVirtualVersion] = useState(0);

  const lastInteractionRef = useRef<{ slot: number; resourceId?: string } | null>(null);

  // FIXED: A State Machine ref to strictly lock the current pointer interaction type.
  const activeModeRef = useRef<'NONE' | 'PANNING' | 'DRAGGING_CARD' | 'RESIZING_CARD' | 'DRAGGING_ROW' | 'SELECTING_SLOT'>('NONE');
  const pointerStartPosRef = useRef({ x: 0, y: 0 });

  const [localResources, setLocalResources] = useState<Resource[]>(resources);
  const [localEvents, setLocalEvents] = useState<EventItem[]>(events);

  const [currentDate, setCurrentDate] = useState<Date>(new Date('2026-06-18'));
  const [zoomMinutes, setZoomMinutes] = useState<number>(60);
  const [isMapViewActive, setIsMapViewActive] = useState<boolean>(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const [isPanning, setIsPanning] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const [interaction, setInteraction] = useState<{
    eventId: string;
    type: 'move' | 'resize';
    startX: number;
    startY: number;
    startScrollLeft: number;
    startScrollTop: number;
    startColStart: number;
    startColEnd: number;
    startResourceId: string;
    resizeDirection?: 'left' | 'right';
  } | null>(null);

  const [dragPosition, setDragPosition] = useState<{ x: number, y: number } | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{ resourceId: string; startCol: number; endCol: number; } | null>(null);

  const [rowDrag, setRowDrag] = useState<{ resourceId: string; startY: number; currentIndex: number; } | null>(null);
  const [selection, setSelection] = useState<{ resourceId: string; startSlot: number; currentSlot: number; } | null>(null);

  const [showJobCreationModal, setShowJobCreationModal] = useState(false);
  const [newEventData, setNewEventData] = useState<any>(null);

  useEffect(() => { setLocalResources(resources); }, [resources]);
  useEffect(() => { setLocalEvents(events); }, [events]);

  const slotsPerHour = 4;
  const totalHours = useMemo(() => dayEndHour - dayStartHour, [dayEndHour, dayStartHour]);
  const totalSlots = useMemo(() => totalHours * slotsPerHour, [totalHours]);
  const hourWidth = useMemo(() => getHourWidth(zoomMinutes), [zoomMinutes]);
  const totalWidth = useMemo(() => totalHours * hourWidth, [totalHours, hourWidth]);
  const slotWidth = useMemo(() => totalWidth / totalSlots, [totalWidth, totalSlots]);
  const hours = useMemo(() => Array.from({ length: totalHours }, (_, i) => dayStartHour + i), [totalHours, dayStartHour]);

  const layoutEngine = useMemo(() => {
    const rowHeights: Record<string, number> = {};
    const eventLanes: Record<string, number> = {};
    const eventsByResource: Record<string, EventItem[]> = {};

    localResources.forEach(r => {
      eventsByResource[r.id] = [];
      rowHeights[r.id] = 140;
    });

    localEvents.forEach(e => {
      if (eventsByResource[e.resourceId]) eventsByResource[e.resourceId].push(e);
    });

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
        if (!placed) {
          lanes.push(event.endTime.getTime());
          eventLanes[event.id] = lanes.length;
        }
      });

      rowHeights[resource.id] = Math.max(140, lanes.length * 95 + 30);
    });

    return { rowHeights, eventLanes, eventsByResource };
  }, [localResources, localEvents]);

  const estimateSize = useCallback((index: number) => {
    const resource = localResources[index];
    if (!resource) return 140;
    return layoutEngine.rowHeights[resource.id] || 140;
  }, [localResources, layoutEngine.rowHeights]);

  const rowVirtualizer = useVirtualizer({
    count: localResources.length,
    getScrollElement: () => scrollElement,
    estimateSize,
    overscan: 5,
    initialRect: { width: 1200, height: 800 },
    onChange: () => { setVirtualVersion(v => v + 1); }
  });

  useEffect(() => {
    rowVirtualizer.measure();
  }, [layoutEngine.rowHeights, rowVirtualizer]);

  const formatHourLabel = useCallback((hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour} ${period}`;
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
    if (activeModeRef.current === 'PANNING') {
      setIsPanning(false);
      activeModeRef.current = 'NONE';
    }
  }, []);

  const startCardDrag = useCallback((e: React.PointerEvent, eventId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (activeModeRef.current !== 'NONE') return;
    activeModeRef.current = 'DRAGGING_CARD';

    const event = localEvents.find(evt => evt.id === eventId);
    if (!event) {
      activeModeRef.current = 'NONE';
      return;
    }

    const { gridColumnStart, gridColumnEnd } = getEventGridSpan(event.startTime, event.endTime, dayStartHour, totalHours, slotsPerHour);
    lastInteractionRef.current = { slot: gridColumnStart - 1, resourceId: event.resourceId };

    setInteraction({
      eventId, type: 'move',
      startX: e.clientX, startY: e.clientY,
      startScrollLeft: scrollContainerRef.current?.scrollLeft || 0,
      startScrollTop: scrollContainerRef.current?.scrollTop || 0,
      startColStart: gridColumnStart - 1, startColEnd: gridColumnEnd - 1, startResourceId: event.resourceId
    });

    setDragPosition({ x: 0, y: 0 });
    setDropIndicator({ resourceId: event.resourceId, startCol: gridColumnStart - 1, endCol: gridColumnEnd - 1 });
  }, [localEvents, dayStartHour, totalHours, slotsPerHour]);

  const startCardResize = useCallback((e: React.PointerEvent, eventId: string, direction: 'left' | 'right') => {
    e.preventDefault();
    e.stopPropagation();
    if (activeModeRef.current !== 'NONE') return;
    activeModeRef.current = 'RESIZING_CARD';

    const event = localEvents.find(evt => evt.id === eventId);
    if (!event) {
      activeModeRef.current = 'NONE';
      return;
    }

    const { gridColumnStart, gridColumnEnd } = getEventGridSpan(event.startTime, event.endTime, dayStartHour, totalHours, slotsPerHour);
    lastInteractionRef.current = { slot: direction === 'left' ? gridColumnStart - 1 : gridColumnEnd - 1 };

    setInteraction({
      eventId, type: 'resize',
      startX: e.clientX, startY: e.clientY,
      startScrollLeft: scrollContainerRef.current?.scrollLeft || 0,
      startScrollTop: scrollContainerRef.current?.scrollTop || 0,
      startColStart: gridColumnStart - 1, startColEnd: gridColumnEnd - 1,
      startResourceId: event.resourceId, resizeDirection: direction
    });
  }, [localEvents, dayStartHour, totalHours, slotsPerHour]);

  const handleRowPointerDown = useCallback((e: React.PointerEvent, resourceId: string) => {
    if (e.target !== e.currentTarget || !gridRef.current || activeModeRef.current !== 'NONE') return;
    e.preventDefault();
    e.stopPropagation();

    activeModeRef.current = 'SELECTING_SLOT';
    pointerStartPosRef.current = { x: e.clientX, y: e.clientY };

    const gridRect = gridRef.current.getBoundingClientRect();
    const slotIdx = Math.max(0, Math.floor((e.clientX - gridRect.left + gridRef.current.scrollLeft) / slotWidth));

    setSelection({ resourceId, startSlot: slotIdx, currentSlot: slotIdx });
    lastInteractionRef.current = { slot: slotIdx };
  }, [slotWidth]);

  const startRowDrag = useCallback((e: React.PointerEvent, resourceId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (activeModeRef.current !== 'NONE') return;
    activeModeRef.current = 'DRAGGING_ROW';

    const idx = localResources.findIndex(r => r.id === resourceId);
    if (idx !== -1) setRowDrag({ resourceId, startY: e.clientY, currentIndex: idx });
  }, [localResources]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const gridEl = gridRef.current;
    if (!gridEl) return;

    if (activeModeRef.current === 'RESIZING_CARD' && interaction) {
      const currentSlot = Math.max(0, Math.floor((e.clientX - gridEl.getBoundingClientRect().left + gridEl.scrollLeft) / slotWidth));
      if (lastInteractionRef.current?.slot === currentSlot) return;
      lastInteractionRef.current = { slot: currentSlot };

      if (interaction.resizeDirection === 'left') {
        const newStartSlot = Math.max(0, Math.min(interaction.startColEnd - 1, currentSlot));
        setLocalEvents(prev => prev.map(evt => evt.id === interaction.eventId ? { ...evt, startTime: slotToDate(newStartSlot, currentDate, dayStartHour, slotsPerHour) } : evt));
      } else {
        const newEndSlot = Math.max(interaction.startColStart + 1, Math.min(totalSlots, currentSlot));
        setLocalEvents(prev => prev.map(evt => evt.id === interaction.eventId ? { ...evt, endTime: slotToDate(newEndSlot, currentDate, dayStartHour, slotsPerHour) } : evt));
      }
    } else if (activeModeRef.current === 'DRAGGING_CARD' && interaction) {
      const scrollContainerEl = scrollContainerRef.current;
      const scrollDeltaX = (scrollContainerEl?.scrollLeft || 0) - interaction.startScrollLeft;
      const scrollDeltaY = (scrollContainerEl?.scrollTop || 0) - interaction.startScrollTop;

      setDragPosition({
        x: (e.clientX - interaction.startX) + scrollDeltaX,
        y: (e.clientY - interaction.startY) + scrollDeltaY
      });

      let targetResource: Resource;

      if (canChangeRows && scrollContainerEl) {
        const scrollContainerRect = scrollContainerEl.getBoundingClientRect();
        const gridY = (e.clientY - scrollContainerRect.top + scrollContainerEl.scrollTop) - 56;

        const virtualItems = rowVirtualizer.getVirtualItems();
        let targetRowIdx = localResources.length - 1;
        const found = virtualItems.find(item => {
          const start = item.start;
          const end = start + item.size;
          return gridY >= start && gridY <= end;
        });
        if (found) targetRowIdx = found.index;

        targetRowIdx = Math.max(0, Math.min(localResources.length - 1, targetRowIdx));
        targetResource = localResources[targetRowIdx];
      } else {
        targetResource = localResources.find(r => r.id === interaction.startResourceId) || localResources[0];
      }

      const logicalDeltaX = (e.clientX - interaction.startX) + scrollDeltaX;
      const deltaSlots = Math.round(logicalDeltaX / slotWidth);
      const durationSlots = interaction.startColEnd - interaction.startColStart;
      const newStartSlot = Math.max(0, Math.min(totalSlots - durationSlots, interaction.startColStart + deltaSlots));

      if (lastInteractionRef.current?.slot === newStartSlot && lastInteractionRef.current?.resourceId === targetResource.id) return;
      lastInteractionRef.current = { slot: newStartSlot, resourceId: targetResource.id };

      setDropIndicator({
        resourceId: targetResource.id,
        startCol: newStartSlot,
        endCol: newStartSlot + durationSlots
      });
    } else if (activeModeRef.current === 'DRAGGING_ROW' && rowDrag) {
      const scrollContainerEl = scrollContainerRef.current;
      if (!scrollContainerEl) return;
      const scrollContainerRect = scrollContainerEl.getBoundingClientRect();
      const gridY = (e.clientY - scrollContainerRect.top + scrollContainerEl.scrollTop) - 56;

      const virtualItems = rowVirtualizer.getVirtualItems();
      let newIndex = localResources.length - 1;
      const found = virtualItems.find(item => {
        const start = item.start;
        const end = start + item.size;
        return gridY >= start && gridY <= end;
      });
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
      const slotIdx = Math.max(0, Math.min(totalSlots, Math.floor((e.clientX - gridEl.getBoundingClientRect().left + gridEl.scrollLeft) / slotWidth)));
      if (lastInteractionRef.current?.slot === slotIdx) return;
      lastInteractionRef.current = { slot: slotIdx };
      setSelection(prev => prev ? { ...prev, currentSlot: slotIdx } : null);
    }
  }, [interaction, rowDrag, selection, localResources, slotWidth, totalSlots, currentDate, dayStartHour, slotsPerHour, rowVirtualizer, canChangeRows, layoutEngine]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (activeModeRef.current === 'DRAGGING_CARD' || activeModeRef.current === 'RESIZING_CARD') {
      if (interaction) {
        if (activeModeRef.current === 'DRAGGING_CARD' && dropIndicator) {
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
        } else if (activeModeRef.current === 'RESIZING_CARD') {
          const finalEvent = localEvents.find(evt => evt.id === interaction.eventId);
          if (finalEvent && onEventChange) onEventChange(finalEvent);
        }
      }
      setInteraction(null);
      setDragPosition(null);
      setDropIndicator(null);
    } else if (activeModeRef.current === 'DRAGGING_ROW') {
      if (onResourcesReorder) onResourcesReorder(localResources);
      setRowDrag(null);
    } else if (activeModeRef.current === 'SELECTING_SLOT' && selection) {
      // Enforce that dragging the timeline actually occurred (more than 5px) before opening a modal.
      const dx = Math.abs(e.clientX - pointerStartPosRef.current.x);
      const dy = Math.abs(e.clientY - pointerStartPosRef.current.y);

      if (dx > 5 || dy > 5) {
        const start = Math.min(selection.startSlot, selection.currentSlot);
        const end = Math.max(selection.startSlot, selection.currentSlot);

        // Prevent 0-duration jobs
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

    // Always release lock and cleanup
    activeModeRef.current = 'NONE';
    lastInteractionRef.current = null;
  }, [interaction, dropIndicator, localEvents, localResources, currentDate, dayStartHour, slotsPerHour, onEventChange, onResourcesReorder, selection]);

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

  const handleThemeToggle = useCallback(() => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    nextTheme === 'dark' ? document.documentElement.classList.add('dark') : document.documentElement.classList.remove('dark');
  }, [theme]);

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

  return (
    <div className="flex flex-col w-full h-full flex-1 bg-background overflow-hidden relative transition-colors duration-200">
      <TimelineControlsHeader
        currentDate={currentDate} onDateChange={setCurrentDate}
        zoomMinutes={zoomMinutes} onZoomChange={setZoomMinutes}
        onReset={handleReset} onCreateJob={handleCreateJobHeader}
        isMapViewActive={isMapViewActive} onMapViewToggle={() => setIsMapViewActive(!isMapViewActive)}
        theme={theme} onThemeToggle={handleThemeToggle}
      />
      <div
        ref={(node) => {
          if (node) {
            (scrollContainerRef as any).current = node;
            setScrollElement(node);
          }
        }}
        className="flex-1 min-h-0 flex relative overflow-y-auto overflow-x-hidden select-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp} // Safety fallback if cursor leaves screen while dragging
      >
        <ResourceSidebar
          resources={localResources}
          virtualizer={rowVirtualizer}
          rowDragResourceId={rowDrag?.resourceId}
          startRowDrag={startRowDrag}
          renderResource={renderResource}
          virtualVersion={virtualVersion}
        />
        <TimelineGrid
          gridRef={gridRef}
          virtualizer={rowVirtualizer}
          isPanning={isPanning}
          dragPosition={dragPosition}
          dropIndicator={dropIndicator}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUpOrLeave={handleMouseUpOrLeave}
          totalWidth={totalWidth}
          hours={hours}
          totalHours={totalHours}
          formatHourLabel={formatHourLabel}
          resources={localResources}
          rowDragResourceId={rowDrag?.resourceId}
          selection={selection}
          totalSlots={totalSlots}
          dayStartHour={dayStartHour}
          slotsPerHour={slotsPerHour}
          getEventGridSpan={getEventGridSpan}
          startCardDrag={startCardDrag}
          startCardResize={startCardResize}
          handleRowPointerDown={handleRowPointerDown}
          renderEvent={renderEvent}
          interactionEventId={interaction?.eventId}
          rowHeights={layoutEngine.rowHeights}
          eventLanes={layoutEngine.eventLanes}
          eventsByResource={layoutEngine.eventsByResource}
          virtualVersion={virtualVersion}
        />
      </div>
      <JobCreationDialog
        isOpen={showJobCreationModal} onClose={() => { setShowJobCreationModal(false); setNewEventData(null); }}
        newEventData={newEventData} onChange={setNewEventData} onSave={handleSaveJob} resources={localResources}
      />
    </div>
  );
};
