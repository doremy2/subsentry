// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCES, THEMES } from "../../data/types";
import { appValue, withApp } from "../import/testUtils";
import { SettingsPanel } from "./SettingsPanel";

afterEach(cleanup);

describe("SettingsPanel appearance and layout", () => {
  it("offers every theme and marks the current one", () => {
    render(withApp(appValue({ preferences: { ...DEFAULT_PREFERENCES, theme: "aurora" } }), <SettingsPanel />));
    const group = screen.getByRole("radiogroup", { name: "Theme" });
    expect(group.querySelectorAll('[role="radio"]')).toHaveLength(THEMES.length);
    expect(screen.getByRole("radio", { name: "Aurora" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("radio", { name: "Midnight" }).getAttribute("aria-checked")).toBe("false");
  });

  it("changing the theme persists it through updatePreferences", () => {
    const value = appValue();
    render(withApp(value, <SettingsPanel />));
    fireEvent.click(screen.getByRole("radio", { name: "Light" }));
    expect(value.updatePreferences).toHaveBeenCalledWith({ theme: "light" });
  });

  it("switches the compact layout", () => {
    const value = appValue();
    render(withApp(value, <SettingsPanel />));
    fireEvent.click(screen.getByRole("radio", { name: "Minimal" }));
    expect(value.updatePreferences).toHaveBeenCalledWith({ compactLayout: "minimal" });
  });

  it("adjusts transparency", () => {
    const value = appValue();
    render(withApp(value, <SettingsPanel />));
    fireEvent.change(screen.getByLabelText("Surface opacity"), { target: { value: "0.6" } });
    expect(value.updatePreferences).toHaveBeenCalledWith({ opacity: 0.6 });
  });

  it("resets the window size in the desktop app, and hides the button in a browser", () => {
    const value = appValue({ platform: "darwin" });
    const { unmount } = render(withApp(value, <SettingsPanel />));
    fireEvent.click(screen.getByText("Reset window size"));
    expect(value.resetWindowSize).toHaveBeenCalledTimes(1);
    unmount();
    render(withApp(appValue({ platform: "web" }), <SettingsPanel />));
    expect(screen.queryByText("Reset window size")).toBeNull();
  });

  it("offers Desktop mode (experimental) on Windows only", () => {
    const { unmount } = render(withApp(appValue({ platform: "win32" }), <SettingsPanel />));
    expect(screen.getByRole("switch", { name: "Desktop mode" })).toBeTruthy();
    expect(screen.getByText("EXPERIMENTAL")).toBeTruthy();
    unmount();
    for (const platform of ["darwin", "linux", "web"]) {
      render(withApp(appValue({ platform }), <SettingsPanel />));
      expect(screen.queryByRole("switch", { name: "Desktop mode" })).toBeNull();
      cleanup();
    }
  });

  it("toggling Desktop mode persists the preference and reflects the saved value", () => {
    const value = appValue({ platform: "win32", preferences: { ...DEFAULT_PREFERENCES, desktopMode: true } });
    render(withApp(value, <SettingsPanel />));
    const toggle = screen.getByRole("switch", { name: "Desktop mode" }) as HTMLInputElement;
    expect(toggle.checked).toBe(true);
    fireEvent.click(toggle);
    expect(value.updatePreferences).toHaveBeenCalledWith({ desktopMode: false });
  });
});
