import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDesktopMode, type ManagedWindow, type WindowEvent } from "./controller";
import type { ZOrderHelper } from "./helper";

function fakeWindow() {
  const emitter = new EventEmitter();
  const handle = Buffer.alloc(8);
  handle.writeBigUInt64LE(330300n);
  let destroyed = false;
  let focused = false;
  const win = {
    getNativeWindowHandle: () => handle,
    isDestroyed: () => destroyed,
    isFocused: () => focused,
    setSkipTaskbar: vi.fn(),
    moveTop: vi.fn(),
    restore: vi.fn(),
    on: (e: WindowEvent, l: () => void) => void emitter.on(e, l),
    removeListener: (e: WindowEvent, l: () => void) => void emitter.removeListener(e, l),
  } satisfies ManagedWindow;
  return { win, setFocused: (value: boolean) => (focused = value), emit: (e: WindowEvent) => emitter.emit(e), listeners: (e: WindowEvent) => emitter.listenerCount(e), destroy: () => (destroyed = true) };
}

function fakeHelper(overrides: Partial<ZOrderHelper> = {}) {
  const base = {
    start: vi.fn(async (): Promise<void> => {}),
    bottom: vi.fn(async (_hwnd: string): Promise<void> => {}),
    isRunning: vi.fn(() => true),
    dispose: vi.fn(),
  };
  return Object.assign(base, overrides) as typeof base; // overrides replace methods but the mock API stays typed
}

const SETTLE = 60;
const flush = () => vi.advanceTimersByTimeAsync(SETTLE + 5);

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function setup(helperOverrides: Partial<ZOrderHelper> = {}) {
  const w = fakeWindow();
  const helper = fakeHelper(helperOverrides);
  const onUnavailable = vi.fn();
  const mode = createDesktopMode({ win: w.win, helper, onUnavailable, settleMs: SETTLE });
  return { ...w, helper, onUnavailable, mode };
}

describe("desktop mode controller", () => {
  it("on enable: starts the helper, hides the taskbar button, and pushes the window down", async () => {
    const { mode, helper, win } = setup();
    expect(await mode.enable()).toBe(true);
    await flush();
    expect(mode.isActive()).toBe(true);
    expect(win.setSkipTaskbar).toHaveBeenCalledWith(true);
    expect(helper.bottom).toHaveBeenCalledWith("330300");
  });

  it("pushes the window back down after it loses focus (after being raised by a click)", async () => {
    const { mode, helper, emit } = setup();
    await mode.enable();
    await flush();
    helper.bottom.mockClear();
    emit("blur");
    expect(helper.bottom).not.toHaveBeenCalled(); // waits for Windows to finish its own z-order change
    await flush();
    expect(helper.bottom).toHaveBeenCalledTimes(1);
  });

  it("debounces a burst of events into one push", async () => {
    const { mode, helper, emit } = setup();
    await mode.enable();
    await flush();
    helper.bottom.mockClear();
    emit("blur");
    emit("show");
    emit("restore");
    await flush();
    expect(helper.bottom).toHaveBeenCalledTimes(1);
  });

  it("does NOT push down a window that was just shown WITH focus (tray click must bring it forward)", async () => {
    const { mode, helper, emit, setFocused } = setup();
    await mode.enable();
    await flush();
    helper.bottom.mockClear();
    setFocused(true);
    emit("show");
    emit("restore");
    await flush();
    expect(helper.bottom).not.toHaveBeenCalled();
    setFocused(false);
    emit("blur"); // later, when focus leaves, it goes back down
    await flush();
    expect(helper.bottom).toHaveBeenCalledTimes(1);
  });

  it("pushes down a window shown by the system without focus", async () => {
    const { mode, helper, emit } = setup();
    await mode.enable();
    await flush();
    helper.bottom.mockClear();
    emit("show");
    await flush();
    expect(helper.bottom).toHaveBeenCalledTimes(1);
  });

  it("undoes a minimize (Show desktop) so the widget stays visible, then pushes down", async () => {
    const { mode, helper, emit, win } = setup();
    await mode.enable();
    await flush();
    helper.bottom.mockClear();
    emit("minimize");
    expect(win.restore).toHaveBeenCalledTimes(1);
    await flush();
    expect(helper.bottom).toHaveBeenCalledTimes(1);
  });

  it("pauses while the manager (expanded view) is open and resumes on collapse", async () => {
    const { mode, helper, emit, win } = setup();
    await mode.enable();
    await flush();
    mode.setExpanded(true);
    helper.bottom.mockClear();
    emit("blur");
    emit("minimize");
    await flush();
    expect(helper.bottom).not.toHaveBeenCalled();
    expect(win.restore).not.toHaveBeenCalled();
    mode.setExpanded(false);
    await flush();
    expect(helper.bottom).toHaveBeenCalledTimes(1);
  });

  it("disable: removes listeners, restores the taskbar button, raises the window, stops the helper", async () => {
    const { mode, helper, win, listeners } = setup();
    await mode.enable();
    mode.disable();
    expect(mode.isActive()).toBe(false);
    for (const e of ["blur", "show", "restore", "minimize"] as const) expect(listeners(e)).toBe(0);
    expect(win.setSkipTaskbar).toHaveBeenLastCalledWith(false);
    expect(win.moveTop).toHaveBeenCalled();
    expect(helper.dispose).toHaveBeenCalled();
  });

  it("enable is idempotent and shares one start", async () => {
    const { mode, helper, listeners } = setup();
    const [a, b] = await Promise.all([mode.enable(), mode.enable()]);
    expect([a, b]).toEqual([true, true]);
    await mode.enable();
    expect(helper.start).toHaveBeenCalledTimes(1);
    expect(listeners("blur")).toBe(1);
  });

  it("reports unavailable (and stays off) if the helper cannot start", async () => {
    const { mode, onUnavailable, win, listeners } = setup({ start: vi.fn(async () => Promise.reject(new Error("blocked by policy"))) });
    expect(await mode.enable()).toBe(false);
    expect(onUnavailable).toHaveBeenCalledWith("blocked by policy");
    expect(mode.isActive()).toBe(false);
    expect(win.setSkipTaskbar).not.toHaveBeenCalled();
    expect(listeners("blur")).toBe(0);
  });

  it("gives up and switches itself off after three consecutive failures", async () => {
    const { mode, helper, emit, onUnavailable, win } = setup();
    await mode.enable();
    await flush();
    helper.bottom.mockImplementation(async () => Promise.reject(new Error("SetWindowPos failed")));
    for (let i = 0; i < 3; i++) {
      emit("blur");
      await flush();
    }
    expect(onUnavailable).toHaveBeenCalledWith("SetWindowPos failed");
    expect(mode.isActive()).toBe(false);
    expect(win.setSkipTaskbar).toHaveBeenLastCalledWith(false);
  });

  it("a success resets the failure count", async () => {
    const { mode, helper, emit, onUnavailable } = setup();
    await mode.enable();
    await flush();
    const results = [false, false, true, false, false];
    helper.bottom.mockImplementation(async () => (results.shift() ? undefined : Promise.reject(new Error("x"))));
    for (let i = 0; i < 5; i++) {
      emit("blur");
      await flush();
    }
    expect(onUnavailable).not.toHaveBeenCalled();
    expect(mode.isActive()).toBe(true);
  });

  it("does nothing once the window is destroyed", async () => {
    const { mode, helper, emit, destroy } = setup();
    await mode.enable();
    await flush();
    helper.bottom.mockClear();
    destroy();
    emit("blur");
    await flush();
    expect(helper.bottom).not.toHaveBeenCalled();
  });

  it("disabled while the helper is still starting: stops the helper and stays off", async () => {
    let finish!: () => void;
    const { mode, helper, win } = setup({ start: vi.fn(() => new Promise<void>((r) => (finish = r))) });
    const enabling = mode.enable();
    mode.disable();
    finish();
    expect(await enabling).toBe(false);
    expect(mode.isActive()).toBe(false);
    expect(win.setSkipTaskbar).not.toHaveBeenCalledWith(true);
    expect(helper.dispose).toHaveBeenCalled();
  });
});
