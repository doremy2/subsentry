/**
 * Core subscription model. See docs/DATA_MODEL.md — keep both in sync.
 * Pure types only: no I/O, no framework imports.
 */

export const BILLING_INTERVALS = ["weekly", "monthly", "quarterly", "yearly"] as const;
export type BillingInterval = (typeof BILLING_INTERVALS)[number];

export const SUBSCRIPTION_STATUSES = ["active", "paused", "cancelled"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/** ISO 4217 codes the UI offers. Totals are never mixed across currencies. */
export const SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "INR"] as const;

/** Calendar date with no time zone, formatted `YYYY-MM-DD`. */
export type ISODate = string;

export interface Subscription {
  /** Stable UUID, generated once at creation and never reused. */
  id: string;
  merchant: string;
  /** Price in the currency's minor unit (cents), avoiding float drift. */
  priceMinor: number;
  currency: string;
  interval: BillingInterval;
  /** Next charge date as stored; may be in the past — see `nextOccurrence`. */
  nextRenewal: ISODate;
  status: SubscriptionStatus;
  /** ISO 8601 timestamps (UTC). */
  createdAt: string;
  updatedAt: string;
}

/** Everything the user supplies; the data layer adds id and timestamps. */
export type SubscriptionInput = Omit<Subscription, "id" | "createdAt" | "updatedAt">;
