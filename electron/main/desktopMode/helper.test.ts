import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createZOrderHelper, type SpawnFn } from "./helper";

/** A fake PowerShell: records what it is sent and lets the test script its replies. */
function fakeProcess() {
  const proc = Object.assign(new EventEmitter(), {
    stdin: new PassThrough(),
    stdout: new PassThrough(),
    stderr: new PassThrough(),
    killed: false,
    kill() {
      this.killed = true;
      return true;
    },
  });
  const received: string[] = [];
  proc.stdin.on("data", (d: Buffer) => received.push(...d.toString().split("\n").filter(Boolean)));
  return { proc, received, say: (line: string) => proc.stdout.write(line + "\n") };
}

function setup() {
  const fake = fakeProcess();
  const spawn = vi.fn(() => fake.proc) as unknown as SpawnFn & ReturnType<typeof vi.fn>;
  const helper = createZOrderHelper({ spawn, executable: "powershell.exe", startTimeoutMs: 1000, replyTimeoutMs: 500 });
  return { ...fake, spawn, helper };
}

const tick = () => new Promise((r) => setImmediate(r));

beforeEach(() => vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] }));
afterEach(() => vi.useRealTimers());

describe("ZOrderHelper", () => {
  it("starts hidden with the encoded script and resolves on READY", async () => {
    const { helper, spawn, say } = setup();
    const started = helper.start();
    say("READY");
    await started;
    expect(helper.isRunning()).toBe(true);
    const [exe, args, opts] = spawn.mock.calls[0] as unknown as [string, string[], { windowsHide: boolean }];
    expect(exe).toBe("powershell.exe");
    expect(args).toContain("-EncodedCommand");
    expect(opts.windowsHide).toBe(true);
  });

  it("rejects if it is not ready in time, and cleans up", async () => {
    const { helper, proc } = setup();
    const started = helper.start();
    const assertion = expect(started).rejects.toThrow(/not become ready/);
    await vi.advanceTimersByTimeAsync(1001);
    await assertion;
    expect(proc.killed).toBe(true);
    expect(helper.isRunning()).toBe(false);
  });

  it("rejects if the process exits or errors before READY (e.g. PowerShell blocked)", async () => {
    const a = setup();
    const startedA = a.helper.start();
    a.proc.stderr.write("Add-Type : blocked by policy");
    await tick();
    a.proc.emit("exit", 1);
    await expect(startedA).rejects.toThrow(/exited \(code 1\).*blocked by policy/);

    const b = setup();
    const startedB = b.helper.start();
    b.proc.emit("error", new Error("spawn ENOENT"));
    await expect(startedB).rejects.toThrow(/spawn ENOENT/);
  });

  it("rejects when spawn itself throws", async () => {
    const spawn = vi.fn(() => {
      throw new Error("EPERM");
    }) as unknown as SpawnFn;
    const helper = createZOrderHelper({ spawn, executable: "x" });
    await expect(helper.start()).rejects.toThrow("EPERM");
  });

  it("sends BOTTOM and resolves on OK; rejects on ERR", async () => {
    const { helper, say, received } = setup();
    const started = helper.start();
    say("READY");
    await started;
    const ok = helper.bottom("330300");
    await tick();
    expect(received).toEqual(["BOTTOM 330300"]);
    say("OK");
    await expect(ok).resolves.toBeUndefined();
    const bad = helper.bottom("330300");
    await tick();
    say("ERR not a window");
    await expect(bad).rejects.toThrow("not a window");
  });

  it("matches replies to requests in order", async () => {
    const { helper, say } = setup();
    const started = helper.start();
    say("READY");
    await started;
    const results: string[] = [];
    const first = helper.bottom("11").then(() => results.push("first ok"), (e: Error) => results.push("first " + e.message));
    const second = helper.bottom("22").then(() => results.push("second ok"), (e: Error) => results.push("second " + e.message));
    await tick();
    say("ERR boom");
    say("OK");
    await Promise.all([first, second]);
    expect(results).toEqual(["first boom", "second ok"]);
  });

  it("never sends an invalid handle", async () => {
    const { helper, say, received } = setup();
    const started = helper.start();
    say("READY");
    await started;
    await expect(helper.bottom("1; calc")).rejects.toThrow("Invalid window handle");
    await tick();
    expect(received).toEqual([]);
  });

  it("rejects when not started, and when the helper never answers", async () => {
    const { helper, say } = setup();
    await expect(helper.bottom("5")).rejects.toThrow(/not running/);
    const started = helper.start();
    say("READY");
    await started;
    const slow = helper.bottom("5");
    const assertion = expect(slow).rejects.toThrow(/did not answer/);
    await vi.advanceTimersByTimeAsync(501);
    await assertion;
  });

  it("rejects pending work and stops the process on dispose or unexpected exit", async () => {
    const { helper, say, proc } = setup();
    const started = helper.start();
    say("READY");
    await started;
    const inflight = helper.bottom("7");
    helper.dispose();
    await expect(inflight).rejects.toThrow(/stopped/);
    expect(proc.killed).toBe(true);
    expect(helper.isRunning()).toBe(false);

    const other = setup();
    const s2 = other.helper.start();
    other.say("READY");
    await s2;
    const inflight2 = other.helper.bottom("8");
    other.proc.emit("exit", 3);
    await expect(inflight2).rejects.toThrow(/exited \(code 3\)/);
  });

  it("ignores noise lines", async () => {
    const { helper, say } = setup();
    const started = helper.start();
    say("Windows PowerShell banner");
    say("READY");
    await started;
    expect(helper.isRunning()).toBe(true);
  });
});
