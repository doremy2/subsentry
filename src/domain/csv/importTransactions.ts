import { isValidISODate } from "../dates";
import { minorUnitDigits } from "../money";
import type { ISODate } from "../subscription";
import { DETECTION_LIMITS, type Transaction } from "../detection/types";

/**
 * Turns a parsed CSV into `Transaction`s. Bank exports differ wildly, so the
 * user can fix the column guesses. Nothing here decides what is a subscription.
 */

export interface CsvTable {
  headers: string[];
  rows: string[][];
}

export function tableFromRows(rows: string[][]): CsvTable | null {
  const [headers, ...body] = rows;
  if (!headers || body.length === 0) return null;
  return { headers: headers.map((h) => h.trim()), rows: body };
}

/** Column indexes (or null = not mapped). Either `amount`, or `debit`/`credit`, must be set. */
export interface ColumnMapping {
  date: number | null;
  description: number | null;
  amount: number | null;
  debit: number | null;
  credit: number | null;
}

export type DateOrder = "auto" | "mdy" | "dmy";

export interface ImportOptions {
  dateOrder: DateOrder;
  /** Some card exports list charges as positive numbers; flip so spending becomes negative. */
  positiveIsSpending: boolean;
  currency: string;
}

export const DEFAULT_IMPORT_OPTIONS: ImportOptions = { dateOrder: "auto", positiveIsSpending: false, currency: "USD" };

export interface SkippedRow {
  /** 1-based row number in the file (header = 1). */
  row: number;
  reason: string;
}

export interface ImportResult {
  transactions: Transaction[];
  skipped: SkippedRow[];
  /** True if the file had more rows than the safety limit. */
  truncated: boolean;
}

export function guessMapping(headers: readonly string[]): ColumnMapping {
  const find = (...patterns: RegExp[]) => {
    const index = headers.findIndex((h) => patterns.some((p) => p.test(h.toLowerCase())));
    return index >= 0 ? index : null;
  };
  const debit = find(/debit/, /withdraw/, /paid out/, /money out/);
  const credit = find(/credit/, /deposit/, /paid in/, /money in/);
  const amount = find(/^amount/, /\bamount\b/, /^value$/, /^total$/);
  return {
    date: find(/^date/, /posted/, /transaction date/, /\bdate\b/),
    description: find(/descr/, /merchant/, /payee/, /^name$/, /narrative/, /details/, /memo/),
    amount,
    debit: amount === null ? debit : null,
    credit: amount === null ? credit : null,
  };
}

export function isMappingComplete(m: ColumnMapping): boolean {
  return m.date !== null && m.description !== null && (m.amount !== null || m.debit !== null || m.credit !== null);
}

const toIso = (y: number, m: number, d: number): ISODate | null => {
  const iso = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return isValidISODate(iso) ? iso : null;
};

const SHORT_DATE = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/;
const YMD_DATE = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/;

/** Decide MM/DD vs DD/MM for a whole column: any first part > 12 means day-first, any second part > 12 means month-first. */
export function detectDateOrder(values: readonly string[]): "mdy" | "dmy" {
  let dayFirst = 0;
  let monthFirst = 0;
  for (const value of values) {
    const m = SHORT_DATE.exec(value.trim().split(/[T\s]/)[0] ?? "");
    if (!m) continue;
    if (Number(m[1]) > 12) dayFirst += 1;
    if (Number(m[2]) > 12) monthFirst += 1;
  }
  return dayFirst > 0 && monthFirst === 0 ? "dmy" : "mdy";
}

export function parseDateCell(text: string, order: "mdy" | "dmy"): ISODate | null {
  const datePart = text.trim().split(/[T\s]/)[0] ?? "";
  const ymd = YMD_DATE.exec(datePart);
  if (ymd) return toIso(Number(ymd[1]), Number(ymd[2]), Number(ymd[3]));
  const short = SHORT_DATE.exec(datePart);
  if (!short) return null;
  const [a, b] = [Number(short[1]), Number(short[2])];
  let year = Number(short[3]);
  if (short[3]?.length === 2) year += year > 69 ? 1900 : 2000;
  return order === "mdy" ? toIso(year, a, b) : toIso(year, b, a);
}

/**
 * Parse "1,234.56", "(15.49)", "-$15.49", "15,49 €", "12.50-" into signed minor units.
 * Returns null when ambiguous or not a number (e.g. "1.234" in a 2-decimal currency).
 */
export function parseAmount(text: string, currency: string): number | null {
  let s = text.replace(/[\s ]/g, "").replace(/[^\d.,\-+()]/g, "");
  let negative = false;
  if (s.startsWith("(") && s.endsWith(")")) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (s.startsWith("-")) {
    negative = true;
    s = s.slice(1);
  } else if (s.startsWith("+")) s = s.slice(1);
  if (s.endsWith("-")) {
    negative = true;
    s = s.slice(0, -1);
  }
  if (!/^[\d.,]*\d[\d.,]*$/.test(s)) return null;

  const dots = s.split(".").length - 1;
  const commas = s.split(",").length - 1;
  let decimalSeparator: "." | "," | null = null;
  if (dots > 0 && commas > 0) decimalSeparator = s.lastIndexOf(".") > s.lastIndexOf(",") ? "." : ",";
  else if (commas === 1 && /,\d{1,2}$/.test(s)) decimalSeparator = ",";
  else if (dots === 1) decimalSeparator = ".";

  let whole = s;
  let fraction = "";
  if (decimalSeparator) {
    const at = s.lastIndexOf(decimalSeparator);
    whole = s.slice(0, at);
    fraction = s.slice(at + 1);
  }
  whole = whole.replace(/[.,]/g, "");
  const digits = minorUnitDigits(currency);
  if (fraction.length > digits || !/^\d*$/.test(fraction)) return null;
  const minor = Number(whole || "0") * 10 ** digits + Number(fraction.padEnd(digits, "0") || "0");
  if (!Number.isSafeInteger(minor)) return null;
  return negative && minor !== 0 ? -minor : minor;
}

export function buildTransactions(table: CsvTable, mapping: ColumnMapping, options: ImportOptions): ImportResult {
  const empty: ImportResult = { transactions: [], skipped: [], truncated: false };
  if (!isMappingComplete(mapping)) return empty;

  const cell = (row: string[], index: number | null) => (index === null ? "" : (row[index] ?? "").trim());
  const order = options.dateOrder === "auto" ? detectDateOrder(table.rows.map((r) => cell(r, mapping.date))) : options.dateOrder;

  const transactions: Transaction[] = [];
  const skipped: SkippedRow[] = [];
  const rowsToRead = table.rows.slice(0, DETECTION_LIMITS.maxTransactions);

  rowsToRead.forEach((row, i) => {
    const sourceRow = i + 2; // header is row 1
    const skip = (reason: string) => skipped.push({ row: sourceRow, reason });

    const date = parseDateCell(cell(row, mapping.date), order);
    if (!date) return skip("Missing or unreadable date");
    const merchant = cell(row, mapping.description).replace(/\s+/g, " ");
    if (!merchant) return skip("Missing description");
    if (merchant.length > DETECTION_LIMITS.maxMerchantLength) return skip("Description too long");

    let amountMinor: number | null;
    if (mapping.amount !== null) {
      amountMinor = parseAmount(cell(row, mapping.amount), options.currency);
      if (amountMinor !== null && options.positiveIsSpending) amountMinor = -amountMinor;
    } else {
      const debit = mapping.debit === null ? null : parseAmount(cell(row, mapping.debit), options.currency);
      const credit = mapping.credit === null ? null : parseAmount(cell(row, mapping.credit), options.currency);
      amountMinor = debit ? -Math.abs(debit) : credit ? Math.abs(credit) : null;
    }
    if (amountMinor === null) return skip("Missing or unreadable amount");
    if (amountMinor === 0) return skip("Zero amount");

    transactions.push({ id: `tx-${sourceRow}`, date, merchant, amountMinor, currency: options.currency, sourceRow });
  });

  return { transactions, skipped, truncated: table.rows.length > rowsToRead.length };
}
