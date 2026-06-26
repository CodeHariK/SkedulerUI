import React from 'react';
import {
  SUICoreButton,
  SUICoreBodyText,
  SUICorePopover,
  SUICorePopoverTrigger,
  SUICorePopoverContent,
  SUICoreDatePicker,
} from '@/components/sui';
import { MIN_ZOOM, MAX_ZOOM, nextZoom, prevZoom } from './_lib/zoom';

interface TimelineControlsHeaderProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  zoomMinutes: number;
  onZoomChange: (minutes: number) => void;
  onReset: () => void;
  onCreateJob: () => void;
  onAddTechnician?: () => void;
  isMapViewActive: boolean;
  onMapViewToggle: () => void;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
  onOpenTemplates?: () => void;
}

export const TimelineControlsHeader: React.FC<TimelineControlsHeaderProps> = React.memo(({
  currentDate,
  onDateChange,
  zoomMinutes,
  onZoomChange,
  onReset,
  onCreateJob,
  onAddTechnician,
  isMapViewActive,
  onMapViewToggle,
  theme,
  onThemeToggle,
  onOpenTemplates,
}) => {
  const formatDateLabel = (date: Date) =>
    date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const handlePrevDay = () => {
    const d = new Date(currentDate);
    d.setDate(currentDate.getDate() - 1);
    onDateChange(d);
  };

  const handleNextDay = () => {
    const d = new Date(currentDate);
    d.setDate(currentDate.getDate() + 1);
    onDateChange(d);
  };

  const handleToday = () => onDateChange(new Date(2026, 5, 18)); // keep standard mock date

  const stepZoom = (dir: 1 | -1) => {
    onZoomChange(dir === 1 ? nextZoom(zoomMinutes) : prevZoom(zoomMinutes));
  };

  const [calendarMonth, setCalendarMonth] = React.useState<Date>(currentDate);
  React.useEffect(() => setCalendarMonth(currentDate), [currentDate]);

  return (
    <div className="bg-white dark:bg-[#141414] border-b border-neutral-200 dark:border-[#2a2a2a] flex flex-col md:flex-row items-center justify-between gap-4 px-5 py-3 w-full transition-colors duration-200 select-none">
      {/* Left: Map View toggle */}
      <div className="flex items-center w-full md:w-[240px] shrink-0">
        <SUICoreButton
          variant={isMapViewActive ? 'secondary' : 'outline'}
          icon="map"
          text="Map View"
          onClick={onMapViewToggle}
        />
      </div>

      {/* Center: Date controls */}
      <div className="flex items-center gap-2.5">
        <div className="flex gap-2 items-center">
          <SUICoreButton variant="outline" size="sm" icon="chevronLeft" iconOnly aria-label="Previous day" onClick={handlePrevDay} />

          <SUICorePopover>
            <SUICorePopoverTrigger asChild>
              <SUICoreButton variant="outline" icon="calendar" text={formatDateLabel(currentDate)} />
            </SUICorePopoverTrigger>
            <SUICorePopoverContent className="w-auto p-0" align="center">
              <SUICoreDatePicker
                value={currentDate}
                onChange={(d) => d && onDateChange(d)}
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
              />
            </SUICorePopoverContent>
          </SUICorePopover>

          <SUICoreButton variant="outline" size="sm" icon="chevronRight" iconOnly aria-label="Next day" onClick={handleNextDay} />
        </div>

        <SUICoreButton variant="outline" text="Today" trailingIcon="chevronDown" onClick={handleToday} />
      </div>

      {/* Right: Zoom, Reset, Add Technician, Create, Template, Theme */}
      <div className="flex items-center gap-2 justify-end w-full md:w-auto flex-wrap">
        <div className="bg-white dark:bg-[#1c1c1c] border border-neutral-200 dark:border-[#2a2a2a] rounded-pill p-1.5 flex gap-2 items-center shadow-xs">
          <SUICoreButton variant="ghost" size="sm" icon="minus" iconOnly aria-label="Decrease zoom" disabled={zoomMinutes <= MIN_ZOOM} onClick={() => stepZoom(-1)} />
          <SUICoreBodyText as="span" size="sm" tone="secondary" className="min-w-[50px] text-center">
            {zoomMinutes} min
          </SUICoreBodyText>
          <SUICoreButton variant="ghost" size="sm" icon="plus" iconOnly aria-label="Increase zoom" disabled={zoomMinutes >= MAX_ZOOM} onClick={() => stepZoom(1)} />
        </div>

        <SUICoreButton variant="outline" text="Reset" onClick={onReset} />

        {onAddTechnician && (
          <SUICoreButton variant="outline" icon="userPlus" text="Add Technician" onClick={onAddTechnician} />
        )}

        <SUICoreButton variant="primary" icon="plus" text="Create" trailingIcon="chevronDown" onClick={onCreateJob} />

        <SUICoreButton variant="outline" icon="layoutTemplate" text="Template" onClick={onOpenTemplates} />

        <SUICoreButton
          variant="outline"
          icon={theme === 'light' ? 'sun' : 'moon'}
          text={theme === 'light' ? 'Light' : 'Dark'}
          trailingIcon="chevronDown"
          onClick={onThemeToggle}
        />
      </div>
    </div>
  );
});
