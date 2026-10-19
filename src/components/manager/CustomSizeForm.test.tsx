// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SIZES, toWindowSize } from "../../../electron/shared/windowSizes";
import { appValue, withApp } from "../import/testUtils";
import { CustomSizeForm } from "./CustomSizeForm";

afterEach(cleanup);

const widthField = () => screen.getByLabelText("Width (px)") as HTMLInputElement;
const heightField = () => screen.getByLabelText("Height (px)") as HTMLInputElement;
const type = (w: string, h: string) => {
  fireEvent.change(widthField(), { target: { value: w } });
  fireEvent.change(heightField(), { target: { value: h } });
};
const submit = () => fireEvent.submit(screen.getByRole("form", { name: "Custom size" }));

describe("CustomSizeForm", () => {
  it("is hidden in a browser preview", () => {
    render(withApp(appValue({ platform: "web" }), <CustomSizeForm />));
    expect(screen.queryByRole("form", { name: "Custom size" })).toBeNull();
  });

  it("prefills with the visible widget size (window size minus the shadow margin) and shows the allowed range", async () => {
    render(withApp(appValue({ platform: "darwin" }), <CustomSizeForm />));
    await waitFor(() => expect(widthField().value).toBe(String(DEFAULT_SIZES.compact.width - 32)));
    expect(heightField().value).toBe(String(DEFAULT_SIZES.compact.height - 32));
    expect(screen.getByText(/320–528 × 428–868 px/)).toBeTruthy();
  });

  it("applies valid numbers through setLayoutSize as a WINDOW size and says so", async () => {
    const value = appValue({ platform: "darwin" });
    render(withApp(value, <CustomSizeForm />));
    await waitFor(() => expect(widthField().value).not.toBe(""));
    type("400", "600");
    submit();
    await waitFor(() => expect(value.setLayoutSize).toHaveBeenCalledWith("compact", toWindowSize({ width: 400, height: 600 })));
    expect(await screen.findByText("Applied 400 × 600 px.")).toBeTruthy();
  });

  it("rejects invalid or out-of-range numbers with a clear message and does not call the main process", async () => {
    const value = appValue({ platform: "darwin" });
    render(withApp(value, <CustomSizeForm />));
    await waitFor(() => expect(widthField().value).not.toBe(""));
    type("100", "abc");
    submit();
    const alerts = await screen.findAllByRole("alert");
    expect(alerts.map((a) => a.textContent)).toEqual(["Width must be 320–528 px.", "Use a whole number, e.g. 400."]);
    expect(value.setLayoutSize).not.toHaveBeenCalled();
  });

  it("tells the user when the screen forced a smaller size", async () => {
    // behaves like the main process: remembers what it returned and reports it back later
    let current = { ...DEFAULT_SIZES };
    const fitted = toWindowSize({ width: 500, height: 700 });
    const setLayoutSize = vi.fn(async () => ((current = { ...current, compact: fitted }), fitted));
    const getLayoutSizes = vi.fn(async () => current);
    render(withApp(appValue({ platform: "win32", setLayoutSize, getLayoutSizes }), <CustomSizeForm />));
    await waitFor(() => expect(widthField().value).not.toBe(""));
    type("520", "860");
    submit();
    expect(await screen.findByText("Fitted to your screen: 500 × 700 px.")).toBeTruthy();
    await waitFor(() => expect(widthField().value).toBe("500"));
  });

  it("each layout shows its own size and limits", async () => {
    const getLayoutSizes = vi.fn(async () => ({ ...DEFAULT_SIZES }));
    render(withApp(appValue({ platform: "darwin", getLayoutSizes }), <CustomSizeForm />));
    await waitFor(() => expect(widthField().value).toBe("360"));
    fireEvent.change(screen.getByLabelText("Layout to resize"), { target: { value: "expanded" } });
    await waitFor(() => expect(widthField().value).toBe(String(DEFAULT_SIZES.expanded.width - 32)));
    expect(screen.getByText(/788–1568 × 528–1068 px/)).toBeTruthy();
  });

  it("applies to the layout that is selected", async () => {
    const value = appValue({ platform: "darwin" });
    render(withApp(value, <CustomSizeForm />));
    await waitFor(() => expect(widthField().value).not.toBe(""));
    fireEvent.change(screen.getByLabelText("Layout to resize"), { target: { value: "minimal" } });
    type("340", "300");
    submit();
    await waitFor(() => expect(value.setLayoutSize).toHaveBeenCalledWith("minimal", toWindowSize({ width: 340, height: 300 })));
  });

  it("does not overwrite what the user is typing when the window is resized meanwhile", async () => {
    render(withApp(appValue({ platform: "darwin" }), <CustomSizeForm />));
    await waitFor(() => expect(widthField().value).not.toBe(""));
    fireEvent.change(widthField(), { target: { value: "41" } });
    Object.defineProperty(window, "innerWidth", { value: 777, configurable: true });
    fireEvent(window, new Event("resize"));
    await new Promise((r) => setTimeout(r, 30));
    expect(widthField().value).toBe("41");
  });

  it("reports a failure from the main process", async () => {
    const setLayoutSize = vi.fn().mockRejectedValue(new Error("boom"));
    const value = appValue({ platform: "darwin", setLayoutSize });
    render(withApp(value, <CustomSizeForm />));
    await waitFor(() => expect(widthField().value).not.toBe(""));
    type("400", "600");
    submit();
    await waitFor(() => expect(value.reportError).toHaveBeenCalled());
  });
});
