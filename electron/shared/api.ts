import type { Preferences, WidgetMode } from "../../src/data/types";
import type { DetectionOutcome, Transaction } from "../../src/domain/detection/types";
import type { Subscription, SubscriptionInput } from "../../src/domain/subscription";

/** IPC channel names, shared by main and preload so they cannot drift apart. */
export const CHANNELS = {
  subscriptionsList: "subscriptions:list",
  subscriptionsCreate: "subscriptions:create",
  subscriptionsUpdate: "subscriptions:update",
  subscriptionsRemove: "subscriptions:remove",
  preferencesLoad: "preferences:load",
  preferencesSave: "preferences:save",
  preferencesChanged: "preferences:changed", // main -> renderer push
  windowSetMode: "window:setMode",
  windowHide: "window:hide",
  appQuit: "app:quit",
  systemTestNotification: "system:testNotification",
  detectionAnalyze: "detection:analyze",
} as const;

/** Every IPC reply is wrapped so errors cross the boundary as readable messages. */
export type IpcResult<T> = { ok: true; value: T } | { ok: false; error: string };

/**
 * The only surface the renderer gets from the main process
 * (exposed as `window.subsentry` by the preload script).
 */
export interface SubSentryApi {
  platform: "darwin" | "win32" | "linux";
  subscriptions: {
    list(): Promise<Subscription[]>;
    create(input: SubscriptionInput): Promise<Subscription>;
    update(id: string, input: SubscriptionInput): Promise<Subscription>;
    remove(id: string): Promise<void>;
  };
  preferences: {
    load(): Promise<Preferences>;
    save(patch: Partial<Preferences>): Promise<Preferences>;
    /** Fired when preferences change outside the UI (e.g. tray menu). Returns unsubscribe. */
    onChanged(listener: (preferences: Preferences) => void): () => void;
  };
  window: {
    setMode(mode: WidgetMode): Promise<void>;
    /** Hide to the tray / menu bar. */
    hide(): Promise<void>;
  };
  app: { quit(): Promise<void> };
  system: { showTestNotification(): Promise<void> };
  detection: {
    /**
     * Analyze imported transactions locally in the main process. Always resolves
     * (errors are in the outcome). Transactions are not stored or logged.
     */
    analyze(transactions: Transaction[]): Promise<DetectionOutcome>;
  };
}
