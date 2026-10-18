import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createDataServices, DEFAULT_PREFERENCES, type DataServices, type WidgetMode } from "../data";
import { createWindowService, type WindowService } from "../desktop/windowService";
import type { Subscription } from "../domain/subscription";
import { AppContext, type AppActions, type AppState } from "./appContext";

interface Runtime {
  data: DataServices;
  win: WindowService;
}

/** Created once per page load. */
let runtime: Runtime | null = null;
function getRuntime(): Runtime {
  runtime ??= { data: createDataServices(), win: createWindowService() };
  return runtime;
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
  const runtimeRef = useRef<Runtime | null>(null);

  // Startup: load data, then subscribe to preference changes made from the tray menu.
  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, status: "loading", fatalError: null }));
    const rt = getRuntime();
    runtimeRef.current = rt;

    const stopWatching = rt.win.onPreferencesChanged((preferences) => setState((s) => ({ ...s, preferences })));

    Promise.all([rt.data.preferences.load(), rt.data.subscriptions.list()])
      .then(([preferences, subscriptions]) => {
        if (!cancelled) setState((s) => ({ ...s, status: "ready", preferences, subscriptions }));
      })
      .catch((error: unknown) => {
        if (!cancelled) setState((s) => ({ ...s, status: "error", fatalError: describeError(error) }));
      });

    return () => {
      cancelled = true;
      stopWatching();
    };
  }, [attempt]);

  const reportError = useCallback((error: unknown) => setState((s) => ({ ...s, notice: describeError(error) })), []);

  const actions = useMemo<AppActions>(() => {
    const rt = () => {
      if (!runtimeRef.current) throw new Error("The app is still starting up.");
      return runtimeRef.current;
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
        const { data } = rt();
        setState((s) => ({ ...s, preferences: { ...s.preferences, ...patch } })); // optimistic: sliders must feel instant
        await data.preferences.save(patch); // the main process applies always-on-top / login item
      },
      async setMode(mode: WidgetMode) {
        await rt().win.setMode(mode); // main resizes the window and persists the mode
        setState((s) => ({ ...s, preferences: { ...s.preferences, mode } }));
      },
      hideWindow: () => rt().win.hide(),
      beginResize: (axis) => rt().win.beginResize(axis),
      endResize: () => rt().win.endResize(),
      resetWindowSize: () => rt().win.resetSize(),
      quit: () => rt().win.quit(),
      showTestNotification: () => rt().win.showTestNotification(),
      platform: getRuntime().win.platform,
      reportError,
      dismissNotice: () => setState((s) => ({ ...s, notice: null })),
      retry: () => setAttempt((n) => n + 1),
    };
  }, [reportError]);

  const value = useMemo(() => ({ ...state, ...actions }), [state, actions]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

