// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { buildSeedSubscriptions } from "../../data/seed";
import { DEFAULT_PREFERENCES } from "../../data/types";
import { todayISO } from "../../domain/dates";
import type { Subscription } from "../../domain/subscription";
import { appValue, withApp } from "../import/testUtils";
import { CompactWidget } from "./CompactWidget";

const subscriptions: Subscription[] = buildSeedSubscriptions(todayISO()).map((s, i) => ({ ...s, id: `s${i}`, createdAt: "t", updatedAt: "t" }));

function setHeight(px: number) {
  Object.defineProperty(window, "innerHeight", { value: px, configurable: true });
  act(() => void window.dispatchEvent(new Event("resize")));
}

const renderWidget = (compactLayout: "detailed" | "minimal" = "detailed", platform = "darwin") =>
  render(withApp(appValue({ subscriptions, platform, preferences: { ...DEFAULT_PREFERENCES, compactLayout } }), <CompactWidget />));

afterEach(cleanup);

describe("CompactWidget layouts", () => {
  it("detailed layout shows more upcoming renewals as the window gets taller", () => {
    setHeight(548);
    renderWidget();
    const rowsAt = () => screen.queryAllByRole("button").filter((b) => /(in \d+ days|Tomorrow|Today) ·/.test(b.textContent ?? "")).length;
    expect(rowsAt()).toBe(3);
    setHeight(460);
    expect(rowsAt()).toBe(1);
    setHeight(900);
    expect(rowsAt()).toBe(7); // all remaining active subscriptions fit
  });

  it("always shows the spend, the active count and the next payment", () => {
    setHeight(460);
    renderWidget();
    expect(screen.getByText("Monthly spend")).toBeTruthy();
    expect(screen.getByText(/8 active subscriptions/)).toBeTruthy();
    expect(screen.getByText("Next payment")).toBeTruthy();
  });

  it("minimal layout drops the list and footer but keeps the essentials", () => {
    setHeight(548);
    renderWidget("minimal");
    expect(screen.getByText("Monthly spend")).toBeTruthy();
    expect(screen.getByText("Next payment")).toBeTruthy();
    expect(screen.queryByText("Coming up")).toBeNull();
    expect(screen.queryByText("Manage subscriptions")).toBeNull();
    expect(screen.getByLabelText("Open manager")).toBeTruthy(); // header control still opens the manager
  });

  it("shows resize grips in the desktop app but not in a browser preview", () => {
    setHeight(548);
    const { unmount } = renderWidget("detailed", "win32");
    expect(screen.getByTestId("grip-both")).toBeTruthy();
    unmount();
    renderWidget("detailed", "web");
    expect(screen.queryByTestId("grip-both")).toBeNull();
  });
});
