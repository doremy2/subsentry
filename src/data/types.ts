import type { Subscription, SubscriptionInput } from "../domain/subscription";

/** Failure from the persistence layer; `cause` keeps the original error. */
export class DataError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "DataError";
  }
}

/**
 * Storage contract for subscriptions. UI code depends only on this interface,
 * so the backing store (SQLite today, anything later) can change freely.
 */
export interface SubscriptionRepository {
  list(): Promise<Subscription[]>;
  create(input: SubscriptionInput): Promise<Subscription>;
  update(id: string, input: SubscriptionInput): Promise<Subscription>;
  remove(id: string): Promise<void>;
}

export const ACCENTS = ["indigo", "teal", "rose", "amber"] as const;
export type Accent = (typeof ACCENTS)[number];

export type WidgetMode = "compact" | "expanded";

export interface Preferences {
  accent: Accent;
  /** Surface opacity, 0.4 (see-through) to 1 (solid). */
  opacity: number;
  alwaysOnTop: boolean;
  mode: WidgetMode;
  /** Start SubSentry when the user logs in (applied through the OS login-item API). */
  launchOnLogin: boolean;
  /** Send native notifications before renewals. */
  remindersEnabled: boolean;
  /** How many days before a renewal to remind (0 = on the day itself). */
  reminderLeadDays: number;
  /** Local hour of day (0-23) after which reminders may be sent. */
  reminderHour: number;
}

export const DEFAULT_PREFERENCES: Preferences = {
  accent: "indigo",
  opacity: 0.82,
  alwaysOnTop: false,
  mode: "compact",
  launchOnLogin: false,
  remindersEnabled: true,
  reminderLeadDays: 3,
  reminderHour: 9,
};

export const REMINDER_LEAD_OPTIONS = [0, 1, 2, 3, 5, 7, 14] as const;
export const REMINDER_MAX_LEAD_DAYS = 30;

export const OPACITY_RANGE = { min: 0.4, max: 1 } as const;

export interface PreferencesRepository {
  load(): Promise<Preferences>;
  /** Merge `patch` into stored preferences and return the result. */
  save(patch: Partial<Preferences>): Promise<Preferences>;
}

export interface DataServices {
  subscriptions: SubscriptionRepository;
  preferences: PreferencesRepository;
}
