import { parseISODate } from "../domain/dates";
import type { BillingInterval, ISODate, SubscriptionStatus } from "../domain/subscription";

/** "Jun 10" (adds the year when it differs from `today`'s year). */
export function formatShortDate(iso: ISODate, today?: ISODate): string {
  const p = parseISODate(iso);
  if (!p) return iso;
  const showYear = today ? parseISODate(today)?.y !== p.y : false;
  return new Date(p.y, p.m - 1, p.d).toLocaleDateString(undefined, { month: "short", day: "numeric", ...(showYear && { year: "numeric" }) });
}

export const INTERVAL_LABEL: Record<BillingInterval, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

export const INTERVAL_SUFFIX: Record<BillingInterval, string> = {
  weekly: "/wk",
  monthly: "/mo",
  quarterly: "/qtr",
  yearly: "/yr",
};

export const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  active: "Active",
  paused: "Paused",
  cancelled: "Cancelled",
};

/** "Jun 10, 2025" */
export function formatFullDate(iso: ISODate): string {
  const p = parseISODate(iso);
  return p ? new Date(p.y, p.m - 1, p.d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : iso;
}
