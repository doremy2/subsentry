import { addDays, todayISO } from "../../../src/domain/dates";
import { findDueReminders, formatReminderMessage } from "../../../src/domain/reminders";
import type { Store } from "../db/store";

export interface ReminderDeps {
  store: Store;
  /** Show a notification; return false if it could not be shown (then it is retried later). */
  notify(title: string, body: string): boolean;
  now?: () => Date;
}

const LOG_RETENTION_DAYS = 60;

/**
 * One reminder pass: find due renewals, send ONE notification (a summary when
 * several are due), and record them so they are never sent twice.
 * Returns the number of renewals reminded about.
 */
export function runReminderCheck({ store, notify, now = () => new Date() }: ReminderDeps): number {
  const current = now();
  const prefs = store.loadPreferences();
  const due = findDueReminders(
    store.listSubscriptions(),
    current,
    { enabled: prefs.remindersEnabled, leadDays: prefs.reminderLeadDays, hour: prefs.reminderHour },
    store.getSentReminderKeys(),
  );
  if (due.length === 0) return 0;

  const { title, body } = formatReminderMessage(due);
  if (!notify(title, body)) {
    console.warn("[reminders] notifications unavailable on this system; will retry");
    return 0; // not shown: do not mark as sent
  }
  for (const reminder of due) store.markReminderSent(reminder.subscription.id, reminder.renewalDate);
  store.pruneReminderLog(addDays(todayISO(current), -LOG_RETENTION_DAYS));
  return due.length;
}

export interface ReminderScheduler {
  /** Run a check now (after data or settings change, or on wake from sleep). */
  checkNow(): void;
  stop(): void;
}

const CHECK_INTERVAL_MS = 15 * 60 * 1000;
const STARTUP_DELAY_MS = 5_000;

/** Checks shortly after launch, then every 15 minutes. Errors are logged, never thrown. */
export function createReminderScheduler(deps: ReminderDeps): ReminderScheduler {
  const run = () => {
    try {
      const sent = runReminderCheck(deps);
      if (sent > 0) console.info(`[reminders] reminded about ${sent} renewal(s)`);
    } catch (error) {
      console.error("[reminders] check failed", error);
    }
  };
  const startup = setTimeout(run, STARTUP_DELAY_MS);
  const interval = setInterval(run, CHECK_INTERVAL_MS);
  return {
    checkNow: run,
    stop() {
      clearTimeout(startup);
      clearInterval(interval);
    },
  };
}
