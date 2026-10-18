import { Menu, Tray } from "electron";
import { loadTrayIcon } from "./platform";

export interface TrayController {
  /** Rebuild the context menu so check marks reflect current preferences. */
  update(state: { alwaysOnTop: boolean }): void;
  destroy(): void;
}

interface TrayHandlers {
  assetsDir: string;
  onToggleVisibility(): void;
  onToggleAlwaysOnTop(next: boolean): void;
  onQuit(): void;
}

/** System tray icon on Windows, menu bar item on macOS. Left click toggles the widget; right click opens the menu. */
export function createTray(handlers: TrayHandlers): TrayController {
  const tray = new Tray(loadTrayIcon(handlers.assetsDir));
  tray.setToolTip("SubSentry");
  let alwaysOnTop = false;

  const buildMenu = () =>
    Menu.buildFromTemplate([
      { label: "Show / Hide SubSentry", click: handlers.onToggleVisibility },
      { label: "Always on top", type: "checkbox", checked: alwaysOnTop, click: (item) => handlers.onToggleAlwaysOnTop(item.checked) },
      { type: "separator" },
      { label: "Quit SubSentry", click: handlers.onQuit },
    ]);

  tray.on("click", handlers.onToggleVisibility);
  tray.on("right-click", () => tray.popUpContextMenu(buildMenu()));

  return {
    update(state) {
      alwaysOnTop = state.alwaysOnTop;
    },
    destroy: () => tray.destroy(),
  };
}
