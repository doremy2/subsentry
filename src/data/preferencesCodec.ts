import { ACCENTS, DEFAULT_PREFERENCES, OPACITY_RANGE, type Preferences } from "./types";

/**
 * Preferences are stored as key -> JSON text. Decoding is defensive: a missing,
 * corrupt or out-of-range value falls back to its default instead of crashing.
 */

export type PreferenceRows = ReadonlyArray<{ key: string; value: string }>;

function parse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export function decodePreferences(rows: PreferenceRows): Preferences {
  const raw = new Map(rows.map((row) => [row.key, parse(row.value)]));
  const prefs: Preferences = { ...DEFAULT_PREFERENCES };

  const accent = raw.get("accent");
  if (typeof accent === "string" && (ACCENTS as readonly string[]).includes(accent)) prefs.accent = accent as Preferences["accent"];

  const opacity = raw.get("opacity");
  if (typeof opacity === "number" && Number.isFinite(opacity)) {
    prefs.opacity = Math.min(OPACITY_RANGE.max, Math.max(OPACITY_RANGE.min, opacity));
  }

  const alwaysOnTop = raw.get("alwaysOnTop");
  if (typeof alwaysOnTop === "boolean") prefs.alwaysOnTop = alwaysOnTop;

  const mode = raw.get("mode");
  if (mode === "compact" || mode === "expanded") prefs.mode = mode;

  const pos = raw.get("windowPosition");
  if (pos && typeof pos === "object") {
    const { x, y } = pos as Record<string, unknown>;
    if (Number.isFinite(x) && Number.isFinite(y)) prefs.windowPosition = { x: x as number, y: y as number };
  }

  return prefs;
}

export function encodePreferencePatch(patch: Partial<Preferences>): Array<{ key: string; value: string }> {
  return Object.entries(patch)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => ({ key, value: JSON.stringify(value) }));
}
