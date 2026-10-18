/** Money helpers. Prices are integers in minor units (e.g. cents). */

/** Number of decimal places for a currency (2 for USD, 0 for JPY). */
export function minorUnitDigits(currency: string): number {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).resolvedOptions()
      .maximumFractionDigits ?? 2;
  } catch {
    return 2;
  }
}

export function minorToMajor(minor: number, currency: string): number {
  return minor / 10 ** minorUnitDigits(currency);
}

export function formatMoney(minor: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(
      minorToMajor(minor, currency),
    );
  } catch {
    return `${minorToMajor(minor, currency).toFixed(2)} ${currency}`;
  }
}

/** Plain editable string for form inputs, e.g. 1599 USD -> "15.99". */
export function minorToInputString(minor: number, currency: string): string {
  return minorToMajor(minor, currency).toFixed(minorUnitDigits(currency));
}

/**
 * Parse a user-typed price like "15.99" or "1,299" into minor units.
 * Returns null when the text is not a valid non-negative amount for the currency.
 */
export function parsePriceToMinor(text: string, currency: string): number | null {
  const cleaned = text.trim().replace(/,/g, "");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const digits = minorUnitDigits(currency);
  const [whole = "0", fraction = ""] = cleaned.split(".");
  if (fraction.length > digits) return null;
  const minor = Number(whole) * 10 ** digits + Number(fraction.padEnd(digits, "0") || 0);
  return Number.isSafeInteger(minor) ? minor : null;
}
