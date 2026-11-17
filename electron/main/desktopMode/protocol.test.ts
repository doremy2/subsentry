import { describe, expect, it } from "vitest";
import { bottomCommand, encodeScript, helperArgs, HELPER_SCRIPT, hwndFromHandle, isHwndText, parseReply } from "./protocol";

describe("window handle parsing", () => {
  it("reads 64-bit little-endian handles", () => {
    const b = Buffer.alloc(8);
    b.writeBigUInt64LE(0x0000000000050a3cn);
    expect(hwndFromHandle(b)).toBe("330300");
  });
  it("reads 32-bit handles", () => {
    const b = Buffer.alloc(4);
    b.writeUInt32LE(197148);
    expect(hwndFromHandle(b)).toBe("197148");
  });
  it("rejects null and malformed handles", () => {
    expect(hwndFromHandle(Buffer.alloc(8))).toBeNull();
    expect(hwndFromHandle(Buffer.alloc(3))).toBeNull();
    expect(hwndFromHandle(Buffer.alloc(0))).toBeNull();
  });
});

describe("command building (the handle is the only value that reaches the shell)", () => {
  it("builds a BOTTOM command", () => expect(bottomCommand("330300")).toBe("BOTTOM 330300"));

  it.each(["", "0", "01", "12 34", "12\n34", "1;calc", "$(calc)", "abc", "-5", "1".repeat(21), "0x10", " 5"])("refuses %j", (bad) => {
    expect(isHwndText(bad)).toBe(false);
    expect(() => bottomCommand(bad)).toThrow();
  });
});

describe("reply parsing", () => {
  it("understands the protocol and ignores noise", () => {
    expect(parseReply("READY\r\n")).toBe("READY");
    expect(parseReply("OK")).toEqual({ ok: true });
    expect(parseReply("ERR not a window")).toEqual({ ok: false, error: "not a window" });
    expect(parseReply("ERR")).toEqual({ ok: false, error: "unknown error" });
    expect(parseReply("Windows PowerShell")).toBeNull();
    expect(parseReply("")).toBeNull();
  });
});

describe("helper script and launch arguments", () => {
  it("uses HWND_BOTTOM with no-size/no-move/no-activate flags", () => {
    expect(HELPER_SCRIPT).toContain("SetWindowPos($handle, [System.IntPtr]1, 0, 0, 0, 0, 0x13)");
    expect(HELPER_SCRIPT).toContain("IsWindow");
    expect(HELPER_SCRIPT).toContain("Write('READY')".replace("Write", "WriteLine"));
  });
  it("accepts exactly one command and nothing else", () => {
    expect(HELPER_SCRIPT).toContain("$parts[0] -ne 'BOTTOM'");
    expect(HELPER_SCRIPT).toContain("$parts.Length -ne 2");
  });
  it("is encoded as base64 UTF-16LE so stdin stays free for the protocol", () => {
    const args = helperArgs("Write-Output 1");
    expect(args).toContain("-EncodedCommand");
    expect(args).toContain("-NonInteractive");
    expect(args).toContain("-NoProfile");
    const encoded = args[args.indexOf("-EncodedCommand") + 1] as string;
    expect(Buffer.from(encoded, "base64").toString("utf16le")).toBe("Write-Output 1");
    expect(encodeScript(HELPER_SCRIPT).length).toBeLessThan(8000); // far below the 32k command-line limit
  });
  it("balances the PowerShell here-string and braces (cheap syntax guard; no PowerShell available in CI on Linux)", () => {
    expect((HELPER_SCRIPT.match(/@"/g) ?? []).length).toBe(1);
    expect(HELPER_SCRIPT).toMatch(/\n"@\n/);
    const opens = (HELPER_SCRIPT.match(/{/g) ?? []).length;
    const closes = (HELPER_SCRIPT.match(/}/g) ?? []).length;
    expect(opens).toBe(closes);
  });
});
