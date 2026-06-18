import React, { useRef, useState, useEffect } from 'react';
import type { Resource, EventItem, ResourceSchedulerProps } from './types';
import { cn } from '@/lib/utils';
import { Calendar } from 'lucide-react';
import { TimelineControlsHeader } from './TimelineControlsHeader';

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
    const date = new Date(currentDate); // consistent with currentDate
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
    const walk = (x - startX) * 1.5; // Scroll speed multiplier
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
    // If target is inside an event card, let card dragging happen
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
        // Move Resource based on Y offset
        const containerRect = gridEl.getBoundingClientRect();
        const relativeY = e.clientY - containerRect.top + gridEl.scrollTop;
        const gridY = relativeY - 56; // adjust for header height
        const rowIdx = Math.max(0, Math.min(localResources.length - 1, Math.floor(gridY / 140)));
        const targetResource = localResources[rowIdx];

        // Move slots based on X offset
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
      const finalEnd = start === end ? start + 4 : end; // Default 1 hour if just clicked

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

  // Default Resource Renderer (Figma match)
  const defaultRenderResource = (resource: Resource, onGripMouseDown?: (e: React.PointerEvent) => void) => {
    const role = resource.metadata?.role || '';
    const jobsCount = resource.metadata?.jobsCount || 0;
    const isDraggingRow = rowDrag?.resourceId === resource.id;

    return (
      <div 
        className={cn(
          "flex items-center gap-3 h-[140px] px-4 border-b border-border hover:bg-muted/10 transition-colors bg-card relative select-none",
          isDraggingRow && "opacity-50 border-primary/20 bg-primary/5 z-20 shadow-inner"
        )}
      >
        {/* Grip Icon */}
        <div 
          className="text-muted-foreground/40 cursor-grab touch-none p-1.5 hover:text-text-primary rounded hover:bg-muted/50 transition-colors"
          onPointerDown={onGripMouseDown}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8h16M4 16h16" />
          </svg>
        </div>

        {/* Avatar */}
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-secondary text-secondary-foreground font-bold text-sm">
          {resource.avatar || resource.name.slice(0, 2).toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text-primary text-sm truncate">{resource.name}</h3>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[10px] font-bold tracking-wider text-text-tertiary uppercase">{role}</span>
            {jobsCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-text-secondary font-medium">
                <Calendar className="w-3 h-3" />
                {jobsCount} {jobsCount === 1 ? 'Job' : 'Jobs'}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Default Event Card Renderer (Figma match)
  const defaultRenderEvent = (event: EventItem) => {
    const location = event.metadata?.location || '';
    const price = event.metadata?.price || 0;

    const formatTime = (date: Date) => {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const statusColors = {
      Ongoing: 'bg-amber-500/10 border-amber-500/20 text-amber-600',
      New: 'bg-blue-500/10 border-blue-500/20 text-blue-600',
      Completed: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600',
      Cancelled: 'bg-rose-500/10 border-rose-500/20 text-rose-600'
    };

    const isDraggingThis = interaction?.eventId === event.id;

    return (
      <div
        className={cn(
          "flex flex-col justify-between h-[85px] p-3 rounded-lg border bg-card text-left shadow-sm hover:shadow transition-all relative select-none touch-none",
          statusColors[event.status] || 'border-border',
          isDraggingThis && "opacity-60 scale-[1.02] shadow-md border-primary/40 ring-1 ring-primary/20"
        )}
        onPointerDown={(e) => startCardDrag(e, event.id)}
      >
        <div>
          <h4 className="font-semibold text-text-primary text-xs truncate leading-snug">{event.title}</h4>
          {location && (
            <p className="text-[10px] text-text-secondary mt-0.5 truncate flex items-center gap-1">
              <span>{location}</span>
            </p>
          )}
        </div>
        <div className="flex items-center justify-between mt-1 pt-1 border-t border-border/20">
          <span className={cn(
            "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-background/50"
          )}>
            {event.status}
          </span>
          <span className="text-[10px] text-text-primary font-medium pr-3 truncate">
            ${price} • {formatTime(event.startTime)}
          </span>
        </div>

        {/* Resize Handle at Bottom-Right */}
        <div
          className="absolute bottom-1 right-1 cursor-se-resize p-1 z-20 group"
          onPointerDown={(e) => startCardResize(e, event.id)}
        >
          <svg className="w-2.5 h-2.5 text-text-tertiary/40 group-hover:text-primary transition-colors" viewBox="0 0 10 10" fill="currentColor">
            <path d="M10 0 L10 10 L0 10 Z" />
          </svg>
        </div>
      </div>
    );
  };

  const handleCreateJobHeader = () => {
    setNewEventData({
      resourceId: localResources[0]?.id || '',
      startTime: slotToDate(0),
      endTime: slotToDate(4), // default 1 hour
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
      {/* Top Controls / Navigation (Figma Node 3603:12056) */}
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

      {/* Timeline Grid View */}
      <div 
        className="flex-1 min-h-0 flex relative overflow-y-auto select-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
          {/* Left Sidebar - Resources List */}
          <div className="w-[240px] flex-shrink-0 border-r border-border bg-card z-10 select-none">
            {/* Header Spacer */}
            <div className="h-14 flex items-center px-6 border-b border-border bg-card">
              <span className="text-[10px] font-bold tracking-wider text-text-tertiary uppercase">TECHNICIANS</span>
            </div>
            {/* Resource list items */}
            <div className="flex flex-col">
              {localResources.map((resource) => (
                <React.Fragment key={resource.id}>
                  {renderResource 
                    ? renderResource(resource, (e) => startRowDrag(e, resource.id)) 
                    : defaultRenderResource(resource, (e) => startRowDrag(e, resource.id))}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Right Panel - Scrollable Timeline Grid */}
          <div
            ref={gridRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
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
                    style={{
                      left: `${(idx / totalHours) * 100}%`,
                      width: `${(1 / totalHours) * 100}%`
                    }}
                  >
                    {formatHourLabel(hour)}
                  </div>
                ))}
              </div>

              {/* Grid Body */}
              <div className="flex flex-col relative">
                {/* Vertical grid lines (background) */}
                <div className="absolute inset-0 pointer-events-none flex">
                  {hours.map((hour, idx) => (
                    <div
                      key={`line-${hour}`}
                      className="absolute h-full border-l border-border/20"
                      style={{ left: `${(idx / totalHours) * 100}%` }}
                    />
                  ))}
                </div>

                {/* Resource rows with events */}
                {localResources.map((resource) => {
                  const resourceEvents = localEvents.filter((e) => e.resourceId === resource.id);
                  const isDraggingRow = rowDrag?.resourceId === resource.id;
                  
                  const isSelectedRow = selection && selection.resourceId === resource.id;
                  const startCol = isSelectedRow ? Math.min(selection.startSlot, selection.currentSlot) : 0;
                  const endCol = isSelectedRow ? Math.max(selection.startSlot, selection.currentSlot) : 0;

                  return (
                    <div
                      key={`row-${resource.id}`}
                      onPointerDown={(e) => handleRowPointerDown(e, resource.id)}
                      className={cn(
                        "h-[140px] border-b border-border flex items-center relative transition-colors cursor-cell",
                        isDraggingRow && "bg-primary/5 border-primary/20"
                      )}
                    >
                      {/* Events Placement Area */}
                      <div
                        className="absolute inset-0 grid items-center px-2 pointer-events-none"
                        style={{ gridTemplateColumns: `repeat(${totalSlots}, minmax(0, 1fr))` }}
                      >
                        {/* Temporary Selection Block Highlight */}
                        {isSelectedRow && (
                          <div
                            style={{
                              gridColumnStart: startCol + 1,
                              gridColumnEnd: (startCol === endCol ? startCol + 4 : endCol) + 1,
                            }}
                            className="bg-primary/15 border-2 border-dashed border-primary/30 rounded-lg h-[85px] z-0"
                          />
                        )}

                        {resourceEvents.map((event) => {
                          const { gridColumnStart, gridColumnEnd } = getEventGridSpan(
                            event.startTime,
                            event.endTime
                          );

                          return (
                            <div
                              key={event.id}
                              style={{
                                gridColumnStart,
                                gridColumnEnd
                              }}
                              className="pointer-events-auto px-1 z-10"
                            >
                              {renderEvent ? renderEvent(event, (e) => startCardDrag(e, event.id), (e) => startCardResize(e, event.id)) : defaultRenderEvent(event)}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

      {/* Creation Modal Overlay */}
      {showModal && newEventData && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] backdrop-blur-xs select-none">
          <div className="bg-white dark:bg-[#1a1a24] rounded-xl shadow-lg border border-border p-6 w-[400px] max-w-full animate-in fade-in-50 zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-text-primary dark:text-white mb-4">Create New Job</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-text-secondary dark:text-gray-400 uppercase tracking-wider mb-1">Job Title</label>
                <input
                  type="text"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm text-text-primary dark:text-white focus:outline-none focus:border-primary bg-background"
                  value={newEventData.title}
                  onChange={(e) => setNewEventData({ ...newEventData, title: e.target.value })}
                  placeholder="e.g. Pipe Burst"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-secondary dark:text-gray-400 uppercase tracking-wider mb-1">Location / Address</label>
                <input
                  type="text"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm text-text-primary dark:text-white focus:outline-none focus:border-primary bg-background"
                  value={newEventData.location}
                  onChange={(e) => setNewEventData({ ...newEventData, location: e.target.value })}
                  placeholder="e.g. Faulkner Street"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-text-secondary dark:text-gray-400 uppercase tracking-wider mb-1">Price ($)</label>
                  <input
                    type="number"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm text-text-primary dark:text-white focus:outline-none focus:border-primary bg-background"
                    value={newEventData.price}
                    onChange={(e) => setNewEventData({ ...newEventData, price: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-secondary dark:text-gray-400 uppercase tracking-wider mb-1">Status</label>
                  <select
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm text-text-primary dark:text-white focus:outline-none focus:border-primary bg-background"
                    value={newEventData.status}
                    onChange={(e) => setNewEventData({ ...newEventData, status: e.target.value as any })}
                  >
                    <option value="New">New</option>
                    <option value="Ongoing">Ongoing</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-secondary dark:text-gray-400 uppercase tracking-wider mb-1">Technician</label>
                <select
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm text-text-primary dark:text-white focus:outline-none focus:border-primary bg-background"
                  value={newEventData.resourceId}
                  onChange={(e) => setNewEventData({ ...newEventData, resourceId: e.target.value })}
                >
                  {localResources.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 text-xs text-text-secondary dark:text-gray-400 space-y-1 mt-3">
                <div>
                  <strong>Time Selection:</strong> {newEventData.startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} – {newEventData.endTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowModal(false);
                  setNewEventData(null);
                }}
                className="px-4 py-2 rounded-lg text-xs font-bold border border-border hover:bg-muted text-text-secondary dark:text-gray-400 dark:hover:bg-muted/30 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
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
                  setShowModal(false);
                  setNewEventData(null);
                }}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-primary hover:bg-primary/95 text-white transition-colors"
              >
                Save Job
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
