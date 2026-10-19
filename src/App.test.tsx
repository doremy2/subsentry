// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { withApp, appValue } from "./components/import/testUtils";
import { DEFAULT_PREFERENCES } from "./data/types";

afterEach(() => {
  cleanup();
  delete document.documentElement.dataset["theme"];
});

describe("App appearance", () => {
  it("applies theme, accent and transparency to the document", () => {
    render(withApp(appValue({ preferences: { ...DEFAULT_PREFERENCES, theme: "sunset", accent: "teal", opacity: 0.55 } }), <App />));
    expect(document.documentElement.dataset["theme"]).toBe("sunset");
    expect(document.documentElement.dataset["accent"]).toBe("teal");
    expect(document.documentElement.style.getPropertyValue("--surface-alpha")).toBe("0.55");
  });

  it("follows theme changes", () => {
    const { rerender } = render(withApp(appValue({ preferences: { ...DEFAULT_PREFERENCES, theme: "graphite" } }), <App />));
    expect(document.documentElement.dataset["theme"]).toBe("graphite");
    rerender(withApp(appValue({ preferences: { ...DEFAULT_PREFERENCES, theme: "light" } }), <App />));
    expect(document.documentElement.dataset["theme"]).toBe("light");
  });

  it("shows the resize grips in the desktop app once loaded, but not in a browser preview or while loading", () => {
    const { unmount } = render(withApp(appValue({ platform: "darwin" }), <App />));
    expect(screen.getByTestId("grip-both")).toBeTruthy();
    unmount();
    cleanup();
    render(withApp(appValue({ platform: "web" }), <App />));
    expect(screen.queryByTestId("grip-both")).toBeNull();
    cleanup();
    render(withApp(appValue({ platform: "darwin", status: "loading" }), <App />));
    expect(screen.queryByTestId("grip-both")).toBeNull();
  });
});
