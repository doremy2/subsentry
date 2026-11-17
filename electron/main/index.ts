import { spawn } from "node:child_process";
import { app, BrowserWindow, Menu, powerMonitor } from "electron";
import squirrelStartup from "electron-squirrel-startup";
import { join } from "node:path";
import type { Preferences } from "../../src/data/types";
import { CHANNELS } from "../shared/api";
import { openDatabase } from "./db/database";
import { createStore } from "./db/store";
import { selectDetector, shouldUseMockDetection } from "./detection";
import { DEFAULT_SIZES } from "../shared/windowSizes";
import { registerIpc } from "./ipc";
import { createReminderScheduler, type ReminderScheduler } from "./reminders/scheduler";
import { createDesktopMode, type DesktopMode, type ManagedWindow } from "./desktopMode/controller";
import { createZOrderHelper } from "./desktopMode/helper";
import { applyAlwaysOnTop, isMac, isWindows, powershellPath, setLaunchOnLogin, showNotification, supportsDesktopMode } from "./platform";
import { createTray, type TrayController } from "./tray";
import { createWidgetWindow, type WidgetWindow } from "./window";

// Windows needs an AppUserModelID for toast notifications and a stable taskbar identity.
if (isWindows) app.setAppUserModelId("com.subsentry.app");

// Windows installer (Squirrel) launches the app with special flags during install/uninstall.
if (squirrelStartup) app.quit();

let quitting = false;
let widget: WidgetWindow | undefined;
let tray: TrayController | undefined;
let reminders: ReminderScheduler | undefined;
let desktop: DesktopMode | undefined;

// One instance only: a second launch just brings the widget forward.
if (!app.requestSingleInstanceLock()) app.quit();
else app.on("second-instance", () => widget?.show());

/** macOS needs an app menu for Cmd+C/V/Q to work; Windows needs none. */
function installMenu(): void {
  if (!isMac) {
    Menu.setApplicationMenu(null);
    return;
  }
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      { role: "appMenu" },
      { role: "editMenu" },
      { role: "windowMenu" },
    ]),
  );
}

void app.whenReady().then(() => {
  installMenu();
  const assetsDir = app.isPackaged ? process.resourcesPath : join(app.getAppPath(), "assets");
  const store = createStore(openDatabase(join(app.getPath("userData"), "subsentry.db")));
  const initial = store.loadPreferences();

  widget = createWidgetWindow(store, { mode: initial.mode, alwaysOnTop: initial.alwaysOnTop, isQuitting: () => quitting });
  const win = widget.window;
  setLaunchOnLogin(initial.launchOnLogin);

  /** Tell the UI about preference changes made here (conflicts between modes, failures, the tray menu). */
  const pushPrefs = (prefs: Preferences) => {
    if (!win.isDestroyed()) win.webContents.send(CHANNELS.preferencesChanged, prefs);
  };

  // Windows "Desktop mode": keep the widget behind other windows. Experimental and opt-in.
  if (supportsDesktopMode) {
    const debug = process.env["SUBSENTRY_DEBUG_DESKTOP"] === "1";
    const log = (...args: unknown[]) => debug && console.info("[desktop-mode]", ...args);
    const managed: ManagedWindow = {
      getNativeWindowHandle: () => win.getNativeWindowHandle(),
      isDestroyed: () => win.isDestroyed(),
      isFocused: () => win.isFocused(),
      setSkipTaskbar: (skip) => win.setSkipTaskbar(skip),
      moveTop: () => win.moveTop(),
      restore: () => win.restore(),
      on: (event, listener) => void win.on(event as "blur", listener),
      removeListener: (event, listener) => void win.removeListener(event as "blur", listener),
    };
    desktop = createDesktopMode({
      win: managed,
      helper: createZOrderHelper({ spawn, executable: powershellPath(), log }),
      log,
      onUnavailable(reason) {
        console.warn("[desktop-mode] unavailable:", reason);
        pushPrefs(store.savePreferences({ desktopMode: false })); // switch itself off so the UI is honest
        showNotification("SubSentry", "Desktop mode could not start and was turned off. The widget works normally.");
      },
    });
    desktop.setExpanded(initial.mode === "expanded");
    if (initial.desktopMode) void desktop.enable();
  }

  const applyPreferences = (prefs: Preferences, patch: Partial<Preferences>) => {
    let current = prefs;
    // Always on top and desktop mode contradict each other: whichever was just switched on wins.
    if (patch.desktopMode === true && current.alwaysOnTop) {
      current = store.savePreferences({ alwaysOnTop: false });
      applyAlwaysOnTop(win, false);
      pushPrefs(current);
    }
    if (patch.alwaysOnTop === true && current.desktopMode) {
      current = store.savePreferences({ desktopMode: false });
      desktop?.disable();
      pushPrefs(current);
    }
    if (patch.alwaysOnTop !== undefined && current.alwaysOnTop) applyAlwaysOnTop(win, true);
    else if (patch.alwaysOnTop !== undefined) applyAlwaysOnTop(win, false);
    if (patch.desktopMode !== undefined) {
      if (!desktop) {
        if (current.desktopMode) pushPrefs((current = store.savePreferences({ desktopMode: false }))); // unsupported platform
      } else if (current.desktopMode) void desktop.enable();
      else desktop.disable();
    }
    if (patch.launchOnLogin !== undefined) setLaunchOnLogin(current.launchOnLogin);
    if (patch.compactLayout !== undefined) widget?.applyLayout(); // each layout has its own size
    tray?.update({ alwaysOnTop: current.alwaysOnTop });
  };

  tray = createTray({
    assetsDir,
    onToggleVisibility: () => widget?.toggleVisibility(),
    onToggleAlwaysOnTop(next) {
      // Change from the tray menu: persist, apply, and tell the UI so its switch updates.
      const prefs = store.savePreferences({ alwaysOnTop: next });
      applyPreferences(prefs, { alwaysOnTop: next });
      pushPrefs(store.loadPreferences()); // re-read: applying may have switched desktop mode off
    },
    onQuit: () => app.quit(),
  });
  tray.update({ alwaysOnTop: initial.alwaysOnTop });

  // Renewal reminders: clicking the notification brings the widget forward.
  reminders = createReminderScheduler({
    store,
    notify: (title, body) => showNotification(title, body, () => widget?.show()),
  });
  powerMonitor.on("resume", () => reminders?.checkNow()); // laptop woke up: catch up

  registerIpc({
    store,
    trustedSender: () => (win.isDestroyed() ? undefined : win.webContents),
    setMode: (mode) => {
      widget?.setMode(mode);
      desktop?.setExpanded(mode === "expanded"); // the manager behaves like a normal window
    },
    hideWindow: () => widget?.hide(),
    beginResize: (axis) => widget?.beginResize(axis),
    endResize: () => widget?.endResize(),
    resetSize: () => widget?.resetSize(),
    setLayoutSize: (layout, size) => widget?.setLayoutSize(layout, size) ?? size,
    getLayoutSizes: () => widget?.getLayoutSizes() ?? DEFAULT_SIZES,
    quit: () => app.quit(),
    applyPreferences,
    showTestNotification: () => void showNotification("SubSentry", "Notifications are working. You will be reminded before renewals.", () => widget?.show()),
    onDataChanged: () => reminders?.checkNow(),
    detector: selectDetector(shouldUseMockDetection(app.isPackaged, process.env)),
  });

  // macOS: clicking the Dock icon should bring the widget back.
  app.on("activate", () => widget?.show());
});

app.on("before-quit", () => {
  quitting = true;
  desktop?.disable();
  reminders?.stop();
});

// Stay alive in the tray / menu bar when the window is hidden or closed.
app.on("window-all-closed", () => {
  if (quitting && !isMac && !isWindows) app.quit();
});

export type { BrowserWindow };
