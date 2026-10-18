import {
  BILLING_INTERVALS,
  SUBSCRIPTION_STATUSES,
  type BillingInterval,
  type Subscription,
  type SubscriptionStatus,
} from "../../../src/domain/subscription";
import { DataError } from "../../../src/data/types";

/** Shape of a `subscriptions` row as SQLite returns it. */
export type SubscriptionRow = Record<string, unknown>;

export const SUBSCRIPTION_COLUMNS =
  "id, merchant, price_minor, currency, interval, next_renewal, status, created_at, updated_at";

function str(row: SubscriptionRow, key: string): string {
  const value = row[key];
  if (typeof value !== "string") throw new DataError(`Corrupt subscription row: "${key}" is not text.`);
  return value;
}

function oneOf<T extends string>(row: SubscriptionRow, key: string, allowed: readonly T[]): T {
  const value = str(row, key);
  if (!(allowed as readonly string[]).includes(value)) throw new DataError(`Corrupt subscription row: bad "${key}" value "${value}".`);
  return value as T;
}

export function rowToSubscription(row: SubscriptionRow): Subscription {
  const price = row["price_minor"];
  if (typeof price !== "number" || !Number.isSafeInteger(price)) {
    throw new DataError('Corrupt subscription row: "price_minor" is not an integer.');
  }
  return {
    id: str(row, "id"),
    merchant: str(row, "merchant"),
    priceMinor: price,
    currency: str(row, "currency"),
    interval: oneOf<BillingInterval>(row, "interval", BILLING_INTERVALS),
    nextRenewal: str(row, "next_renewal"),
    status: oneOf<SubscriptionStatus>(row, "status", SUBSCRIPTION_STATUSES),
    createdAt: str(row, "created_at"),
    updatedAt: str(row, "updated_at"),
  };
}
