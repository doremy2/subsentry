/**
 * Windows "Desktop mode": keep the widget at the bottom of the window stack (behind normal windows,
 * above the wallpaper) while it stays clickable.
 *
 * Electron has no API for this (only moveTop / moveAbove), so a small hidden PowerShell process holds
 * one Win32 call, SetWindowPos(HWND_BOTTOM). This file is the pure, testable part: the command protocol
 * and the script text. Nothing here touches the OS.
 *
 * Protocol (one request per line on stdin, one reply per line on stdout):
 *   helper -> "READY"                         after the Win32 binding compiled
 *   app    -> "BOTTOM <hwnd>"                 hwnd = decimal window handle
 *   helper -> "OK"  |  "ERR <message>"
 */

/** Decimal digits only: the handle is the one value that goes into a command line, so it is validated strictly. */
export function isHwndText(text: string): boolean {
  return /^[1-9]\d{0,19}$/.test(text);
}

/** `BrowserWindow#getNativeWindowHandle()` returns the HWND as little-endian bytes (8 on x64/arm64, 4 on ia32). */
export function hwndFromHandle(handle: Buffer): string | null {
  let value: bigint;
  if (handle.length === 8) value = handle.readBigUInt64LE(0);
  else if (handle.length === 4) value = BigInt(handle.readUInt32LE(0));
  else return null;
  return value === 0n ? null : value.toString();
}

export function bottomCommand(hwnd: string): string {
  if (!isHwndText(hwnd)) throw new Error("Invalid window handle.");
  return `BOTTOM ${hwnd}`;
}

export type HelperReply = { ok: true } | { ok: false; error: string };

export function parseReply(line: string): HelperReply | "READY" | null {
  const text = line.trim();
  if (text === "READY") return "READY";
  if (text === "OK") return { ok: true };
  if (text.startsWith("ERR")) return { ok: false, error: text.slice(3).trim() || "unknown error" };
  return null; // noise (e.g. progress or banner output) is ignored
}

/**
 * The helper script. Deliberately small and conservative PowerShell 5.1 (the version every Windows 10/11
 * ships). HWND_BOTTOM = 1; flags 0x13 = SWP_NOSIZE | SWP_NOMOVE | SWP_NOACTIVATE (change z-order only,
 * never steal focus).
 */
export const HELPER_SCRIPT = String.raw`$ErrorActionPreference = 'Stop'
$src = @"
using System;
using System.Runtime.InteropServices;
public static class SubSentryNative {
  [DllImport("user32.dll", SetLastError = true)]
  public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
  [DllImport("user32.dll")]
  public static extern bool IsWindow(IntPtr hWnd);
}
"@
Add-Type -TypeDefinition $src
[Console]::Out.WriteLine('READY')
[Console]::Out.Flush()
while ($true) {
  $line = [Console]::In.ReadLine()
  if ($line -eq $null) { break }
  try {
    $parts = $line.Trim().Split(' ')
    if ($parts.Length -ne 2 -or $parts[0] -ne 'BOTTOM') { throw 'bad command' }
    $handle = [System.IntPtr]([long]$parts[1])
    if (-not [SubSentryNative]::IsWindow($handle)) { throw 'not a window' }
    if (-not [SubSentryNative]::SetWindowPos($handle, [System.IntPtr]1, 0, 0, 0, 0, 0x13)) { throw 'SetWindowPos failed' }
    [Console]::Out.WriteLine('OK')
  } catch {
    [Console]::Out.WriteLine('ERR ' + ($_.Exception.Message -replace '[\r\n]+', ' '))
  }
  [Console]::Out.Flush()
}
`;

/** `-EncodedCommand` takes base64 of UTF-16LE text. It also keeps stdin free for our own protocol. */
export function encodeScript(script: string): string {
  return Buffer.from(script, "utf16le").toString("base64");
}

export function helperArgs(script: string = HELPER_SCRIPT): string[] {
  return ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encodeScript(script)];
}
