import { daysBetween, nextOccurrence, parseISODate, todayISO } from "./dates";
import { formatMoney } from "./money";
import type { ISODate, Subscription } from "./subscription";

/** Pure reminder rules: decides WHAT is due. Sending and bookkeeping live in the main process. */

export interface ReminderSettings {
  enabled: boolean;
  /** Remind when the renewal is this many days away or closer. */
  leadDays: number;
  /** Local hour (0-23) before which nothing is sent. */
  hour: number;
}

export interface DueReminder {
  subscription: Subscription;
  /** The renewal date this reminder is about (stale stored dates are rolled forward). */
  renewalDate: ISODate;
  daysUntil: number;
  /** Dedupe key, unique per subscription and renewal occurrence. */
  key: string;
}

export function reminderKey(subscriptionId: string, renewalDate: ISODate): string {
  return `${subscriptionId}|${renewalDate}`;
}

/**
 * Active subscriptions whose next renewal is within the lead window and that
 * have not been reminded about yet. A reminder is sent once per renewal
 * occurrence: editing the renewal date (a new occurrence) re-arms it.
 */
export function findDueReminders(
  subscriptions: readonly Subscription[],
  now: Date,
  settings: ReminderSettings,
  alreadySent: ReadonlySet<string>,
): DueReminder[] {
  if (!settings.enabled || now.getHours() < settings.hour) return [];
  const today = todayISO(now);
  const due: DueReminder[] = [];
  for (const subscription of subscriptions) {
    if (subscription.status !== "active") continue;
    const renewalDate = nextOccurrence(subscription.nextRenewal, subscription.interval, today);
    const daysUntil = daysBetween(today, renewalDate);
    const key = reminderKey(subscription.id, renewalDate);
    if (daysUntil <= settings.leadDays && !alreadySent.has(key)) due.push({ subscription, renewalDate, daysUntil, key });
  }
  return due.sort((a, b) => a.renewalDate.localeCompare(b.renewalDate) || a.subscription.merchant.localeCompare(b.subscription.merchant));
}

function when(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

function shortDate(iso: ISODate): string {
  const p = parseISODate(iso);
  return p ? new Date(p.y, p.m - 1, p.d).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : iso;
}

const MAX_LISTED = 3;

/** One notification per check: a single renewal gets its own message, several are summarised. */
export function formatReminderMessage(due: readonly DueReminder[]): { title: string; body: string } {
  const [first] = due;
  if (!first) return { title: "SubSentry", body: "" };
  if (due.length === 1) {
    const { subscription: sub, daysUntil, renewalDate } = first;
    return {
      title: `${sub.merchant} renews ${when(daysUntil)}`,
      body: `${formatMoney(sub.priceMinor, sub.currency)} · ${shortDate(renewalDate)}`,
    };
  }
  const listed = due.slice(0, MAX_LISTED).map((d) => `${d.subscription.merchant} (${when(d.daysUntil)})`);
  const extra = due.length - listed.length;
  return {
    title: `${due.length} subscriptions renew soon`,
    body: listed.join(", ") + (extra > 0 ? ` +${extra} more` : ""),
  };
}
