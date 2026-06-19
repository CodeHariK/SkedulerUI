import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import type { Resource, EventItem } from './types';
import { TimelineControlsHeader } from './TimelineControlsHeader';
import { ResourceSidebar } from './ResourceSidebar';
import { TimelineGrid } from './TimelineGrid';
import { JobCreationDialog } from './JobCreationDialog';

// --- Pure Helper Functions Extracted Outside ---
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

// FIXED: Added ID tie-breaker to prevent unstable sorting boundary loops
const calculateRowHeights = (
  resources: Resource[],
  events: EventItem[],
  baseHeight = 140,
  cardHeight = 95
): Record<string, number> => {
  const heights: Record<string, number> = {};

  resources.forEach(resource => {
    const resourceEvents = events
      .filter(e => e.resourceId === resource.id)
      .sort((a, b) => {
        const diff = a.startTime.getTime() - b.startTime.getTime();
        return diff !== 0 ? diff : a.id.localeCompare(b.id); // Tie-breaker!
      });

    if (resourceEvents.length === 0) {
      heights[resource.id] = baseHeight;
      return;
    }

    const lanes: number[] = [];

    resourceEvents.forEach(event => {
      let placed = false;
      for (let i = 0; i < lanes.length; i++) {
        if (lanes[i] <= event.startTime.getTime()) {
          lanes[i] = event.endTime.getTime();
          placed = true;
          break;
        }
      }
      if (!placed) {
        lanes.push(event.endTime.getTime());
      }
    });

    const requiredHeight = Math.max(baseHeight, lanes.length * cardHeight + 30);
    heights[resource.id] = requiredHeight;
  });

  return heights;
};

export interface ResourceSchedulerProps {
  resources: Resource[];
  events: EventItem[];
  dayStartHour?: number;
  dayEndHour?: number;
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
  renderResource,
  renderEvent,
  onEventChange,
  onEventAdd,
  onResourcesReorder
}) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const lastInteractionRef = useRef<{ slot: number; resourceId?: string } | null>(null);

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
    startColStart: number;
    startColEnd: number;
    startResourceId: string;
    resizeDirection?: 'left' | 'right';
  } | null>(null);

  const [rowDrag, setRowDrag] = useState<{
    resourceId: string;
    startY: number;
    currentIndex: number;
  } | null>(null);

  const [selection, setSelection] = useState<{
    resourceId: string;
    startSlot: number;
    currentSlot: number;
  } | null>(null);

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

  const rowHeights = useMemo(() => {
    return calculateRowHeights(localResources, localEvents);
  }, [localResources, localEvents]);

  const formatHourLabel = useCallback((hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour} ${period}`;
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (interaction || rowDrag || selection || !gridRef.current) return;
    setIsPanning(true);
    setStartX(e.pageX - gridRef.current.offsetLeft);
    setScrollLeft(gridRef.current.scrollLeft);
  }, [interaction, rowDrag, selection]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning || interaction || rowDrag || selection || !gridRef.current) return;
    e.preventDefault();
    const walk = ((e.pageX - gridRef.current.offsetLeft) - startX) * 1.5;
    gridRef.current.scrollLeft = scrollLeft - walk;
  }, [isPanning, interaction, rowDrag, selection, startX, scrollLeft]);

  const handleMouseUpOrLeave = useCallback(() => setIsPanning(false), []);

  const startCardDrag = useCallback((e: React.PointerEvent, eventId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const event = localEvents.find(evt => evt.id === eventId);
    if (!event) return;

    const { gridColumnStart, gridColumnEnd } = getEventGridSpan(event.startTime, event.endTime, dayStartHour, totalHours, slotsPerHour);
    lastInteractionRef.current = { slot: gridColumnStart - 1, resourceId: event.resourceId };

    setInteraction({
      eventId, type: 'move', startX: e.clientX, startY: e.clientY,
      startColStart: gridColumnStart - 1, startColEnd: gridColumnEnd - 1, startResourceId: event.resourceId
    });
  }, [localEvents, dayStartHour, totalHours, slotsPerHour]);

  const startCardResize = useCallback((e: React.PointerEvent, eventId: string, direction: 'left' | 'right') => {
    e.preventDefault();
    e.stopPropagation();
    const event = localEvents.find(evt => evt.id === eventId);
    if (!event) return;

    const { gridColumnStart, gridColumnEnd } = getEventGridSpan(event.startTime, event.endTime, dayStartHour, totalHours, slotsPerHour);
    lastInteractionRef.current = { slot: direction === 'left' ? gridColumnStart - 1 : gridColumnEnd - 1 };

    setInteraction({
      eventId, type: 'resize', startX: e.clientX, startY: e.clientY,
      startColStart: gridColumnStart - 1, startColEnd: gridColumnEnd - 1,
      startResourceId: event.resourceId, resizeDirection: direction
    });
  }, [localEvents, dayStartHour, totalHours, slotsPerHour]);

  const handleRowPointerDown = useCallback((e: React.PointerEvent, resourceId: string) => {
    if (e.target !== e.currentTarget || !gridRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const gridRect = gridRef.current.getBoundingClientRect();
    const slotIdx = Math.max(0, Math.floor((e.clientX - gridRect.left + gridRef.current.scrollLeft) / slotWidth));

    setSelection({ resourceId, startSlot: slotIdx, currentSlot: slotIdx });
    lastInteractionRef.current = { slot: slotIdx };
  }, [slotWidth]);

  const startRowDrag = useCallback((e: React.PointerEvent, resourceId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const idx = localResources.findIndex(r => r.id === resourceId);
    if (idx !== -1) setRowDrag({ resourceId, startY: e.clientY, currentIndex: idx });
  }, [localResources]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const gridEl = gridRef.current;
    if (!gridEl) return;

    if (interaction) {
      const gridRect = gridEl.getBoundingClientRect();

      if (interaction.type === 'resize') {
        const currentSlot = Math.max(0, Math.floor((e.clientX - gridRect.left + gridEl.scrollLeft) / slotWidth));
        if (lastInteractionRef.current?.slot === currentSlot) return;
        lastInteractionRef.current = { slot: currentSlot };

        if (interaction.resizeDirection === 'left') {
          const newStartSlot = Math.max(0, Math.min(interaction.startColEnd - 1, currentSlot));
          setLocalEvents(prev => prev.map(evt => evt.id === interaction.eventId ? { ...evt, startTime: slotToDate(newStartSlot, currentDate, dayStartHour, slotsPerHour) } : evt));
        } else {
          const newEndSlot = Math.max(interaction.startColStart + 1, Math.min(totalSlots, currentSlot));
          setLocalEvents(prev => prev.map(evt => evt.id === interaction.eventId ? { ...evt, endTime: slotToDate(newEndSlot, currentDate, dayStartHour, slotsPerHour) } : evt));
        }
      } else if (interaction.type === 'move') {
        const gridY = (e.clientY - gridRect.top + gridEl.scrollTop) - 56;
        let accumulatedHeight = 0;
        let targetRowIdx = localResources.length - 1;

        for (let i = 0; i < localResources.length; i++) {
          accumulatedHeight += rowHeights[localResources[i].id] || 140;
          if (gridY <= accumulatedHeight) { targetRowIdx = i; break; }
        }

        targetRowIdx = Math.max(0, Math.min(localResources.length - 1, targetRowIdx));
        const targetResource = localResources[targetRowIdx];

        const deltaSlots = Math.round((e.clientX - interaction.startX) / slotWidth);
        const durationSlots = interaction.startColEnd - interaction.startColStart;
        const newStartSlot = Math.max(0, Math.min(totalSlots - durationSlots, interaction.startColStart + deltaSlots));

        if (lastInteractionRef.current?.slot === newStartSlot && lastInteractionRef.current?.resourceId === targetResource.id) return;
        lastInteractionRef.current = { slot: newStartSlot, resourceId: targetResource.id };

        const newEndSlot = newStartSlot + durationSlots;

        setLocalEvents(prev => prev.map(evt => evt.id === interaction.eventId ? {
          ...evt, resourceId: targetResource.id,
          startTime: slotToDate(newStartSlot, currentDate, dayStartHour, slotsPerHour),
          endTime: slotToDate(newEndSlot, currentDate, dayStartHour, slotsPerHour)
        } : evt));
      }
    } else if (rowDrag) {
      const gridRect = gridEl.getBoundingClientRect();
      const gridY = (e.clientY - gridRect.top + gridEl.scrollTop) - 56;
      let accumulatedHeight = 0;
      let newIndex = localResources.length - 1;

      for (let i = 0; i < localResources.length; i++) {
        accumulatedHeight += rowHeights[localResources[i].id] || 140;
        if (gridY <= accumulatedHeight) { newIndex = i; break; }
      }

      newIndex = Math.max(0, Math.min(localResources.length - 1, newIndex));
      if (newIndex !== rowDrag.currentIndex) {
        const reordered = [...localResources];
        const [draggedItem] = reordered.splice(rowDrag.currentIndex, 1);
        reordered.splice(newIndex, 0, draggedItem);
        setLocalResources(reordered);
        setRowDrag({ resourceId: rowDrag.resourceId, startY: e.clientY, currentIndex: newIndex });
      }
    } else if (selection) {
      // FIXED: Swapped gridRef.current for gridEl
      const slotIdx = Math.max(0, Math.min(totalSlots, Math.floor((e.clientX - gridEl.getBoundingClientRect().left + gridEl.scrollLeft) / slotWidth)));
      if (lastInteractionRef.current?.slot === slotIdx) return;
      lastInteractionRef.current = { slot: slotIdx };
      setSelection(prev => prev ? { ...prev, currentSlot: slotIdx } : null);
    }
  }, [interaction, rowDrag, selection, localResources, slotWidth, totalSlots, currentDate, dayStartHour, slotsPerHour, rowHeights]);

  const handlePointerUp = useCallback(() => {
    if (interaction) {
      const finalEvent = localEvents.find(evt => evt.id === interaction.eventId);
      if (finalEvent && onEventChange) onEventChange(finalEvent);
      setInteraction(null);
    } else if (rowDrag) {
      if (onResourcesReorder) onResourcesReorder(localResources);
      setRowDrag(null);
    } else if (selection) {
      const start = Math.min(selection.startSlot, selection.currentSlot);
      const end = Math.max(selection.startSlot, selection.currentSlot);
      const finalEnd = start === end ? start + 4 : end;

      setNewEventData({
        resourceId: selection.resourceId,
        startTime: slotToDate(start, currentDate, dayStartHour, slotsPerHour),
        endTime: slotToDate(finalEnd, currentDate, dayStartHour, slotsPerHour),
        title: 'New Job', location: '', price: 150, status: 'New'
      });
      setShowJobCreationModal(true);
      setSelection(null);
    }
    lastInteractionRef.current = null;
  }, [interaction, rowDrag, selection, localEvents, localResources, currentDate, dayStartHour, slotsPerHour, onEventChange, onResourcesReorder]);

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
      <div className="flex-1 min-h-0 flex relative overflow-y-auto select-none" onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
        <ResourceSidebar
          resources={localResources} rowHeights={rowHeights}
          rowDragResourceId={rowDrag?.resourceId} startRowDrag={startRowDrag} renderResource={renderResource}
        />
        <TimelineGrid
          gridRef={gridRef} rowHeights={rowHeights} isPanning={isPanning}
          onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUpOrLeave={handleMouseUpOrLeave}
          totalWidth={totalWidth} hours={hours} totalHours={totalHours} formatHourLabel={formatHourLabel}
          resources={localResources} events={localEvents} rowDragResourceId={rowDrag?.resourceId} selection={selection}
          totalSlots={totalSlots} dayStartHour={dayStartHour} slotsPerHour={slotsPerHour}
          getEventGridSpan={getEventGridSpan} startCardDrag={startCardDrag} startCardResize={startCardResize}
          handleRowPointerDown={handleRowPointerDown} renderEvent={renderEvent} interactionEventId={interaction?.eventId}
        />
      </div>
      <JobCreationDialog
        isOpen={showJobCreationModal} onClose={() => { setShowJobCreationModal(false); setNewEventData(null); }}
        newEventData={newEventData} onChange={setNewEventData} onSave={handleSaveJob} resources={localResources}
      />
    </div>
  );
};
