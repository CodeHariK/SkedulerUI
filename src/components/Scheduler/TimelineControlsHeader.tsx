import React from 'react';
import {
  Map,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Minus,
  Plus,
  Sun,
  Moon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface TimelineControlsHeaderProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  zoomMinutes: number;
  onZoomChange: (minutes: number) => void;
  onReset: () => void;
  onCreateJob: () => void;
  isMapViewActive: boolean;
  onMapViewToggle: () => void;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
}

export const TimelineControlsHeader: React.FC<TimelineControlsHeaderProps> = React.memo(({
  currentDate,
  onDateChange,
  zoomMinutes,
  onZoomChange,
  onReset,
  onCreateJob,
  isMapViewActive,
  onMapViewToggle,
  theme,
  onThemeToggle
}) => {
  // Format current date display (e.g. "March 16, 2026")
  const formatDateLabel = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handlePrevDay = () => {
    const prevDate = new Date(currentDate);
    prevDate.setDate(currentDate.getDate() - 1);
    onDateChange(prevDate);
  };

  const handleNextDay = () => {
    const nextDate = new Date(currentDate);
    nextDate.setDate(currentDate.getDate() + 1);
    onDateChange(nextDate);
  };

  const handleToday = () => {
    onDateChange(new Date(2026, 5, 18)); // keeping standard mockDate consistent
  };

  const increaseZoom = () => {
    // e.g. increase granularity to next levels: 15m -> 30m -> 45m -> 60m -> 90m -> 120m
    const zoomSteps = [15, 30, 45, 60, 90, 120];
    const currentIndex = zoomSteps.indexOf(zoomMinutes);
    if (currentIndex !== -1 && currentIndex < zoomSteps.length - 1) {
      onZoomChange(zoomSteps[currentIndex + 1]);
    }
  };

  const decreaseZoom = () => {
    const zoomSteps = [15, 30, 45, 60, 90, 120];
    const currentIndex = zoomSteps.indexOf(zoomMinutes);
    if (currentIndex > 0) {
      onZoomChange(zoomSteps[currentIndex - 1]);
    }
  };

  return (
    <div
      className="bg-white dark:bg-[#141414] border-b border-[#e5e7eb] dark:border-[#2a2a2a] flex flex-col md:flex-row items-center justify-between gap-4 px-5 py-3 w-full transition-colors duration-200 select-none"
      data-node-id="3603:12056"
    >
      {/* Left: Map View Toggle Button */}
      <div className="flex items-center w-full md:w-[240px] shrink-0" data-node-id="3603:12057">
        <Button
          onClick={onMapViewToggle}
          variant="outline"
          className={cn(
            "bg-white dark:bg-[#1c1c1c] border border-[#e5e7eb] dark:border-[#2a2a2a] hover:bg-[#fafafa] dark:hover:bg-[#252525] rounded-full h-auto px-3.5 py-1.5 flex gap-2 items-center justify-center cursor-pointer transition-all duration-200 shadow-xs active:scale-[0.98]",
            isMapViewActive && "border-green-500/40 bg-green-50/20 dark:bg-green-950/10"
          )}
          data-node-id="3330:25089"
        >
          <div className="flex gap-2.5 items-center">
            {/* Status indicator dot */}
            <div
              className={cn(
                "rounded-full size-2 transition-all duration-300",
                isMapViewActive
                  ? "bg-[#22c55e] border border-green-500/40 animate-pulse"
                  : "bg-gray-300 dark:bg-gray-700 border border-transparent"
              )}
              data-node-id="3330:25084"
            />
            <Map className="size-4 text-[#364153] dark:text-[#a0aec0]" />
          </div>
          <span className="font-['Satoshi'] font-medium text-[14px] leading-[20px] text-[#364153] dark:text-[#cbd5e1]">
            Map View
          </span>
        </Button>
      </div>

      {/* Center: Date Selection Controls */}
      <div className="flex items-center gap-2.5" data-node-id="3603:12059">
        <div className="flex gap-2 items-center">
          {/* Left Arrow Button */}
          <Button
            onClick={handlePrevDay}
            variant="outline"
            size="icon"
            className="bg-white dark:bg-[#1c1c1c] border border-[#e5e7eb] dark:border-[#2a2a2a] hover:bg-[#fafafa] dark:hover:bg-[#252525] rounded-full size-8 flex items-center justify-center cursor-pointer transition-all duration-200 shadow-xs active:scale-90"
            data-node-id="3338:6738"
          >
            <ChevronLeft className="size-4 text-[#364153] dark:text-[#a0aec0]" />
          </Button>

          {/* Date Picker Button with Shadcn Calendar */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="bg-white dark:bg-[#1c1c1c] border border-[#e5e7eb] dark:border-[#2a2a2a] hover:bg-[#fafafa] dark:hover:bg-[#252525] rounded-full h-auto px-3.5 py-1.5 flex gap-2 items-center cursor-pointer shadow-xs active:scale-[0.98] transition-all"
                data-node-id="3338:6739"
              >
                <CalendarIcon className="size-4 text-[#364153] dark:text-[#a0aec0]" />
                <span className="font-['Satoshi'] font-medium text-[14px] leading-[20px] text-[#364153] dark:text-[#cbd5e1]">
                  {formatDateLabel(currentDate)}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border border-border bg-card shadow-md rounded-xl" align="center">
              <Calendar
                mode="single"
                selected={currentDate}
                onSelect={(date) => date && onDateChange(date)}
              />
            </PopoverContent>
          </Popover>

          {/* Right Arrow Button */}
          <Button
            onClick={handleNextDay}
            variant="outline"
            size="icon"
            className="bg-white dark:bg-[#1c1c1c] border border-[#e5e7eb] dark:border-[#2a2a2a] hover:bg-[#fafafa] dark:hover:bg-[#252525] rounded-full size-8 flex items-center justify-center cursor-pointer transition-all duration-200 shadow-xs active:scale-90"
            data-node-id="3338:6740"
          >
            <ChevronRight className="size-4 text-[#364153] dark:text-[#a0aec0]" />
          </Button>
        </div>

        {/* Today Button Dropdown */}
        <Button
          onClick={handleToday}
          variant="outline"
          className="bg-white dark:bg-[#1c1c1c] border border-[#e5e7eb] dark:border-[#2a2a2a] hover:bg-[#fafafa] dark:hover:bg-[#252525] rounded-full h-auto px-3.5 py-1.5 flex gap-1.5 items-center cursor-pointer transition-all duration-200 shadow-xs active:scale-[0.98]"
          data-node-id="3603:12061"
        >
          <span className="font-['Satoshi'] font-medium text-[14px] leading-[20px] text-[#364153] dark:text-[#cbd5e1]">
            Today
          </span>
          <ChevronDown className="size-4 text-[#364153] dark:text-[#a0aec0]" />
        </Button>
      </div>

      {/* Right: Zoom Controls, Reset, Create, Theme */}
      <div className="flex items-center gap-2 justify-end w-full md:w-auto flex-wrap" data-node-id="3603:12062">
        {/* Zoom Selector */}
        <div
          className="bg-white dark:bg-[#1c1c1c] border border-[#e5e7eb] dark:border-[#2a2a2a] rounded-full p-1.5 flex gap-2 items-center shadow-xs"
          data-node-id="3603:12063"
        >
          <Button
            onClick={decreaseZoom}
            disabled={zoomMinutes <= 15}
            variant="ghost"
            size="icon"
            className="hover:bg-[#fafafa] dark:hover:bg-[#252525] rounded-full size-6 p-1 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Minus className="size-4 text-[#364153] dark:text-[#a0aec0]" />
          </Button>

          <span className="font-['Satoshi'] font-medium text-[14px] leading-[20px] text-[#364153] dark:text-[#cbd5e1] min-w-[50px] text-center">
            {zoomMinutes} min
          </span>

          <Button
            onClick={increaseZoom}
            disabled={zoomMinutes >= 120}
            variant="ghost"
            size="icon"
            className="hover:bg-[#fafafa] dark:hover:bg-[#252525] rounded-full size-6 p-1 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="size-4 text-[#364153] dark:text-[#a0aec0]" />
          </Button>
        </div>

        {/* Reset Button */}
        <Button
          onClick={onReset}
          variant="outline"
          className="bg-white dark:bg-[#1c1c1c] border border-[#e5e7eb] dark:border-[#2a2a2a] hover:bg-[#fafafa] dark:hover:bg-[#252525] rounded-full h-auto px-3.5 py-1.5 cursor-pointer text-center transition-all duration-200 shadow-xs active:scale-[0.98]"
          data-node-id="3603:12064"
        >
          <span className="font-['Satoshi'] font-medium text-[14px] leading-[20px] text-[#364153] dark:text-[#cbd5e1]">
            Reset
          </span>
        </Button>

        {/* Create Dropdown Button */}
        <Button
          onClick={onCreateJob}
          className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-full h-auto px-3.5 py-1.5 flex gap-1.5 items-center cursor-pointer transition-all duration-200 shadow-sm active:scale-[0.98] border border-transparent font-medium"
          data-node-id="3603:12065"
        >
          <Plus className="size-4 text-white" />
          <span className="font-['Satoshi'] font-medium text-[14px] leading-[20px] text-white">
            Create
          </span>
          <ChevronDown className="size-4 text-white/80" />
        </Button>

        {/* Theme Button */}
        <Button
          onClick={onThemeToggle}
          variant="outline"
          className="bg-white dark:bg-[#1c1c1c] border border-[#e5e7eb] dark:border-[#2a2a2a] hover:bg-[#fafafa] dark:hover:bg-[#252525] rounded-full h-auto px-3.5 py-1.5 flex gap-1.5 items-center cursor-pointer transition-all duration-200 shadow-xs active:scale-[0.98]"
          data-node-id="3603:12066"
        >
          {theme === 'light' ? (
            <>
              <Sun className="size-4 text-amber-500 animate-spin-slow" />
              <span className="font-['Satoshi'] font-medium text-[14px] leading-[20px] text-[#364153] dark:text-[#cbd5e1]">
                Light
              </span>
            </>
          ) : (
            <>
              <Moon className="size-4 text-indigo-400" />
              <span className="font-['Satoshi'] font-medium text-[14px] leading-[20px] text-[#cbd5e1]">
                Dark
              </span>
            </>
          )}
          <ChevronDown className="size-4 text-[#364153] dark:text-[#a0aec0]" />
        </Button>
      </div>
    </div>
  );
});
