// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { appValue, withApp } from "../import/testUtils";
import { ResizeGrips } from "./ResizeGrips";

afterEach(cleanup);

function setup(platform = "darwin") {
  const value = appValue({ platform });
  const view = render(withApp(value, <ResizeGrips />));
  return { value, ...view };
}

describe("ResizeGrips", () => {
  it("renders nothing in a browser preview", () => {
    setup("web");
    expect(screen.queryByTestId("grip-both")).toBeNull();
  });

  it("every grip is explicitly no-drag, so it can overlap a window-drag region", () => {
    setup();
    for (const id of ["grip-x", "grip-y", "grip-both"]) expect(screen.getByTestId(id).className).toContain("no-drag");
  });

  it.each([
    ["grip-both", "both"],
    ["grip-x", "x"],
    ["grip-y", "y"],
  ])("%s starts a resize on the %s axis and ends it on pointer up", (testId, axis) => {
    const { value } = setup();
    const grip = screen.getByTestId(testId);
    fireEvent.pointerDown(grip, { pointerId: 1, button: 0 });
    expect(value.beginResize).toHaveBeenCalledWith(axis);
    expect(value.endResize).not.toHaveBeenCalled();
    fireEvent.pointerUp(window, { pointerId: 1 }); // released anywhere, even outside the grip
    expect(value.endResize).toHaveBeenCalledTimes(1);
  });

  it("ignores non-primary buttons", () => {
    const { value } = setup();
    fireEvent.pointerDown(screen.getByTestId("grip-both"), { pointerId: 1, button: 2 });
    expect(value.beginResize).not.toHaveBeenCalled();
  });

  it("ends exactly once even when several release signals fire", () => {
    const { value } = setup();
    fireEvent.pointerDown(screen.getByTestId("grip-both"), { pointerId: 1, button: 0 });
    fireEvent.pointerUp(window);
    fireEvent.pointerCancel(window);
    fireEvent(window, new Event("blur"));
    expect(value.endResize).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["pointer cancel", () => fireEvent.pointerCancel(window)],
    ["window blur", () => fireEvent(window, new Event("blur"))],
  ])("ends the resize on %s (e.g. focus lost mid-drag)", (_name, signal) => {
    const { value } = setup();
    fireEvent.pointerDown(screen.getByTestId("grip-x"), { pointerId: 1, button: 0 });
    signal();
    expect(value.endResize).toHaveBeenCalledTimes(1);
  });

  it("does not start a second resize while one is running", () => {
    const { value } = setup();
    fireEvent.pointerDown(screen.getByTestId("grip-x"), { pointerId: 1, button: 0 });
    fireEvent.pointerDown(screen.getByTestId("grip-y"), { pointerId: 2, button: 0 });
    expect(value.beginResize).toHaveBeenCalledTimes(1);
  });

  it("ends a running resize if the grips unmount, so the window never keeps following the cursor", () => {
    const { value, unmount } = setup();
    fireEvent.pointerDown(screen.getByTestId("grip-both"), { pointerId: 1, button: 0 });
    unmount();
    expect(value.endResize).toHaveBeenCalledTimes(1);
  });

  it("can start again after a drag finished", () => {
    const { value } = setup();
    const grip = screen.getByTestId("grip-both");
    fireEvent.pointerDown(grip, { pointerId: 1, button: 0 });
    fireEvent.pointerUp(window);
    fireEvent.pointerDown(grip, { pointerId: 2, button: 0 });
    expect(value.beginResize).toHaveBeenCalledTimes(2);
  });

  it("reports a failure to start and ends cleanly instead of leaving the user stuck", async () => {
    const beginResize = vi.fn().mockRejectedValue(new Error("nope"));
    const value = appValue({ platform: "win32", beginResize });
    render(withApp(value, <ResizeGrips />));
    fireEvent.pointerDown(screen.getByTestId("grip-both"), { pointerId: 1, button: 0 });
    await vi.waitFor(() => expect(value.reportError).toHaveBeenCalled());
    expect(value.endResize).toHaveBeenCalledTimes(1);
  });
});
