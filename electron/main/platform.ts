import { app, Notification, nativeImage, type BrowserWindow, type BrowserWindowConstructorOptions, type NativeImage } from "electron";
import { createHash } from "node:crypto";
import { hostname, userInfo } from "node:os";
import { join } from "node:path";

/**
 * The ONE place OS differences live. Everything else in the main process calls
 * these helpers instead of checking `process.platform`.
 */

export const isMac = process.platform === "darwin";
export const isWindows = process.platform === "win32";

/** Frameless, transparent, non-resizable widget window options. */
export function widgetWindowOptions(): BrowserWindowConstructorOptions {
  return {
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    hasShadow: false, // the card draws its own soft shadow
    resizable: false, // size changes only via our compact/expanded modes
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: false,
    show: false,
    // macOS: keep the traffic lights out of a frameless widget.
    ...(isMac && { titleBarStyle: "hidden" as const, trafficLightPosition: { x: -100, y: -100 } }),
  };
}

/** macOS needs a higher window level than the default for "always on top" to beat full-screen-adjacent windows. */
export function applyAlwaysOnTop(win: BrowserWindow, enabled: boolean): void {
  if (isMac) win.setAlwaysOnTop(enabled, "floating");
  else win.setAlwaysOnTop(enabled);
}

/** Whether the OS lets us toggle launch-at-login (packaged apps only). */
export function setLaunchOnLogin(enabled: boolean): void {
  if (!app.isPackaged) return; // would register the dev Electron binary
  app.setLoginItemSettings({ openAtLogin: enabled });
}

export function getLaunchOnLogin(): boolean {
  return app.getLoginItemSettings().openAtLogin;
}

/** Tray (Windows) / menu bar (macOS) icon. macOS gets a monochrome "template" image that adapts to light/dark. */
export function loadTrayIcon(assetsDir: string): NativeImage {
  const file = isMac ? "trayTemplate.png" : "tray.png";
  const image = nativeImage.createFromPath(join(assetsDir, "tray", file));
  if (isMac) image.setTemplateImage(true);
  return image;
}

export function showNotification(title: string, body: string): void {
  if (!Notification.isSupported()) return;
  new Notification({ title, body, silent: false }).show();
}

/** Stable per-machine id (hash of host + user); never leaves the device. */
export function deviceId(): string {
  return createHash("sha256").update(`${hostname()}|${userInfo().username}|${process.platform}`).digest("hex").slice(0, 16);
}
