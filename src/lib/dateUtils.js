/**
 * Returns the local calendar date string (YYYY-MM-DD) for a given Date object.
 * Uses the device's local timezone — required for streak logic to match
 * what the user perceives as "today".
 */
export function localDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
