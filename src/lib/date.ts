// Date helpers anchored to the Asia/Kolkata timezone.
// We deliberately treat "today" / month boundaries in IST regardless of device TZ.
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  parseISO,
  format,
} from "date-fns";

export const TZ = "Asia/Kolkata";

/** A Date object representing "now" in IST wall-clock terms. */
export function nowIST(): Date {
  return toZonedTime(new Date(), TZ);
}

/** Today's ISO date string (YYYY-MM-DD) in IST. */
export function todayISO(): string {
  return formatInTimeZone(new Date(), TZ, "yyyy-MM-dd");
}

/** First day of the given (or current) month as YYYY-MM-DD, in IST. */
export function monthKey(date: Date = nowIST()): string {
  return format(startOfMonth(date), "yyyy-MM-dd");
}

/** Parse a "yyyy-MM-dd" string into a local Date (no TZ shift for date-only values). */
export function parseDate(iso: string): Date {
  return parseISO(iso);
}

export function monthBounds(monthIso: string): { start: Date; end: Date } {
  const d = parseISO(monthIso);
  return { start: startOfMonth(d), end: endOfMonth(d) };
}

export function daysInMonth(monthIso: string): Date[] {
  const { start, end } = monthBounds(monthIso);
  return eachDayOfInterval({ start, end });
}

/** Human label for a month key, e.g. "June 2026". */
export function monthLabel(monthIso: string): string {
  return format(parseISO(monthIso), "MMMM yyyy");
}

/** Short label, e.g. "Jun '26". */
export function monthLabelShort(monthIso: string): string {
  return format(parseISO(monthIso), "MMM ''yy");
}

export function dayLabel(iso: string): string {
  return format(parseISO(iso), "EEE, d MMM");
}

/** Returns previous/next month keys for the month selector. */
export function shiftMonth(monthIso: string, delta: number): string {
  const d = parseISO(monthIso);
  return format(startOfMonth(new Date(d.getFullYear(), d.getMonth() + delta, 1)), "yyyy-MM-dd");
}

/** How many days of the month have elapsed (in IST). At least 1. */
export function elapsedDaysInMonth(monthIso: string): number {
  const today = todayISO();
  const { start, end } = monthBounds(monthIso);
  const todayDate = parseISO(today);
  if (todayDate < start) return 0;
  if (todayDate > end) return end.getDate();
  return todayDate.getDate();
}

export function totalDaysInMonth(monthIso: string): number {
  return monthBounds(monthIso).end.getDate();
}
