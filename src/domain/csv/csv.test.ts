import { describe, expect, it } from "vitest";
import { buildTransactions, DEFAULT_IMPORT_OPTIONS, detectDateOrder, guessMapping, isMappingComplete, parseAmount, parseDateCell, tableFromRows } from "./importTransactions";
import { detectDelimiter, parseCsv } from "./parseCsv";

describe("parseCsv", () => {
  it("handles quotes, escaped quotes, embedded newlines, CRLF, BOM and blank lines", () => {
    const text = '﻿Date,Description,Amount\r\n2025-01-03,"ACME, INC ""HQ""",-12.50\r\n\r\n2025-01-04,"Line1\nLine2",5\r\n';
    const { rows } = parseCsv(text);
    expect(rows).toEqual([
      ["Date", "Description", "Amount"],
      ["2025-01-03", 'ACME, INC "HQ"', "-12.50"],
      ["2025-01-04", "Line1\nLine2", "5"],
    ]);
  });

  it("detects semicolon and tab delimiters", () => {
    expect(detectDelimiter("Datum;Betrag;Text")).toBe(";");
    expect(detectDelimiter("a\tb\tc")).toBe("\t");
    expect(parseCsv("a;b\n1;2").rows).toEqual([["a", "b"], ["1", "2"]]);
  });

  it("returns no rows for empty input", () => {
    expect(parseCsv("").rows).toEqual([]);
  });
});

describe("parseAmount", () => {
  it.each([
    ["15.49", 1549],
    ["-15.49", -1549],
    ["(15.49)", -1549],
    ["-$1,234.50", -123450],
    ["$ 1 234,50", 123450],
    ["15,49 €", 1549],
    ["12.50-", -1250],
    ["+7", 700],
    ["1.234,56", 123456],
    ["1,234.56", 123456],
  ])("parses %s", (text, expected) => expect(parseAmount(text, "USD")).toBe(expected));

  it.each(["", "abc", "1.234", "--5", "12.345"])("rejects %j", (text) => expect(parseAmount(text, "USD")).toBeNull());

  it("respects zero-decimal currencies", () => {
    expect(parseAmount("1500", "JPY")).toBe(1500);
    expect(parseAmount("15.5", "JPY")).toBeNull();
  });
});

describe("dates", () => {
  it("parses ISO and slash formats with an explicit order", () => {
    expect(parseDateCell("2025-03-04", "mdy")).toBe("2025-03-04");
    expect(parseDateCell("2025/3/4 14:22", "mdy")).toBe("2025-03-04");
    expect(parseDateCell("03/04/2025", "mdy")).toBe("2025-03-04");
    expect(parseDateCell("03/04/2025", "dmy")).toBe("2025-04-03");
    expect(parseDateCell("3/4/25", "mdy")).toBe("2025-03-04");
    expect(parseDateCell("31.12.2024", "dmy")).toBe("2024-12-31");
    expect(parseDateCell("02/30/2025", "mdy")).toBeNull();
    expect(parseDateCell("not a date", "mdy")).toBeNull();
  });

  it("auto-detects day-first columns", () => {
    expect(detectDateOrder(["13/01/2025", "02/02/2025"])).toBe("dmy");
    expect(detectDateOrder(["01/13/2025", "02/02/2025"])).toBe("mdy");
    expect(detectDateOrder(["01/02/2025"])).toBe("mdy"); // ambiguous -> month first
  });
});

describe("buildTransactions", () => {
  const table = tableFromRows(parseCsv("Date,Description,Amount\n01/15/2025,NETFLIX.COM,-15.49\n01/16/2025,PAYROLL,2450.00\nbad,X,1\n01/17/2025,,5\n01/18/2025,COFFEE,abc\n01/19/2025,FREE,0\n").rows)!;

  it("guesses columns from header names", () => {
    const mapping = guessMapping(table.headers);
    expect(mapping).toMatchObject({ date: 0, description: 1, amount: 2 });
    expect(isMappingComplete(mapping)).toBe(true);
  });

  it("builds signed transactions and reports every skipped row with a reason", () => {
    const result = buildTransactions(table, guessMapping(table.headers), DEFAULT_IMPORT_OPTIONS);
    expect(result.transactions.map((t) => [t.id, t.date, t.merchant, t.amountMinor, t.sourceRow])).toEqual([
      ["tx-2", "2025-01-15", "NETFLIX.COM", -1549, 2],
      ["tx-3", "2025-01-16", "PAYROLL", 245000, 3],
    ]);
    expect(result.skipped.map((s) => [s.row, s.reason])).toEqual([
      [4, "Missing or unreadable date"],
      [5, "Missing description"],
      [6, "Missing or unreadable amount"],
      [7, "Zero amount"],
    ]);
  });

  it("flips signs for card exports that list charges as positive", () => {
    const result = buildTransactions(table, guessMapping(table.headers), { ...DEFAULT_IMPORT_OPTIONS, positiveIsSpending: true });
    expect(result.transactions[0]?.amountMinor).toBe(1549);
    expect(result.transactions[1]?.amountMinor).toBe(-245000);
  });

  it("supports separate debit and credit columns", () => {
    const t = tableFromRows(parseCsv("Posted,Details,Debit,Credit\n2025-02-01,SPOTIFY,11.99,\n2025-02-02,REFUND,,5.00\n").rows)!;
    const mapping = guessMapping(t.headers);
    expect(mapping).toMatchObject({ amount: null, debit: 2, credit: 3 });
    expect(buildTransactions(t, mapping, DEFAULT_IMPORT_OPTIONS).transactions.map((x) => x.amountMinor)).toEqual([-1199, 500]);
  });

  it("returns nothing when the mapping is incomplete", () => {
    expect(buildTransactions(table, { date: 0, description: null, amount: 2, debit: null, credit: null }, DEFAULT_IMPORT_OPTIONS).transactions).toEqual([]);
  });
});
