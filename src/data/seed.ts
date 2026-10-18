import { addDays } from "../domain/dates";
import type { ISODate, SubscriptionInput } from "../domain/subscription";

/** Realistic mock data, dated relative to today so the demo always looks alive. */
export function buildSeedSubscriptions(today: ISODate): SubscriptionInput[] {
  const entry = (
    merchant: string,
    price: number,
    interval: SubscriptionInput["interval"],
    inDays: number,
    status: SubscriptionInput["status"] = "active",
  ): SubscriptionInput => ({
    merchant,
    priceMinor: Math.round(price * 100),
    currency: "USD",
    interval,
    nextRenewal: addDays(today, inDays),
    status,
  });

  return [
    entry("Netflix", 15.49, "monthly", 2),
    entry("Spotify Premium", 11.99, "monthly", 5),
    entry("ChatGPT Plus", 20, "monthly", 9),
    entry("YouTube Premium", 13.99, "monthly", 13),
    entry("GitHub Copilot", 10, "monthly", 19),
    entry("Xbox Game Pass", 49.99, "quarterly", 24),
    entry("Notion Plus", 96, "yearly", 41),
    entry("Amazon Prime", 139, "yearly", 118),
    entry("Disney+", 13.99, "monthly", 15, "paused"),
    entry("Hulu", 9.99, "monthly", 3, "cancelled"),
  ];
}
