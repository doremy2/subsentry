import { describe, expect, it } from "vitest";
import { openDatabase } from "../db/database";
import { createStore } from "../db/store";
import { runReminderCheck } from "./scheduler";

const NOW = new Date(2026, 9, 18, 10, 0);
const sub = (merchant: string, nextRenewal: string) => ({ merchant, priceMinor: 999, currency: "USD", interval: "monthly" as const, nextRenewal, status: "active" as const });

function setup() {
  const store = createStore(openDatabase(":memory:"));
  for (const s of store.listSubscriptions()) store.removeSubscription(s.id); // drop demo data
  const sent: Array<{ title: string; body: string }> = [];
  const notify = (title: string, body: string) => (sent.push({ title, body }), true);
  return { store, sent, run: (n = NOW, fn = notify) => runReminderCheck({ store, notify: fn, now: () => n }) };
}

describe("runReminderCheck", () => {
  it("notifies once per renewal, even across repeated checks", () => {
    const { store, sent, run } = setup();
    store.createSubscription(sub("Netflix", "2026-10-20"));
    expect(run()).toBe(1);
    expect(run()).toBe(0);
    expect(run(new Date(2026, 9, 19, 12, 0))).toBe(0);
    expect(sent).toHaveLength(1);
    expect(sent[0]?.title).toBe("Netflix renews in 2 days");
  });

  it("sends a single summary for several due renewals", () => {
    const { store, sent, run } = setup();
    store.createSubscription(sub("A", "2026-10-19"));
    store.createSubscription(sub("B", "2026-10-20"));
    expect(run()).toBe(2);
    expect(sent).toHaveLength(1);
    expect(sent[0]?.title).toBe("2 subscriptions renew soon");
  });

  it("does nothing when disabled or before the reminder hour", () => {
    const { store, sent, run } = setup();
    store.createSubscription(sub("Netflix", "2026-10-20"));
    expect(run(new Date(2026, 9, 18, 7, 0))).toBe(0);
    store.savePreferences({ remindersEnabled: false });
    expect(run()).toBe(0);
    expect(sent).toHaveLength(0);
  });

  it("retries later when the notification could not be shown", () => {
    const { store, run } = setup();
    store.createSubscription(sub("Netflix", "2026-10-20"));
    expect(run(NOW, () => false)).toBe(0);
    expect(run()).toBe(1);
  });

  it("re-arms after the renewal date is edited, and the log follows deletes", () => {
    const { store, sent, run } = setup();
    const created = store.createSubscription(sub("Netflix", "2026-10-20"));
    run();
    store.updateSubscription(created.id, sub("Netflix", "2026-10-19"));
    expect(run()).toBe(1);
    expect(sent).toHaveLength(2);
    store.removeSubscription(created.id);
    expect(store.getSentReminderKeys().size).toBe(0); // ON DELETE CASCADE
  });

  it("respects the lead-days preference", () => {
    const { store, run } = setup();
    store.createSubscription(sub("Netflix", "2026-10-25"));
    expect(run()).toBe(0);
    store.savePreferences({ reminderLeadDays: 7 });
    expect(run()).toBe(1);
  });
});
