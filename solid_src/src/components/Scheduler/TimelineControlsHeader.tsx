import { Show, type Component } from 'solid-js';
import {
  Map,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Minus,
  Plus,
  Sun,
  Moon
} from 'lucide-solid';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/button';
// NOTE: Ensure your Calendar component is SolidJS compatible (e.g., Kobalte based)
// import { Calendar } from '../../components/ui/calendar';

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

export const TimelineControlsHeader: Component<TimelineControlsHeaderProps> = (props) => {
  // Format current date display (e.g. "March 16, 2026")
  // Wrapped in a function to ensure it re-evaluates when props.currentDate changes
  // const formatDateLabel = () => {
  //   return props.currentDate.toLocaleDateString('en-US', {
  //     month: 'long',
  //     day: 'numeric',
  //     year: 'numeric'
  //   });
  // };

  const handlePrevDay = () => {
    const prevDate = new Date(props.currentDate);
    prevDate.setDate(props.currentDate.getDate() - 1);
    props.onDateChange(prevDate);
  };

  const handleNextDay = () => {
    const nextDate = new Date(props.currentDate);
    nextDate.setDate(props.currentDate.getDate() + 1);
    props.onDateChange(nextDate);
  };

  const handleToday = () => {
    props.onDateChange(new Date(2026, 5, 18)); // keeping standard mockDate consistent
  };

  const increaseZoom = () => {
    const zoomSteps = [15, 30, 45, 60, 90, 120];
    const currentIndex = zoomSteps.indexOf(props.zoomMinutes);
    if (currentIndex !== -1 && currentIndex < zoomSteps.length - 1) {
      props.onZoomChange(zoomSteps[currentIndex + 1]);
    }
  };

  const decreaseZoom = () => {
    const zoomSteps = [15, 30, 45, 60, 90, 120];
    const currentIndex = zoomSteps.indexOf(props.zoomMinutes);
    if (currentIndex > 0) {
      props.onZoomChange(zoomSteps[currentIndex - 1]);
    }
  };

  return (
    <div
      class="bg-white dark:bg-[#141414] border-b border-[#e5e7eb] dark:border-[#2a2a2a] flex flex-col md:flex-row items-center justify-between gap-4 px-5 py-3 w-full transition-colors duration-200 select-none"
    >
      {/* Left: Map View Toggle Button */}
      <div class="flex items-center w-full md:w-[240px] shrink-0">
        <Button
          onClick={props.onMapViewToggle}
          variant="outline"
          class={cn(
            "bg-white dark:bg-[#1c1c1c] border border-[#e5e7eb] dark:border-[#2a2a2a] hover:bg-[#fafafa] dark:hover:bg-[#252525] rounded-full h-auto px-3.5 py-1.5 flex gap-2 items-center justify-center cursor-pointer transition-all duration-200 shadow-xs active:scale-[0.98]",
            props.isMapViewActive && "border-green-500/40 bg-green-50/20 dark:bg-green-950/10"
          )}
        >
          <div class="flex gap-2.5 items-center">
            {/* Status indicator dot */}
            <div
              class={cn(
                "rounded-full size-2 transition-all duration-300",
                props.isMapViewActive
                  ? "bg-[#22c55e] border border-green-500/40 animate-pulse"
                  : "bg-gray-300 dark:bg-gray-700 border border-transparent"
              )}
            />
            <Map class="size-4 text-[#364153] dark:text-[#a0aec0]" />
          </div>
          <span class="font-['Satoshi'] font-medium text-[14px] leading-[20px] text-[#364153] dark:text-[#cbd5e1]">
            Map View
          </span>
        </Button>
      </div>

      {/* Center: Date Selection Controls */}
      <div class="flex items-center gap-2.5">
        <div class="flex gap-2 items-center">
          {/* Left Arrow Button */}
          <Button
            onClick={handlePrevDay}
            variant="outline"
            size="icon"
            class="bg-white dark:bg-[#1c1c1c] border border-[#e5e7eb] dark:border-[#2a2a2a] hover:bg-[#fafafa] dark:hover:bg-[#252525] rounded-full size-8 flex items-center justify-center cursor-pointer transition-all duration-200 shadow-xs active:scale-90"
          >
            <ChevronLeft class="size-4 text-[#364153] dark:text-[#a0aec0]" />
          </Button>

          {/* Date Picker Button with Shadcn Calendar */}
          {/* <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                class="bg-white dark:bg-[#1c1c1c] border border-[#e5e7eb] dark:border-[#2a2a2a] hover:bg-[#fafafa] dark:hover:bg-[#252525] rounded-full h-auto px-3.5 py-1.5 flex gap-2 items-center cursor-pointer shadow-xs active:scale-[0.98] transition-all"
              >
                <CalendarIcon class="size-4 text-[#364153] dark:text-[#a0aec0]" />
                <span class="font-['Satoshi'] font-medium text-[14px] leading-[20px] text-[#364153] dark:text-[#cbd5e1]">
                  {formatDateLabel()}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent class="w-auto p-0 border border-border bg-card shadow-md rounded-xl" align="center">
              <Calendar
                mode="single"
                selected={props.currentDate}
                onSelect={(date: Date) => date && props.onDateChange(date)}
              />
            </PopoverContent>
          </Popover> */}

          {/* Right Arrow Button */}
          <Button
            onClick={handleNextDay}
            variant="outline"
            size="icon"
            class="bg-white dark:bg-[#1c1c1c] border border-[#e5e7eb] dark:border-[#2a2a2a] hover:bg-[#fafafa] dark:hover:bg-[#252525] rounded-full size-8 flex items-center justify-center cursor-pointer transition-all duration-200 shadow-xs active:scale-90"
          >
            <ChevronRight class="size-4 text-[#364153] dark:text-[#a0aec0]" />
          </Button>
        </div>

        {/* Today Button Dropdown */}
        <Button
          onClick={handleToday}
          variant="outline"
          class="bg-white dark:bg-[#1c1c1c] border border-[#e5e7eb] dark:border-[#2a2a2a] hover:bg-[#fafafa] dark:hover:bg-[#252525] rounded-full h-auto px-3.5 py-1.5 flex gap-1.5 items-center cursor-pointer transition-all duration-200 shadow-xs active:scale-[0.98]"
        >
          <span class="font-['Satoshi'] font-medium text-[14px] leading-[20px] text-[#364153] dark:text-[#cbd5e1]">
            Today
          </span>
          <ChevronDown class="size-4 text-[#364153] dark:text-[#a0aec0]" />
        </Button>
      </div>

      {/* Right: Zoom Controls, Reset, Create, Theme */}
      <div class="flex items-center gap-2 justify-end w-full md:w-auto flex-wrap">
        {/* Zoom Selector */}
        <div class="bg-white dark:bg-[#1c1c1c] border border-[#e5e7eb] dark:border-[#2a2a2a] rounded-full p-1.5 flex gap-2 items-center shadow-xs">
          <Button
            onClick={decreaseZoom}
            disabled={props.zoomMinutes <= 15}
            variant="ghost"
            size="icon"
            class="hover:bg-[#fafafa] dark:hover:bg-[#252525] rounded-full size-6 p-1 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Minus class="size-4 text-[#364153] dark:text-[#a0aec0]" />
          </Button>

          <span class="font-['Satoshi'] font-medium text-[14px] leading-[20px] text-[#364153] dark:text-[#cbd5e1] min-w-[50px] text-center">
            {props.zoomMinutes} min
          </span>

          <Button
            onClick={increaseZoom}
            disabled={props.zoomMinutes >= 120}
            variant="ghost"
            size="icon"
            class="hover:bg-[#fafafa] dark:hover:bg-[#252525] rounded-full size-6 p-1 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Plus class="size-4 text-[#364153] dark:text-[#a0aec0]" />
          </Button>
        </div>

        {/* Reset Button */}
        <Button
          onClick={props.onReset}
          variant="outline"
          class="bg-white dark:bg-[#1c1c1c] border border-[#e5e7eb] dark:border-[#2a2a2a] hover:bg-[#fafafa] dark:hover:bg-[#252525] rounded-full h-auto px-3.5 py-1.5 cursor-pointer text-center transition-all duration-200 shadow-xs active:scale-[0.98]"
        >
          <span class="font-['Satoshi'] font-medium text-[14px] leading-[20px] text-[#364153] dark:text-[#cbd5e1]">
            Reset
          </span>
        </Button>

        {/* Create Dropdown Button */}
        <Button
          onClick={props.onCreateJob}
          class="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-full h-auto px-3.5 py-1.5 flex gap-1.5 items-center cursor-pointer transition-all duration-200 shadow-sm active:scale-[0.98] border border-transparent font-medium"
        >
          <Plus class="size-4 text-white" />
          <span class="font-['Satoshi'] font-medium text-[14px] leading-[20px] text-white">
            Create
          </span>
          <ChevronDown class="size-4 text-white/80" />
        </Button>

        {/* Theme Button */}
        <Button
          onClick={props.onThemeToggle}
          variant="outline"
          class="bg-white dark:bg-[#1c1c1c] border border-[#e5e7eb] dark:border-[#2a2a2a] hover:bg-[#fafafa] dark:hover:bg-[#252525] rounded-full h-auto px-3.5 py-1.5 flex gap-1.5 items-center cursor-pointer transition-all duration-200 shadow-xs active:scale-[0.98]"
        >
          <Show
            when={props.theme === 'light'}
            fallback={
              <>
                <Moon class="size-4 text-indigo-400" />
                <span class="font-['Satoshi'] font-medium text-[14px] leading-[20px] text-[#cbd5e1]">
                  Dark
                </span>
              </>
            }
          >
            <>
              <Sun class="size-4 text-amber-500 animate-spin-slow" />
              <span class="font-['Satoshi'] font-medium text-[14px] leading-[20px] text-[#364153] dark:text-[#cbd5e1]">
                Light
              </span>
            </>
          </Show>
          <ChevronDown class="size-4 text-[#364153] dark:text-[#a0aec0]" />
        </Button>
      </div>
    </div>
  );
};
