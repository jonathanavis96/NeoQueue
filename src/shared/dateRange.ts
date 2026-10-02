/**
 * Export date-range filtering (pure, so it can be unit tested).
 */
import type { ExportDateRange, QueueItem } from './types';

/**
 * Parse a YYYY-MM-DD string (as produced by <input type="date">) to local
 * midnight on that day. The picker shows the user's own calendar, so UTC
 * midnight would shift the range by the zone offset. Rejects dates that do not
 * exist (e.g. 2026-02-31) rather than letting them roll into the next month.
 */
export const parseYyyyMmDd = (value: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
};

export const applyDateRange = (sourceItems: QueueItem[], dateRange: ExportDateRange): QueueItem[] => {
  const from = dateRange.from ? parseYyyyMmDd(dateRange.from) : null;
  const to = dateRange.to ? parseYyyyMmDd(dateRange.to) : null;

  if ((dateRange.from && !from) || (dateRange.to && !to)) {
    throw new Error('Invalid date range: use YYYY-MM-DD');
  }

  if (from && to && from.getTime() > to.getTime()) {
    throw new Error('Invalid date range: start date is after end date');
  }

  // Inclusive end date: last millisecond before the next local midnight
  // (calendar arithmetic, so a 23- or 25-hour DST day is still covered exactly).
  const toInclusive = to
    ? new Date(new Date(to.getFullYear(), to.getMonth(), to.getDate() + 1).getTime() - 1)
    : null;

  return sourceItems.filter((item) => {
    const raw = (dateRange.field === 'createdAt' ? item.createdAt : item.completedAt) as Date | undefined;
    if (!raw) return false;

    const ts = raw.getTime();
    if (from && ts < from.getTime()) return false;
    if (toInclusive && ts > toInclusive.getTime()) return false;
    return true;
  });
};
