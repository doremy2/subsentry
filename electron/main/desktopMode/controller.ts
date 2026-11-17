import type { ZOrderHelper } from "./helper";
import { hwndFromHandle } from "./protocol";

export type WindowEvent = "blur" | "show" | "restore" | "minimize";

/** The slice of BrowserWindow the controller needs (so it can be tested with a fake). */
export interface ManagedWindow {
  getNativeWindowHandle(): Buffer;
  isDestroyed(): boolean;
  isFocused(): boolean;
  setSkipTaskbar(skip: boolean): void;
  moveTop(): void;
  restore(): void;
  on(event: WindowEvent, listener: () => void): void;
  removeListener(event: WindowEvent, listener: () => void): void;
}

export interface DesktopModeDeps {
  win: ManagedWindow;
  helper: ZOrderHelper;
  /** Called once if desktop mode cannot work (helper failed to start, or keeps failing). It is already switched off. */
  onUnavailable(reason: string): void;
  log?: (...args: unknown[]) => void;
  /** Wait after a blur/show before pushing down, so we act after Windows finished its own z-order change. */
  settleMs?: number;
}

export interface DesktopMode {
  /** Turn on. Resolves true if active, false if it could not start (onUnavailable was called). */
  enable(): Promise<boolean>;
  disable(): void;
  /** The manager (expanded view) behaves like a normal window: desktop mode pauses while it is open. */
  setExpanded(expanded: boolean): void;
  isActive(): boolean;
}

const EVENTS: WindowEvent[] = ["blur", "show", "restore", "minimize"];
const MAX_CONSECUTIVE_FAILURES = 3;

/**
 * Keeps the widget behind normal windows while it stays clickable.
 *  - clicking it raises it (Windows activates it), and when focus leaves ("blur") it is pushed back down
 *  - it is hidden from the taskbar (it is a desktop gadget; the tray icon brings it back)
 *  - "Show desktop" (Win+D) minimizes windows: a minimize is undone immediately so the widget stays put
 * Everything OS-specific lives in the helper; if it fails three times in a row the mode switches itself off.
 */
export function createDesktopMode({ win, helper, onUnavailable, log = () => {}, settleMs = 60 }: DesktopModeDeps): DesktopMode {
  let active = false;
  let wanted = false;
  let expanded = false;
  let failures = 0;
  let timer: NodeJS.Timeout | undefined;
  let enabling: Promise<boolean> | null = null;

  const schedule = (delay = settleMs) => {
    clearTimeout(timer);
    timer = setTimeout(() => void sendToBottom(), delay);
  };

  async function sendToBottom(): Promise<void> {
    if (!active || expanded || win.isDestroyed()) return;
    const hwnd = hwndFromHandle(win.getNativeWindowHandle());
    if (!hwnd) return fail("The window handle was not available.");
    try {
      await helper.bottom(hwnd);
      failures = 0;
    } catch (error) {
      failures += 1;
      log("push to bottom failed", error);
      if (failures >= MAX_CONSECUTIVE_FAILURES) fail(error instanceof Error ? error.message : "Pushing the window down failed.");
    }
  }

  const onBlur = () => schedule();
  // Shown/restored because the user asked for it (tray click, notification click: those also focus the window)
  // must stay in front until focus leaves; shown/restored by the system without focus goes back down.
  const onShow = () => !win.isFocused() && schedule();
  const onRestore = () => !win.isFocused() && schedule();
  const onMinimize = () => {
    // "Show desktop" minimizes everything; keep the widget visible.
    if (!active || expanded || win.isDestroyed()) return;
    log("minimized (Show desktop?): restoring");
    win.restore();
    schedule();
  };
  const handlers: Record<WindowEvent, () => void> = { blur: onBlur, show: onShow, restore: onRestore, minimize: onMinimize };

  function detach() {
    for (const event of EVENTS) win.removeListener(event, handlers[event]);
    clearTimeout(timer);
  }

  function fail(reason: string) {
    log("desktop mode unavailable:", reason);
    disable();
    onUnavailable(reason);
  }

  function disable() {
    wanted = false;
    const wasActive = active;
    active = false;
    detach();
    helper.dispose();
    if (wasActive && !win.isDestroyed()) {
      win.setSkipTaskbar(false);
      win.moveTop(); // bring the widget back into view
    }
  }

  return {
    enable() {
      if (active) return Promise.resolve(true);
      if (enabling) return enabling;
      wanted = true;
      enabling = (async () => {
        try {
          await helper.start();
        } catch (error) {
          wanted = false;
          onUnavailable(error instanceof Error ? error.message : "The desktop-mode helper could not start.");
          return false;
        } finally {
          enabling = null;
        }
        if (!wanted || win.isDestroyed()) {
          helper.dispose(); // turned off (or the window closed) while the helper was starting
          return false;
        }
        active = true;
        failures = 0;
        win.setSkipTaskbar(true);
        for (const event of EVENTS) win.on(event, handlers[event]);
        schedule(0);
        return true;
      })();
      return enabling;
    },
    disable,
    setExpanded(next) {
      if (expanded === next) return;
      expanded = next;
      if (!active) return;
      if (expanded) clearTimeout(timer);
      else schedule(); // back to the compact widget: return to the desktop layer
    },
    isActive: () => active,
  };
}
