import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/cn";

type Props = {
  /** Currently selected date (controlled). */
  value?: Date;
  /** Fired when a day is selected (or deselected). */
  onChange?: (date: Date | undefined) => void;
  /** Displayed month (controlled). Pair with `onMonthChange`. */
  month?: Date;
  /** Fired when the user navigates months. */
  onMonthChange?: (month: Date) => void;
  /** Initial month when uncontrolled. */
  defaultMonth?: Date;
  className?: string;
};

export function SUICoreDatePicker({
  value,
  onChange,
  month,
  onMonthChange,
  defaultMonth,
  className,
}: Props) {
  return (
    <DayPicker
      mode="single"
      navLayout="around"
      showOutsideDays
      selected={value}
      onSelect={onChange}
      month={month}
      onMonthChange={onMonthChange}
      defaultMonth={defaultMonth ?? value}
      formatters={{
        formatWeekdayName: (date) =>
          date.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2),
      }}
      className={cn("inline-block p-3 text-fg-primary", className)}
      classNames={{
        month: "relative space-y-2",
        month_caption: "flex h-9 items-center justify-center",
        caption_label: "text-body-md font-medium",
        button_previous:
          "absolute left-1 top-1 inline-flex h-7 w-7 items-center justify-center rounded-md border border-neutral-200 hover:bg-neutral-100",
        button_next:
          "absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center rounded-md border border-neutral-200 hover:bg-neutral-100",
        chevron: "h-4 w-4 fill-fg-tertiary",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-9 text-body-sm font-medium text-fg-tertiary",
        week: "mt-1 flex",
        day: "p-0",
        day_button:
          "inline-flex h-9 w-9 items-center justify-center rounded-md text-body-sm font-medium text-fg-secondary hover:bg-neutral-100",
        // data-selected lives on the gridcell, so style the child button from there.
        selected: "[&>button]:bg-primary-600 [&>button]:text-white [&>button]:hover:bg-primary-600",
        today: "font-semibold text-primary-600",
        outside: "text-fg-disabled",
        disabled: "text-fg-disabled opacity-50",
        hidden: "invisible",
      }}
    />
  );
}
