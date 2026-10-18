import { daysBetween, nextOccurrence } from "./dates";
import type { BillingInterval, ISODate, Subscription } from "./subscription";

/** Periods per year for each interval; weekly uses 52 (not 52.18) by convention. */
const PERIODS_PER_YEAR: Record<BillingInterval, number> = {
  weekly: 52,
  monthly: 12,
  quarterly: 4,
  yearly: 1,
};

/** Average monthly cost in minor units (may be fractional; round only for display). */
export function monthlyEquivalentMinor(priceMinor: number, interval: BillingInterval): number {
  return (priceMinor * PERIODS_PER_YEAR[interval]) / 12;
}

export function yearlyEquivalentMinor(priceMinor: number, interval: BillingInterval): number {
  return priceMinor * PERIODS_PER_YEAR[interval];
}

export interface CurrencyTotals {
  currency: string;
  monthlyMinor: number;
  yearlyMinor: number;
  count: number;
}

/**
 * Spending per currency across ACTIVE subscriptions only. Currencies are never
 * converted or merged. Sorted by monthly spend, highest first.
 */
export function totalsByCurrency(subscriptions: readonly Subscription[]): CurrencyTotals[] {
  const byCurrency = new Map<string, CurrencyTotals>();
  for (const sub of subscriptions) {
    if (sub.status !== "active") continue;
    const entry = byCurrency.get(sub.currency) ?? { currency: sub.currency, monthlyMinor: 0, yearlyMinor: 0, count: 0 };
    entry.monthlyMinor += monthlyEquivalentMinor(sub.priceMinor, sub.interval);
    entry.yearlyMinor += yearlyEquivalentMinor(sub.priceMinor, sub.interval);
    entry.count += 1;
    byCurrency.set(sub.currency, entry);
  }
  return [...byCurrency.values()].sort((a, b) => b.monthlyMinor - a.monthlyMinor);
}

export interface UpcomingRenewal {
  subscription: Subscription;
  date: ISODate;
  daysUntil: number;
}

/** Active subscriptions ordered by their next charge date (stale dates rolled forward). */
export function upcomingRenewals(
  subscriptions: readonly Subscription[],
  today: ISODate,
  limit = Infinity,
): UpcomingRenewal[] {
  return subscriptions
    .filter((sub) => sub.status === "active")
    .map((subscription) => {
      const date = nextOccurrence(subscription.nextRenewal, subscription.interval, today);
      return { subscription, date, daysUntil: daysBetween(today, date) };
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.subscription.merchant.localeCompare(b.subscription.merchant))
    .slice(0, limit);
}

/** "Today", "Tomorrow", "in 5 days". */
export function describeDaysUntil(days: number): string {
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `in ${days} days`;
}
