import { describe, expect, it } from "vitest";
import { buildMockTransactions, mockDetector } from "./mock";
import { runDetection } from "./run";
import { DetectionFailure, type DetectionResult, type SubscriptionDetector, type Transaction } from "./types";
import { parseTransactions, validateDetectionResult } from "./validation";

const TODAY = "2026-10-18";
const tx = (n: number, over: Partial<Transaction> = {}): Transaction => ({ id: `tx-${n}`, date: "2026-09-01", merchant: "ACME", amountMinor: -999, currency: "USD", sourceRow: n, ...over });
const ctx = { existingSubscriptions: [], today: TODAY };

const goodResult = (ids: string[]): DetectionResult => ({
  engine: { name: "test", isMock: false },
  analyzedTransactions: ids.length,
  warnings: [],
  suggestions: [
    {
      id: "s1",
      proposed: { merchant: "Acme", priceMinor: 999, currency: "USD", interval: "monthly", nextRenewal: "2026-10-30", status: "active" },
      confidence: 0.9,
      occurrences: 3,
      firstSeen: "2026-07-01",
      lastSeen: "2026-09-01",
      transactionIds: ids,
      reasons: ["monthly"],
    },
  ],
});

describe("parseTransactions", () => {
  it("accepts and trims valid data", () => {
    expect(parseTransactions([tx(2, { merchant: "  ACME  " })])).toEqual({ ok: true, value: [tx(2)] });
  });

  it.each([
    ["not an array", "x"],
    ["empty", []],
    ["bad date", [tx(2, { date: "2026-02-30" })]],
    ["float amount", [tx(2, { amountMinor: 1.5 })]],
    ["bad currency", [tx(2, { currency: "usd" })]],
    ["blank merchant", [tx(2, { merchant: "   " })]],
    ["duplicate ids", [tx(2), tx(2)]],
    ["bad sourceRow", [tx(2, { sourceRow: 0 })]],
    ["non-object", [null]],
  ])("rejects %s", (_name, input) => expect(parseTransactions(input).ok).toBe(false));

  it("enforces the size limit and never echoes transaction contents", () => {
    expect(parseTransactions(Array.from({ length: 20_001 }, (_, i) => tx(i + 2))).ok).toBe(false);
    const bad = parseTransactions([tx(2, { merchant: "SECRET-MERCHANT-NAME", date: "nope" })]);
    expect(JSON.stringify(bad)).not.toContain("SECRET-MERCHANT-NAME");
  });
});

describe("validateDetectionResult", () => {
  const request = { transactions: [tx(2), tx(3)], ...ctx };

  it("accepts a good result", () => expect(validateDetectionResult(goodResult(["tx-2", "tx-3"]), request).ok).toBe(true));

  it("rejects evidence that is not in the request", () => {
    const r = validateDetectionResult(goodResult(["tx-99"]), request);
    expect(r.ok).toBe(false);
  });

  it("rejects out-of-range confidence, bad proposals and non-active status", () => {
    const base = goodResult(["tx-2"]);
    const withSuggestion = (patch: Record<string, unknown>) => ({ ...base, suggestions: [{ ...base.suggestions[0], ...patch }] });
    expect(validateDetectionResult(withSuggestion({ confidence: 1.2 }), request).ok).toBe(false);
    expect(validateDetectionResult(withSuggestion({ confidence: NaN }), request).ok).toBe(false);
    expect(validateDetectionResult(withSuggestion({ proposed: { merchant: "", priceMinor: -1 } }), request).ok).toBe(false);
    expect(validateDetectionResult(withSuggestion({ proposed: { ...base.suggestions[0]!.proposed, status: "paused" } }), request).ok).toBe(false);
    expect(validateDetectionResult(withSuggestion({ firstSeen: "2026-10-01", lastSeen: "2026-09-01" }), request).ok).toBe(false);
    expect(validateDetectionResult(withSuggestion({ occurrences: 0 }), request).ok).toBe(false);
  });

  it("rejects duplicate suggestion ids and malformed engine info", () => {
    const base = goodResult(["tx-2"]);
    expect(validateDetectionResult({ ...base, suggestions: [base.suggestions[0], base.suggestions[0]] }, request).ok).toBe(false);
    expect(validateDetectionResult({ ...base, engine: { name: "x" } }, request).ok).toBe(false);
    expect(validateDetectionResult(null, request).ok).toBe(false);
  });
});

describe("runDetection", () => {
  const input = [tx(2), tx(3)];
  const detector = (fn: SubscriptionDetector["detect"]): SubscriptionDetector => ({ detect: fn });

  it("returns a validated outcome", async () => {
    const outcome = await runDetection(detector((r) => goodResult(r.transactions.map((t) => t.id))), input, ctx);
    expect(outcome.ok && outcome.result.suggestions).toHaveLength(1);
  });

  it("supports async detectors", async () => {
    expect((await runDetection(detector(async (r) => goodResult([r.transactions[0]!.id])), input, ctx)).ok).toBe(true);
  });

  it("never calls the detector with invalid input", async () => {
    let called = false;
    const outcome = await runDetection(detector(() => ((called = true), goodResult([]))), [{ nope: true }], ctx);
    expect(called).toBe(false);
    expect(!outcome.ok && outcome.error.code).toBe("invalid_input");
  });

  it("maps DetectionFailure to its code", async () => {
    const outcome = await runDetection(detector(() => { throw new DetectionFailure("not_implemented", "todo"); }), input, ctx);
    expect(outcome).toEqual({ ok: false, error: { code: "not_implemented", message: "todo" } });
  });

  it("turns unexpected exceptions into a generic internal error with no leaked text", async () => {
    const outcome = await runDetection(detector(() => { throw new Error("boom ACME -9.99"); }), input, ctx);
    expect(outcome.ok).toBe(false);
    expect(JSON.stringify(outcome)).not.toContain("ACME");
    expect(!outcome.ok && outcome.error.code).toBe("internal");
  });

  it("flags detectors that break the contract", async () => {
    const outcome = await runDetection(detector(() => goodResult(["tx-404"])), input, ctx);
    expect(!outcome.ok && outcome.error.code).toBe("invalid_result");
  });
});

describe("mock detector (development only)", () => {
  it("is labelled as mock and satisfies the contract", async () => {
    const outcome = await runDetection(mockDetector, buildMockTransactions(TODAY), ctx);
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.result.engine.isMock).toBe(true);
      expect(outcome.result.suggestions.length).toBeGreaterThan(3);
      expect(outcome.result.suggestions.some((s) => s.confidence < 0.5)).toBe(true); // exercises every confidence band
    }
  });

  it("generates valid, deterministic mock transactions", () => {
    const a = buildMockTransactions(TODAY);
    expect(parseTransactions(a).ok).toBe(true);
    expect(buildMockTransactions(TODAY)).toEqual(a);
  });
});
