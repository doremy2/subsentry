import { describe, expect, it } from "vitest";
import { describeDaysUntil, monthlyEquivalentMinor, totalsByCurrency, upcomingRenewals, yearlyEquivalentMinor } from "./billing";
import type { Subscription } from "./subscription";

function sub(overrides: Partial<Subscription>): Subscription {
  return {
    id: crypto.randomUUID(),
    merchant: "Test",
    priceMinor: 1000,
    currency: "USD",
    interval: "monthly",
    nextRenewal: "2025-06-10",
    status: "active",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("equivalents", () => {
  it("normalises every interval to monthly and yearly", () => {
    expect(monthlyEquivalentMinor(1200, "monthly")).toBe(1200);
    expect(monthlyEquivalentMinor(3600, "quarterly")).toBe(1200);
    expect(monthlyEquivalentMinor(12000, "yearly")).toBe(1000);
    expect(monthlyEquivalentMinor(300, "weekly")).toBe(1300);
    expect(yearlyEquivalentMinor(1000, "monthly")).toBe(12000);
    expect(yearlyEquivalentMinor(500, "weekly")).toBe(26000);
  });
});

describe("totalsByCurrency", () => {
  it("sums only active subscriptions", () => {
    const totals = totalsByCurrency([
      sub({ priceMinor: 1599 }),
      sub({ priceMinor: 12000, interval: "yearly" }),
      sub({ priceMinor: 9999, status: "paused" }),
      sub({ priceMinor: 9999, status: "cancelled" }),
    ]);
    expect(totals).toEqual([{ currency: "USD", monthlyMinor: 2599, yearlyMinor: 31188, count: 2 }]);
  });

  it("keeps currencies separate", () => {
    const totals = totalsByCurrency([sub({ priceMinor: 500 }), sub({ priceMinor: 2000, currency: "EUR" })]);
    expect(totals.map((t) => t.currency)).toEqual(["EUR", "USD"]);
  });

  it("returns nothing for no subscriptions", () => {
    expect(totalsByCurrency([])).toEqual([]);
  });
});

describe("upcomingRenewals", () => {
  const today = "2025-06-08";

  it("orders by date, skips inactive, rolls stale dates forward", () => {
    const result = upcomingRenewals(
      [
        sub({ merchant: "Later", nextRenewal: "2025-06-20" }),
        sub({ merchant: "Soon", nextRenewal: "2025-06-09" }),
        sub({ merchant: "Stale", nextRenewal: "2025-05-10" }),
        sub({ merchant: "Paused", nextRenewal: "2025-06-08", status: "paused" }),
      ],
      today,
    );
    expect(result.map((r) => [r.subscription.merchant, r.date, r.daysUntil])).toEqual([
      ["Soon", "2025-06-09", 1],
      ["Stale", "2025-06-10", 2],
      ["Later", "2025-06-20", 12],
    ]);
  });

  it("respects the limit", () => {
    const subs = [1, 2, 3].map((n) => sub({ nextRenewal: `2025-06-1${n}` }));
    expect(upcomingRenewals(subs, today, 2)).toHaveLength(2);
  });
});

describe("describeDaysUntil", () => {
  it("is human friendly", () => {
    expect(describeDaysUntil(0)).toBe("Today");
    expect(describeDaysUntil(1)).toBe("Tomorrow");
    expect(describeDaysUntil(6)).toBe("in 6 days");
  });
});
