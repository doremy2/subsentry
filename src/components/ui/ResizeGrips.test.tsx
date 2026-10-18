// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { appValue, withApp } from "../import/testUtils";
import { ResizeGrips } from "./ResizeGrips";

afterEach(cleanup);

function setup(platform = "darwin") {
  const value = appValue({ platform });
  render(withApp(value, <ResizeGrips />));
  return value;
}

describe("ResizeGrips", () => {
  it("renders nothing in a browser preview", () => {
    setup("web");
    expect(screen.queryByTestId("grip-both")).toBeNull();
  });

  it.each([
    ["grip-both", "both"],
    ["grip-x", "x"],
    ["grip-y", "y"],
  ])("%s starts a resize on the %s axis and ends it on pointer up", (testId, axis) => {
    const value = setup();
    const grip = screen.getByTestId(testId);
    fireEvent.pointerDown(grip, { pointerId: 1 });
    expect(value.beginResize).toHaveBeenCalledWith(axis);
    expect(value.endResize).not.toHaveBeenCalled();
    fireEvent.pointerUp(grip, { pointerId: 1 });
    expect(value.endResize).toHaveBeenCalledTimes(1);
  });

  it("ends exactly once even when pointer up, cancel and lost-capture all fire", () => {
    const value = setup();
    const grip = screen.getByTestId("grip-both");
    fireEvent.pointerDown(grip, { pointerId: 1 });
    fireEvent.pointerUp(grip, { pointerId: 1 });
    fireEvent.pointerCancel(grip, { pointerId: 1 });
    fireEvent.lostPointerCapture(grip, { pointerId: 1 });
    expect(value.endResize).toHaveBeenCalledTimes(1);
  });

  it("ends the resize if the pointer is cancelled (e.g. focus lost mid-drag)", () => {
    const value = setup();
    const grip = screen.getByTestId("grip-x");
    fireEvent.pointerDown(grip, { pointerId: 1 });
    fireEvent.pointerCancel(grip, { pointerId: 1 });
    expect(value.endResize).toHaveBeenCalledTimes(1);
  });

  it("reports a failure to start instead of leaving the user stuck", async () => {
    const beginResize = vi.fn().mockRejectedValue(new Error("nope"));
    const value = appValue({ platform: "win32", beginResize });
    render(withApp(value, <ResizeGrips />));
    fireEvent.pointerDown(screen.getByTestId("grip-both"), { pointerId: 1 });
    await vi.waitFor(() => expect(value.reportError).toHaveBeenCalled());
  });
});
