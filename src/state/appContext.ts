import { createContext, useContext } from "react";
import type { Preferences, WidgetMode } from "../data/types";
import type { Subscription, SubscriptionInput } from "../domain/subscription";

export type AppStatus = "loading" | "ready" | "error";

export interface AppState {
  status: AppStatus;
  /** Set when status is "error" (startup failure). */
  fatalError: string | null;
  subscriptions: Subscription[];
  preferences: Preferences;
  /** Transient, non-fatal problem (e.g. a failed delete) shown as a dismissible banner. */
  notice: string | null;
}

export interface AppActions {
  /** Mutations reject on failure so forms can show the reason; the list is updated on success. */
  addSubscription(input: SubscriptionInput): Promise<void>;
  updateSubscription(id: string, input: SubscriptionInput): Promise<void>;
  removeSubscription(id: string): Promise<void>;
  updatePreferences(patch: Partial<Preferences>): Promise<void>;
  setMode(mode: WidgetMode): Promise<void>;
  hideWindow(): Promise<void>;
  quit(): Promise<void>;
  showTestNotification(): Promise<void>;
  /** "darwin" | "win32" | "linux" in Electron, "web" in a browser preview. */
  platform: string;
  reportError(error: unknown): void;
  dismissNotice(): void;
  retry(): void;
}

export const AppContext = createContext<(AppState & AppActions) | null>(null);

export function useApp(): AppState & AppActions {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp must be used inside <AppProvider>");
  return value;
}
