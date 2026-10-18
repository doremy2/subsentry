import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createDataServices, DEFAULT_PREFERENCES, type DataServices, type Preferences, type WidgetMode } from "../data";
import { createWindowService, type WindowService } from "../desktop/windowService";
import type { Subscription, SubscriptionInput } from "../domain/subscription";
import { AppContext, type AppActions, type AppState } from "./appContext";

interface Runtime {
  data: DataServices;
  win: WindowService;
}

/** Created once per page load, so concurrent mounts can never open/seed the database twice. */
let runtimePromise: Promise<Runtime> | null = null;
function getRuntime(): Promise<Runtime> {
  runtimePromise ??= (async () => {
    const [data, win] = await Promise.all([createDataServices(), createWindowService()]);
    return { data, win };
  })();
  return runtimePromise;
}

export function describeError(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

const sortByMerchant = (list: Subscription[]) => [...list].sort((a, b) => a.merchant.localeCompare(b.merchant));

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    status: "loading",
    fatalError: null,
    subscriptions: [],
    preferences: DEFAULT_PREFERENCES,
    notice: null,
  });
  const [attempt, setAttempt] = useState(0);
  const runtime = useRef<Runtime | null>(null);

  // Startup: load data, restore window state, then reveal the (initially hidden) window.
  useEffect(() => {
    let cancelled = false;
    let stopWatchingMoves: (() => void) | undefined;
    setState((s) => ({ ...s, status: "loading", fatalError: null }));

    (async () => {
      let win: WindowService | null = null;
      try {
        runtimePromise = attempt === 0 ? runtimePromise : null; // a retry re-opens everything
        const rt = await getRuntime();
        win = rt.win;
        runtime.current = rt;
        const [preferences, subscriptions] = await Promise.all([rt.data.preferences.load(), rt.data.subscriptions.list()]);
        if (cancelled) return;

        await rt.win.restorePosition(preferences.windowPosition);
        await rt.win.applyMode(preferences.mode);
        await rt.win.setAlwaysOnTop(preferences.alwaysOnTop);
        stopWatchingMoves = await rt.win.onMoved((windowPosition) => {
          void rt.data.preferences.save({ windowPosition }).catch(() => {});
        });

        setState((s) => ({ ...s, status: "ready", preferences, subscriptions }));
      } catch (error) {
        if (!cancelled) setState((s) => ({ ...s, status: "error", fatalError: describeError(error) }));
      } finally {
        // Always reveal the window, even on failure, so the user can see the error.
        await win?.show().catch(() => {});
      }
    })();

    return () => {
      cancelled = true;
      stopWatchingMoves?.();
    };
  }, [attempt]);

  const reportError = useCallback((error: unknown) => setState((s) => ({ ...s, notice: describeError(error) })), []);

  const actions = useMemo<AppActions>(() => {
    const rt = () => {
      if (!runtime.current) throw new Error("The app is still starting up.");
      return runtime.current;
    };

    return {
      async addSubscription(input) {
        const created = await rt().data.subscriptions.create(input);
        setState((s) => ({ ...s, subscriptions: sortByMerchant([...s.subscriptions, created]) }));
      },
      async updateSubscription(id, input) {
        const updated = await rt().data.subscriptions.update(id, input);
        setState((s) => ({ ...s, subscriptions: sortByMerchant(s.subscriptions.map((x) => (x.id === id ? updated : x))) }));
      },
      async removeSubscription(id) {
        await rt().data.subscriptions.remove(id);
        setState((s) => ({ ...s, subscriptions: s.subscriptions.filter((x) => x.id !== id) }));
      },
      async updatePreferences(patch) {
        const { data, win } = rt();
        setState((s) => ({ ...s, preferences: { ...s.preferences, ...patch } })); // optimistic: sliders must feel instant
        if (patch.alwaysOnTop !== undefined) await win.setAlwaysOnTop(patch.alwaysOnTop);
        await data.preferences.save(patch);
      },
      async setMode(mode: WidgetMode) {
        const { data, win } = rt();
        await win.applyMode(mode);
        setState((s) => ({ ...s, preferences: { ...s.preferences, mode } }));
        await data.preferences.save({ mode });
      },
      hideWindow: () => rt().win.hide(),
      quit: () => rt().win.quit(),
      reportError,
      dismissNotice: () => setState((s) => ({ ...s, notice: null })),
      retry: () => setAttempt((n) => n + 1),
    };
  }, [reportError]);

  const value = useMemo(() => ({ ...state, ...actions }), [state, actions]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export type { Preferences, SubscriptionInput };
