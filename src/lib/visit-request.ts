/** Visit times are requested slots in Tunisia, never confirmed bookings. */
export interface VisitRequest { date: string; time: string; mode: 'onsite' | 'video' }
export function visitDateBounds(now = new Date()): { min: string; max: string } {
  const tunisDay = (date: Date) => new Date(date.getTime() + 3600000).toISOString().slice(0, 10);
  return { min: tunisDay(now), max: tunisDay(new Date(now.getTime() + 180 * 86400000)) };
}
export function validVisitRequest(value: VisitRequest, now = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.date) || !/^\d{2}:\d{2}$/.test(value.time)) return false;
  if (!['onsite','video'].includes(value.mode)) return false;
  const slot = new Date(`${value.date}T${value.time}:00+01:00`);
  if (!Number.isFinite(slot.getTime())) return false;
  // A Date may normalize impossible calendar dates; reject them explicitly.
  const calendar = new Date(`${value.date}T12:00:00Z`);
  if (calendar.toISOString().slice(0,10) !== value.date) return false;
  return slot > now && slot.getTime() <= now.getTime() + 180 * 86400000;
}
