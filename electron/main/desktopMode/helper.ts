import type { ChildProcessWithoutNullStreams, SpawnOptionsWithoutStdio } from "node:child_process";
import { createInterface } from "node:readline";
import { bottomCommand, helperArgs, parseReply } from "./protocol";

export type SpawnFn = (command: string, args: string[], options: SpawnOptionsWithoutStdio) => ChildProcessWithoutNullStreams;

export interface ZOrderHelper {
  /** Start the helper and wait until it is ready. Rejects if it cannot start. */
  start(): Promise<void>;
  /** Push the window with this decimal HWND to the bottom of the z-order. */
  bottom(hwnd: string): Promise<void>;
  isRunning(): boolean;
  dispose(): void;
}

export interface HelperOptions {
  spawn: SpawnFn;
  /** Path of powershell.exe. */
  executable: string;
  startTimeoutMs?: number;
  replyTimeoutMs?: number;
  log?: (...args: unknown[]) => void;
}

type Pending = { resolve: () => void; reject: (error: Error) => void; timer: NodeJS.Timeout };

/**
 * Owns the hidden PowerShell process. Replies arrive in order, so requests are matched FIFO.
 * Never throws synchronously and never leaves a promise hanging: every failure path rejects it.
 */
export function createZOrderHelper(options: HelperOptions): ZOrderHelper {
  const { spawn, executable, startTimeoutMs = 20_000, replyTimeoutMs = 4_000, log = () => {} } = options;
  let child: ChildProcessWithoutNullStreams | null = null;
  let ready = false;
  let pending: Pending[] = [];
  let onReady: { resolve: () => void; reject: (error: Error) => void; timer: NodeJS.Timeout } | null = null;
  let stderr = "";

  const failAll = (error: Error) => {
    const queued = pending;
    pending = [];
    for (const p of queued) {
      clearTimeout(p.timer);
      p.reject(error);
    }
    if (onReady) {
      clearTimeout(onReady.timer);
      onReady.reject(error);
      onReady = null;
    }
  };

  const teardown = (reason: string) => {
    const current = child;
    child = null;
    ready = false;
    if (current && !current.killed) current.kill();
    failAll(new Error(reason + (stderr ? ` (${stderr.trim().slice(0, 200)})` : "")));
  };

  return {
    start() {
      if (child) return Promise.resolve();
      return new Promise<void>((resolve, reject) => {
        let proc: ChildProcessWithoutNullStreams;
        try {
          proc = spawn(executable, helperArgs(), { windowsHide: true });
        } catch (error) {
          return reject(error instanceof Error ? error : new Error("Could not start PowerShell."));
        }
        child = proc;
        stderr = "";
        onReady = { resolve, reject, timer: setTimeout(() => teardown("The desktop-mode helper did not become ready in time."), startTimeoutMs) };

        proc.on("error", (error) => teardown(`PowerShell failed: ${error.message}`));
        proc.on("exit", (code) => teardown(`The desktop-mode helper exited (code ${code ?? "?"}).`));
        proc.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString()));

        createInterface({ input: proc.stdout }).on("line", (line) => {
          const reply = parseReply(line);
          log("helper <-", line.trim());
          if (reply === "READY") {
            ready = true;
            if (onReady) {
              clearTimeout(onReady.timer);
              onReady.resolve();
              onReady = null;
            }
          } else if (reply && typeof reply === "object") {
            const next = pending.shift();
            if (!next) return;
            clearTimeout(next.timer);
            if (reply.ok) next.resolve();
            else next.reject(new Error(reply.error));
          }
        });
      });
    },

    bottom(hwnd) {
      return new Promise<void>((resolve, reject) => {
        if (!child || !ready) return reject(new Error("The desktop-mode helper is not running."));
        let command: string;
        try {
          command = bottomCommand(hwnd); // validates the handle before anything is sent
        } catch (error) {
          return reject(error instanceof Error ? error : new Error("Invalid command."));
        }
        const timer = setTimeout(() => {
          pending = pending.filter((p) => p.timer !== timer);
          reject(new Error("The desktop-mode helper did not answer in time."));
        }, replyTimeoutMs);
        pending.push({ resolve, reject, timer });
        log("helper ->", command);
        child.stdin.write(`${command}\n`);
      });
    },

    isRunning: () => child !== null && ready,

    dispose() {
      teardown("The desktop-mode helper was stopped.");
    },
  };
}
