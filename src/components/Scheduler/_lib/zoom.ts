/**
 * Timeline zoom levels, in minutes per slot. Smaller = more granular.
 * The toolbar's −/+ controls step through these in order.
 */
export const ZOOM_STEPS = [15, 30, 45, 60, 90, 120] as const;

export const MIN_ZOOM = ZOOM_STEPS[0];
export const MAX_ZOOM = ZOOM_STEPS[ZOOM_STEPS.length - 1];

/** Next larger interval — the `+` control, a coarser view. Clamped at MAX_ZOOM. */
export function nextZoom(current: number): number {
  const i = ZOOM_STEPS.indexOf(current as (typeof ZOOM_STEPS)[number]);
  if (i === -1 || i === ZOOM_STEPS.length - 1) return MAX_ZOOM;
  return ZOOM_STEPS[i + 1];
}

/** Next smaller interval — the `−` control, a finer view. Clamped at MIN_ZOOM. */
export function prevZoom(current: number): number {
  const i = ZOOM_STEPS.indexOf(current as (typeof ZOOM_STEPS)[number]);
  if (i <= 0) return MIN_ZOOM;
  return ZOOM_STEPS[i - 1];
}

/**
 * Pixel width of a single hour column at each zoom step. Keyed off ZOOM_STEPS so
 * the two stay in sync — a finer interval renders a wider hour (more detail).
 */
export const HOUR_WIDTH_BY_STEP: Record<(typeof ZOOM_STEPS)[number], number> = {
  15: 240,
  30: 180,
  45: 140,
  60: 100,
  90: 80,
  120: 60,
};

/** Hour-column width (px) for a zoom level. Falls back to the 60-min width. */
export function getHourWidth(zoom: number): number {
  return HOUR_WIDTH_BY_STEP[zoom as (typeof ZOOM_STEPS)[number]] ?? HOUR_WIDTH_BY_STEP[60];
}
