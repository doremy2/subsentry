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

export interface WindowPosition {
  x: number;
  y: number;
}

export interface Preferences {
  accent: Accent;
  /** Surface opacity, 0.4 (see-through) to 1 (solid). */
  opacity: number;
  alwaysOnTop: boolean;
  mode: WidgetMode;
  /** Last widget position in physical pixels, or null before the first move. */
  windowPosition: WindowPosition | null;
}

export const DEFAULT_PREFERENCES: Preferences = {
  accent: "indigo",
  opacity: 0.82,
  alwaysOnTop: false,
  mode: "compact",
  windowPosition: null,
};

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
