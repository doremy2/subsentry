import { describe, expect, it } from "vitest";
import { findDueReminders, formatReminderMessage, reminderKey, type ReminderSettings } from "./reminders";
import type { Subscription } from "./subscription";

const NOW = new Date(2026, 9, 18, 10, 0); // Oct 18 2026, 10:00 local
const settings: ReminderSettings = { enabled: true, leadDays: 3, hour: 9 };

function sub(overrides: Partial<Subscription>): Subscription {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    merchant: "Netflix",
    priceMinor: 1549,
    currency: "USD",
    interval: "monthly",
    nextRenewal: "2026-10-20",
    status: "active",
    createdAt: "t",
    updatedAt: "t",
    ...overrides,
  };
}

describe("findDueReminders", () => {
  it("finds renewals inside the lead window only", () => {
    const due = findDueReminders(
      [sub({ merchant: "Soon", nextRenewal: "2026-10-20" }), sub({ merchant: "Far", nextRenewal: "2026-10-30" }), sub({ merchant: "Edge", nextRenewal: "2026-10-21" })],
      NOW,
      settings,
      new Set(),
    );
    expect(due.map((d) => [d.subscription.merchant, d.daysUntil])).toEqual([["Soon", 2], ["Edge", 3]]);
  });

  it("skips paused and cancelled subscriptions", () => {
    expect(findDueReminders([sub({ status: "paused" }), sub({ status: "cancelled" })], NOW, settings, new Set())).toEqual([]);
  });

  it("respects enabled flag and the time-of-day gate", () => {
    const s = [sub({})];
    expect(findDueReminders(s, NOW, { ...settings, enabled: false }, new Set())).toEqual([]);
    expect(findDueReminders(s, new Date(2026, 9, 18, 8, 59), settings, new Set())).toEqual([]);
    expect(findDueReminders(s, new Date(2026, 9, 18, 9, 0), settings, new Set())).toHaveLength(1);
  });

  it("does not repeat a reminder already sent for that occurrence", () => {
    const s = sub({ id: "a" });
    expect(findDueReminders([s], NOW, settings, new Set([reminderKey("a", "2026-10-20")]))).toEqual([]);
  });

  it("re-arms when the renewal moves to a new occurrence", () => {
    const s = sub({ id: "a", nextRenewal: "2026-10-19" });
    expect(findDueReminders([s], NOW, settings, new Set([reminderKey("a", "2026-10-20")]))).toHaveLength(1);
  });

  it("rolls stale dates forward and handles lead 0 (same day only)", () => {
    const stale = sub({ nextRenewal: "2026-09-18" }); // monthly -> Oct 18 (today)
    expect(findDueReminders([stale], NOW, { ...settings, leadDays: 0 }, new Set())[0]?.daysUntil).toBe(0);
    expect(findDueReminders([sub({ nextRenewal: "2026-10-19" })], NOW, { ...settings, leadDays: 0 }, new Set())).toEqual([]);
  });
});

describe("formatReminderMessage", () => {
  it("describes a single renewal", () => {
    const due = findDueReminders([sub({ nextRenewal: "2026-10-19" })], NOW, settings, new Set());
    const msg = formatReminderMessage(due);
    expect(msg.title).toBe("Netflix renews tomorrow");
    expect(msg.body).toContain("15.49");
  });

  it("summarises several and caps the list", () => {
    const subs = ["A", "B", "C", "D"].map((m) => sub({ merchant: m, nextRenewal: "2026-10-19" }));
    const msg = formatReminderMessage(findDueReminders(subs, NOW, settings, new Set()));
    expect(msg.title).toBe("4 subscriptions renew soon");
    expect(msg.body).toBe("A (tomorrow), B (tomorrow), C (tomorrow) +1 more");
  });
});
