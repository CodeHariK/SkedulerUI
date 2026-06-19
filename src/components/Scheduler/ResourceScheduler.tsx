import React, { useRef, useState, useEffect } from 'react';
import type { Resource, EventItem } from './types';
import { TimelineControlsHeader } from './TimelineControlsHeader';
import { ResourceSidebar } from './ResourceSidebar';
import { TimelineGrid } from './TimelineGrid';
import { JobCreationDialog } from './JobCreationDialog';

export interface ResourceSchedulerProps {
  resources: Resource[];
  events: EventItem[];
  dayStartHour?: number; // e.g. 6 for 6 AM
  dayEndHour?: number;   // e.g. 20 for 8 PM
  renderResource?: (resource: Resource, onGripMouseDown?: (e: React.PointerEvent) => void) => React.ReactNode;
  renderEvent?: (event: EventItem, onDragStart?: (e: React.PointerEvent) => void, onResizeStart?: (e: React.PointerEvent) => void) => React.ReactNode;
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

  // Local states to support instant visual feedback
  const [localResources, setLocalResources] = useState<Resource[]>(resources);
  const [localEvents, setLocalEvents] = useState<EventItem[]>(events);

  // Timeline controls states matching Figma layout
  const [currentDate, setCurrentDate] = useState<Date>(new Date('2026-06-18'));
  const [zoomMinutes, setZoomMinutes] = useState<number>(60);
  const [isMapViewActive, setIsMapViewActive] = useState<boolean>(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Drag and pan timeline state
  const [isPanning, setIsPanning] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Active event move/resize state
  const [interaction, setInteraction] = useState<{
    eventId: string;
    type: 'move' | 'resize';
    startX: number;
    startY: number;
    startColStart: number;
    startColEnd: number;
    startResourceId: string;
  } | null>(null);

  // Active row drag reordering state
  const [rowDrag, setRowDrag] = useState<{
    resourceId: string;
    startY: number;
    currentIndex: number;
  } | null>(null);

  // Active empty-cell drag timeline selection state
  const [selection, setSelection] = useState<{
    resourceId: string;
    startSlot: number;
    currentSlot: number;
  } | null>(null);

  // Add Job Modal Dialog States
  const [showModal, setShowModal] = useState(false);
  const [newEventData, setNewEventData] = useState<{
    resourceId: string;
    startTime: Date;
    endTime: Date;
    title: string;
    location: string;
    price: number;
    status: 'Ongoing' | 'New' | 'Completed' | 'Cancelled';
  } | null>(null);

  useEffect(() => {
    setLocalResources(resources);
  }, [resources]);

  useEffect(() => {
    setLocalEvents(events);
  }, [events]);

  // Time calculations
  const totalHours = dayEndHour - dayStartHour;
  const slotsPerHour = 4; // 15-minute slots
  const totalSlots = totalHours * slotsPerHour;

  // Zoom scaling mapping zoomMinutes to hour width (px)
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
  const hourWidth = getHourWidth(zoomMinutes);
  const totalWidth = totalHours * hourWidth;
  const slotWidth = totalWidth / totalSlots;

  // Generate array of hours for header
  const hours = Array.from({ length: totalHours }, (_, i) => dayStartHour + i);

  const formatHourLabel = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour} ${period}`;
  };

  // Helper to calculate grid columns for an event
  const getEventGridSpan = (start: Date, end: Date) => {
    const startHourObj = start.getHours() + start.getMinutes() / 60;
    const endHourObj = end.getHours() + end.getMinutes() / 60;

    const relativeStart = Math.max(0, startHourObj - dayStartHour);
    const relativeEnd = Math.min(totalHours, endHourObj - dayStartHour);

    const startSlot = Math.round(relativeStart * slotsPerHour);
    const endSlot = Math.round(relativeEnd * slotsPerHour);

    return {
      gridColumnStart: startSlot + 1,
      gridColumnEnd: endSlot + 1
    };
  };

  // Helper to convert grid slot index back to Date object
  const slotToDate = (slot: number) => {
    const date = new Date(currentDate);
    const hoursDecimal = dayStartHour + slot / slotsPerHour;
    const hours = Math.floor(hoursDecimal);
    const minutes = Math.round((hoursDecimal - hours) * 60);
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  // Pan scroll handlers (only runs when not dragging/resizing a card, row, or selecting)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (interaction || rowDrag || selection || !gridRef.current) return;
    setIsPanning(true);
    setStartX(e.pageX - gridRef.current.offsetLeft);
    setScrollLeft(gridRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || interaction || rowDrag || selection || !gridRef.current) return;
    e.preventDefault();
    const x = e.pageX - gridRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    gridRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUpOrLeave = () => {
    setIsPanning(false);
  };

  // Card Pointer Events for dragging & resizing
  const startCardDrag = (e: React.PointerEvent, eventId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const event = localEvents.find(evt => evt.id === eventId);
    if (!event) return;

    const { gridColumnStart, gridColumnEnd } = getEventGridSpan(event.startTime, event.endTime);

    setInteraction({
      eventId,
      type: 'move',
      startX: e.clientX,
      startY: e.clientY,
      startColStart: gridColumnStart - 1,
      startColEnd: gridColumnEnd - 1,
      startResourceId: event.resourceId
    });
  };

  const startCardResize = (e: React.PointerEvent, eventId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const event = localEvents.find(evt => evt.id === eventId);
    if (!event) return;

    const { gridColumnStart, gridColumnEnd } = getEventGridSpan(event.startTime, event.endTime);

    setInteraction({
      eventId,
      type: 'resize',
      startX: e.clientX,
      startY: e.clientY,
      startColStart: gridColumnStart - 1,
      startColEnd: gridColumnEnd - 1,
      startResourceId: event.resourceId
    });
  };

  // Empty Row drag selection handler
  const handleRowPointerDown = (e: React.PointerEvent, resourceId: string) => {
    if (e.target !== e.currentTarget) return;
    e.preventDefault();
    e.stopPropagation();

    const gridEl = gridRef.current;
    if (!gridEl) return;

    const gridRect = gridEl.getBoundingClientRect();
    const clientXRelative = e.clientX - gridRect.left + gridEl.scrollLeft;
    const slotIdx = Math.max(0, Math.floor(clientXRelative / slotWidth));

    setSelection({
      resourceId,
      startSlot: slotIdx,
      currentSlot: slotIdx
    });
  };

  // Row Pointer Events for reordering rows
  const startRowDrag = (e: React.PointerEvent, resourceId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const idx = localResources.findIndex(r => r.id === resourceId);
    if (idx === -1) return;

    setRowDrag({
      resourceId,
      startY: e.clientY,
      currentIndex: idx
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (interaction) {
      const gridEl = gridRef.current;
      if (!gridEl) return;

      const gridRect = gridEl.getBoundingClientRect();

      if (interaction.type === 'resize') {
        const clientXRelative = e.clientX - gridRect.left + gridEl.scrollLeft;
        const currentSlot = Math.max(0, Math.floor(clientXRelative / slotWidth));
        const newEndSlot = Math.max(interaction.startColStart + 1, Math.min(totalSlots, currentSlot));

        setLocalEvents(prev => prev.map(evt => {
          if (evt.id === interaction.eventId) {
            return { ...evt, endTime: slotToDate(newEndSlot) };
          }
          return evt;
        }));
      } else if (interaction.type === 'move') {
        const containerRect = gridEl.getBoundingClientRect();
        const relativeY = e.clientY - containerRect.top + gridEl.scrollTop;
        const gridY = relativeY - 56;
        const rowIdx = Math.max(0, Math.min(localResources.length - 1, Math.floor(gridY / 140)));
        const targetResource = localResources[rowIdx];

        const deltaX = e.clientX - interaction.startX;
        const deltaSlots = Math.round(deltaX / slotWidth);
        const durationSlots = interaction.startColEnd - interaction.startColStart;
        const newStartSlot = Math.max(0, Math.min(totalSlots - durationSlots, interaction.startColStart + deltaSlots));
        const newEndSlot = newStartSlot + durationSlots;

        setLocalEvents(prev => prev.map(evt => {
          if (evt.id === interaction.eventId) {
            return {
              ...evt,
              resourceId: targetResource.id,
              startTime: slotToDate(newStartSlot),
              endTime: slotToDate(newEndSlot)
            };
          }
          return evt;
        }));
      }
    } else if (rowDrag) {
      const deltaY = e.clientY - rowDrag.startY;
      const indexShift = Math.round(deltaY / 140);

      if (indexShift !== 0) {
        const newIndex = Math.max(0, Math.min(localResources.length - 1, rowDrag.currentIndex + indexShift));
        if (newIndex !== rowDrag.currentIndex) {
          const reordered = [...localResources];
          const [draggedItem] = reordered.splice(rowDrag.currentIndex, 1);
          reordered.splice(newIndex, 0, draggedItem);

          setLocalResources(reordered);
          setRowDrag({
            resourceId: rowDrag.resourceId,
            startY: e.clientY,
            currentIndex: newIndex
          });
        }
      }
    } else if (selection) {
      const gridEl = gridRef.current;
      if (!gridEl) return;

      const gridRect = gridEl.getBoundingClientRect();
      const clientXRelative = e.clientX - gridRect.left + gridEl.scrollLeft;
      const slotIdx = Math.max(0, Math.min(totalSlots, Math.floor(clientXRelative / slotWidth)));

      setSelection(prev => prev ? { ...prev, currentSlot: slotIdx } : null);
    }
  };

  const handlePointerUp = () => {
    if (interaction) {
      const finalEvent = localEvents.find(evt => evt.id === interaction.eventId);
      if (finalEvent && onEventChange) {
        onEventChange(finalEvent);
      }
      setInteraction(null);
    } else if (rowDrag) {
      if (onResourcesReorder) {
        onResourcesReorder(localResources);
      }
      setRowDrag(null);
    } else if (selection) {
      const start = Math.min(selection.startSlot, selection.currentSlot);
      const end = Math.max(selection.startSlot, selection.currentSlot);
      const finalEnd = start === end ? start + 4 : end;

      setNewEventData({
        resourceId: selection.resourceId,
        startTime: slotToDate(start),
        endTime: slotToDate(finalEnd),
        title: 'New Job',
        location: '',
        price: 150,
        status: 'New'
      });
      setShowModal(true);
      setSelection(null);
    }
  };

  const handleCreateJobHeader = () => {
    setNewEventData({
      resourceId: localResources[0]?.id || '',
      startTime: slotToDate(0),
      endTime: slotToDate(4),
      title: '',
      location: '',
      price: 150,
      status: 'New'
    });
    setShowModal(true);
  };

  const handleReset = () => {
    setCurrentDate(new Date('2026-06-18'));
    setZoomMinutes(60);
    setLocalResources(resources);
    setLocalEvents(events);
  };

  const handleThemeToggle = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <div className="flex flex-col w-full h-full flex-1 bg-background overflow-hidden relative transition-colors duration-200">
      {/* Top Controls / Navigation */}
      <TimelineControlsHeader
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        zoomMinutes={zoomMinutes}
        onZoomChange={setZoomMinutes}
        onReset={handleReset}
        onCreateJob={handleCreateJobHeader}
        isMapViewActive={isMapViewActive}
        onMapViewToggle={() => setIsMapViewActive(!isMapViewActive)}
        theme={theme}
        onThemeToggle={handleThemeToggle}
      />

      {/* Timeline Grid & Sidebar wrapper */}
      <div
        className="flex-1 min-h-0 flex relative overflow-y-auto select-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <ResourceSidebar
          resources={localResources}
          rowDragResourceId={rowDrag?.resourceId}
          startRowDrag={startRowDrag}
          renderResource={renderResource}
        />

        <TimelineGrid
          gridRef={gridRef}
          isPanning={isPanning}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUpOrLeave={handleMouseUpOrLeave}
          totalWidth={totalWidth}
          hours={hours}
          totalHours={totalHours}
          formatHourLabel={formatHourLabel}
          resources={localResources}
          events={localEvents}
          rowDragResourceId={rowDrag?.resourceId}
          selection={selection}
          totalSlots={totalSlots}
          getEventGridSpan={getEventGridSpan}
          startCardDrag={startCardDrag}
          startCardResize={startCardResize}
          handleRowPointerDown={handleRowPointerDown}
          renderEvent={renderEvent}
          interactionEventId={interaction?.eventId}
        />
      </div>

      <JobCreationDialog
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setNewEventData(null);
        }}
        newEventData={newEventData}
        onChange={setNewEventData}
        onSave={() => {
          if (newEventData) {
            const newlyCreatedEvent: EventItem = {
              id: `job-created-${Date.now()}`,
              resourceId: newEventData.resourceId,
              title: newEventData.title || 'New Job',
              startTime: newEventData.startTime,
              endTime: newEventData.endTime,
              status: newEventData.status,
              metadata: {
                location: newEventData.location,
                price: newEventData.price
              }
            };
            setLocalEvents(prev => [...prev, newlyCreatedEvent]);
            if (onEventAdd) {
              onEventAdd(newlyCreatedEvent);
            }
          }
          setShowModal(false);
          setNewEventData(null);
        }}
        resources={localResources}
      />
    </div>
  );
};
