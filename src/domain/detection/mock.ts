import { addDays } from "../dates";
import type { ISODate, SubscriptionInput } from "../subscription";
import type { DetectionRequest, DetectionResult, SubscriptionDetector, Transaction } from "./types";

/**
 * ============================  MOCK  DATA  ============================
 * Everything in this file is FAKE and exists only so the import UI can be
 * developed and demoed before the real detector exists. It is NOT a detection
 * algorithm: the mock detector ignores the transaction contents entirely.
 * ======================================================================
 */

export const MOCK_ENGINE_NAME = "MOCK detector (canned data)";

/** Fake statement: four months of made-up charges, dated relative to `today`. */
export function buildMockTransactions(today: ISODate): Transaction[] {
  // [merchant, amount in cents (negative = spend), day offsets before today]
  const rows: Array<[string, number, number[]]> = [
    ["NETFLIX.COM", -1549, [88, 58, 28]],
    ["SPOTIFY USA", -1199, [84, 54, 24]],
    ["OPENAI *CHATGPT SUBSCR", -2000, [80, 50, 20]],
    ["PLANET FITNESS", -3999, [75, 45, 15]],
    ["WHOLE FOODS MARKET", -8423, [86, 71, 52, 37, 19, 6]],
    ["SHELL OIL 5712", -4210, [79, 62, 41, 9]],
    ["BLUE BOTTLE COFFEE", -675, [83, 77, 60, 55, 33, 12, 4]],
    ["PAYROLL ACME CORP", 245000, [85, 70, 55, 40, 25, 10]],
  ];
  const out: Transaction[] = [];
  for (const [merchant, amountMinor, offsets] of rows) {
    for (const daysAgo of offsets) {
      const row = out.length + 2;
      out.push({ id: `tx-${row}`, date: addDays(today, -daysAgo), merchant, amountMinor, currency: "USD", sourceRow: row });
    }
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

/** Canned suggestions with a spread of confidence levels so every UI state can be exercised. */
export const mockDetector: SubscriptionDetector = {
  detect(request: DetectionRequest): DetectionResult {
    const evidence = request.transactions.slice(0, 3).map((t) => t.id); // arbitrary: mock evidence is not real
    const tracked = new Set(request.existingSubscriptions.map((s) => s.merchant.toLowerCase()));
    const mk = (
      id: string,
      merchant: string,
      price: number,
      interval: SubscriptionInput["interval"],
      inDays: number,
      confidence: number,
      occurrences: number,
    ) => ({
      id,
      proposed: { merchant, priceMinor: price, currency: "USD", interval, nextRenewal: addDays(request.today, inDays), status: "active" as const },
      confidence,
      occurrences,
      firstSeen: addDays(request.today, -88),
      lastSeen: addDays(request.today, -20),
      transactionIds: evidence,
      reasons: ["MOCK suggestion: not derived from your transactions"],
      alreadyTracked: tracked.has(merchant.toLowerCase()),
    });
    return {
      engine: { name: MOCK_ENGINE_NAME, isMock: true },
      analyzedTransactions: request.transactions.length,
      warnings: ["Mock detection: these suggestions are canned sample data, not real analysis."],
      suggestions: [
        mk("mock-netflix", "Netflix", 1549, "monthly", 2, 0.96, 3),
        mk("mock-spotify", "Spotify Premium", 1199, "monthly", 6, 0.91, 3),
        mk("mock-chatgpt", "ChatGPT Plus", 2000, "monthly", 10, 0.84, 3),
        mk("mock-gym", "Planet Fitness", 3999, "monthly", 15, 0.58, 3),
        mk("mock-prime", "Amazon Prime", 13900, "yearly", 120, 0.41, 2),
      ],
    };
  },
};
