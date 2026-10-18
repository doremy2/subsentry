import { app, BrowserWindow, Menu, powerMonitor } from "electron";
import squirrelStartup from "electron-squirrel-startup";
import { join } from "node:path";
import type { Preferences } from "../../src/data/types";
import { CHANNELS } from "../shared/api";
import { openDatabase } from "./db/database";
import { createStore } from "./db/store";
import { selectDetector, shouldUseMockDetection } from "./detection";
import { registerIpc } from "./ipc";
import { createReminderScheduler, type ReminderScheduler } from "./reminders/scheduler";
import { applyAlwaysOnTop, isMac, isWindows, setLaunchOnLogin, showNotification } from "./platform";
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

  const applyPreferences = (prefs: Preferences, patch: Partial<Preferences>) => {
    if (patch.alwaysOnTop !== undefined) applyAlwaysOnTop(win, prefs.alwaysOnTop);
    if (patch.launchOnLogin !== undefined) setLaunchOnLogin(prefs.launchOnLogin);
    tray?.update({ alwaysOnTop: prefs.alwaysOnTop });
  };

  tray = createTray({
    assetsDir,
    onToggleVisibility: () => widget?.toggleVisibility(),
    onToggleAlwaysOnTop(next) {
      // Change from the tray menu: persist, apply, and tell the UI so its switch updates.
      const prefs = store.savePreferences({ alwaysOnTop: next });
      applyPreferences(prefs, { alwaysOnTop: next });
      if (!win.isDestroyed()) win.webContents.send(CHANNELS.preferencesChanged, prefs);
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
    setMode: (mode) => widget?.setMode(mode),
    hideWindow: () => widget?.hide(),
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
  reminders?.stop();
});

// Stay alive in the tray / menu bar when the window is hidden or closed.
app.on("window-all-closed", () => {
  if (quitting && !isMac && !isWindows) app.quit();
});

export type { BrowserWindow };
