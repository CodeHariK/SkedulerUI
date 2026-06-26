// Slot ↔ time helpers, extracted from ResourceScheduler so the math is shared by
// the layout engine, the selection/drag/resize ghosts, and the dialogs.

/** Convert a slot index to a concrete Date on `currentDate`. */
export const slotToDate = (
  slot: number,
  currentDate: Date,
  dayStartHour: number,
  slotsPerHour: number,
): Date => {
  const date = new Date(currentDate);
  const hoursDecimal = dayStartHour + slot / slotsPerHour;
  const hours = Math.floor(hoursDecimal);
  const minutes = Math.round((hoursDecimal - hours) * 60);
  date.setHours(hours, minutes, 0, 0);
  return date;
};

/** "9:00 AM – 10:30 AM" label for a slot range — used by every interaction ghost. */
export const formatSlotRange = (
  startSlot: number,
  endSlot: number,
  currentDate: Date,
  dayStartHour: number,
  slotsPerHour: number,
): string => {
  const fmt = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return `${fmt(slotToDate(startSlot, currentDate, dayStartHour, slotsPerHour))} – ${fmt(slotToDate(endSlot, currentDate, dayStartHour, slotsPerHour))}`;
};
