import type { BillingInterval, ISODate } from "./subscription";

/**
 * Date-only helpers. Renewal dates are calendar dates, so all math runs in UTC
 * on `YYYY-MM-DD` strings to stay immune to time zones and DST.
 */

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

interface Ymd {
  y: number;
  m: number; // 1-12
  d: number;
}

export function parseISODate(text: string): Ymd | null {
  const match = ISO_RE.exec(text);
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const check = new Date(Date.UTC(y, m - 1, d));
  const valid = check.getUTCFullYear() === y && check.getUTCMonth() === m - 1 && check.getUTCDate() === d;
  return valid ? { y, m, d } : null;
}

export function isValidISODate(text: string): boolean {
  return parseISODate(text) !== null;
}

function format({ y, m, d }: Ymd): ISODate {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Today's date in the user's local time zone. */
export function todayISO(now: Date = new Date()): ISODate {
  return format({ y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() });
}

function toUtcMs(iso: ISODate): number {
  const p = parseISODate(iso);
  if (!p) throw new Error(`Invalid ISO date: ${iso}`);
  return Date.UTC(p.y, p.m - 1, p.d);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: ISODate, to: ISODate): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / 86_400_000);
}

export function addDays(iso: ISODate, days: number): ISODate {
  const date = new Date(toUtcMs(iso) + days * 86_400_000);
  return format({ y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: date.getUTCDate() });
}

/** Add months, clamping to month end (Jan 31 + 1 month = Feb 28/29). */
export function addMonths(iso: ISODate, months: number): ISODate {
  const p = parseISODate(iso);
  if (!p) throw new Error(`Invalid ISO date: ${iso}`);
  const index = p.y * 12 + (p.m - 1) + months;
  const y = Math.floor(index / 12);
  const m = (index % 12) + 1;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return format({ y, m, d: Math.min(p.d, lastDay) });
}

const MONTHS_PER_INTERVAL: Record<Exclude<BillingInterval, "weekly">, number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

/** The anchor shifted forward by `n` billing periods. */
function advance(anchor: ISODate, interval: BillingInterval, n: number): ISODate {
  return interval === "weekly" ? addDays(anchor, 7 * n) : addMonths(anchor, MONTHS_PER_INTERVAL[interval] * n);
}

/**
 * The first renewal on or after `today`, rolling a stale stored date forward.
 * Counts periods from the original anchor so day-of-month never drifts
 * (a Jan 31 monthly plan returns to the 31st whenever the month allows).
 */
export function nextOccurrence(anchor: ISODate, interval: BillingInterval, today: ISODate): ISODate {
  if (anchor >= today) return anchor;
  let n = 1;
  while (advance(anchor, interval, n) < today) n += 1;
  return advance(anchor, interval, n);
}
