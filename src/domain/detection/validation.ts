import { isValidISODate } from "../dates";
import { parseSubscriptionInput } from "../validation";
import {
  DETECTION_LIMITS,
  type DetectionResult,
  type DetectionRequest,
  type SubscriptionSuggestion,
  type Transaction,
} from "./types";

/**
 * Contract validators. They run in the main process on every request and every
 * detector result, so neither a buggy renderer nor a buggy detector can push
 * malformed data across the boundary. Error messages name fields and row
 * positions but NEVER echo transaction contents.
 */

export type Validated<T> = { ok: true; value: T } | { ok: false; errors: string[] };

const MAX_ERRORS = 10;
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export function parseTransactions(input: unknown): Validated<Transaction[]> {
  if (!Array.isArray(input)) return { ok: false, errors: ["transactions must be an array"] };
  if (input.length === 0) return { ok: false, errors: ["there are no transactions to analyze"] };
  if (input.length > DETECTION_LIMITS.maxTransactions) {
    return { ok: false, errors: [`too many transactions (limit ${DETECTION_LIMITS.maxTransactions})`] };
  }

  const errors: string[] = [];
  const seen = new Set<string>();
  const value: Transaction[] = [];
  input.forEach((raw: unknown, i) => {
    const fail = (problem: string) => errors.length < MAX_ERRORS && errors.push(`transactions[${i}]: ${problem}`);
    if (!isObject(raw)) return void fail("not an object");
    const { id, date, merchant, amountMinor, currency, sourceRow } = raw;
    if (typeof id !== "string" || id.length === 0 || id.length > 64) return void fail("invalid id");
    if (seen.has(id)) return void fail("duplicate id");
    if (typeof date !== "string" || !isValidISODate(date)) return void fail("invalid date");
    if (typeof merchant !== "string" || merchant.trim().length === 0 || merchant.length > DETECTION_LIMITS.maxMerchantLength) return void fail("invalid merchant");
    if (typeof amountMinor !== "number" || !Number.isSafeInteger(amountMinor)) return void fail("amountMinor must be an integer");
    if (typeof currency !== "string" || !/^[A-Z]{3}$/.test(currency)) return void fail("currency must be a 3-letter code");
    if (typeof sourceRow !== "number" || !Number.isInteger(sourceRow) || sourceRow < 1) return void fail("invalid sourceRow");
    seen.add(id);
    value.push({ id, date, merchant: merchant.trim(), amountMinor, currency, sourceRow });
  });
  return errors.length > 0 ? { ok: false, errors } : { ok: true, value };
}

/**
 * Check a detector's output against the request it answered. Returns a
 * normalised copy (e.g. `proposed` goes through the same validation as a
 * hand-typed subscription).
 */
export function validateDetectionResult(input: unknown, request: DetectionRequest): Validated<DetectionResult> {
  if (!isObject(input)) return { ok: false, errors: ["result must be an object"] };
  const errors: string[] = [];
  const fail = (problem: string) => errors.length < MAX_ERRORS && errors.push(problem);

  const engine = input["engine"];
  if (!isObject(engine) || typeof engine["name"] !== "string" || engine["name"].length === 0 || engine["name"].length > 60 || typeof engine["isMock"] !== "boolean") {
    fail("engine must be { name: string, isMock: boolean }");
  }
  const warningsRaw = input["warnings"];
  if (!Array.isArray(warningsRaw) || warningsRaw.some((w) => typeof w !== "string" || w.length > 300) || warningsRaw.length > 20) {
    fail("warnings must be an array of short strings");
  }
  const analyzed = input["analyzedTransactions"];
  if (typeof analyzed !== "number" || !Number.isInteger(analyzed) || analyzed < 0) fail("analyzedTransactions must be a non-negative integer");

  const suggestionsRaw = input["suggestions"];
  const suggestions: SubscriptionSuggestion[] = [];
  if (!Array.isArray(suggestionsRaw)) {
    fail("suggestions must be an array");
  } else if (suggestionsRaw.length > DETECTION_LIMITS.maxSuggestions) {
    fail(`too many suggestions (limit ${DETECTION_LIMITS.maxSuggestions})`);
  } else {
    const knownIds = new Set(request.transactions.map((t) => t.id));
    const seen = new Set<string>();
    suggestionsRaw.forEach((raw: unknown, i) => {
      const bad = (problem: string) => fail(`suggestions[${i}]: ${problem}`);
      if (!isObject(raw)) return bad("not an object");
      const { id, proposed, confidence, occurrences, firstSeen, lastSeen, transactionIds, reasons, alreadyTracked } = raw;
      if (typeof id !== "string" || id.length === 0 || id.length > 64 || seen.has(id)) return bad("id must be a unique non-empty string");
      const input = parseSubscriptionInput(proposed);
      if (!input) return bad("proposed is not a valid subscription");
      if (input.status !== "active") return bad('proposed.status must be "active"');
      if (typeof confidence !== "number" || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) return bad("confidence must be between 0 and 1");
      if (typeof occurrences !== "number" || !Number.isInteger(occurrences) || occurrences < 1) return bad("occurrences must be an integer >= 1");
      if (typeof firstSeen !== "string" || typeof lastSeen !== "string" || !isValidISODate(firstSeen) || !isValidISODate(lastSeen) || firstSeen > lastSeen) {
        return bad("firstSeen/lastSeen must be valid dates with firstSeen <= lastSeen");
      }
      if (!Array.isArray(transactionIds) || transactionIds.length === 0 || transactionIds.some((t) => typeof t !== "string" || !knownIds.has(t))) {
        return bad("transactionIds must be a non-empty list of ids from the request");
      }
      if (!Array.isArray(reasons) || reasons.length > 10 || reasons.some((r) => typeof r !== "string" || r.length > 200)) return bad("reasons must be up to 10 short strings");
      if (alreadyTracked !== undefined && typeof alreadyTracked !== "boolean") return bad("alreadyTracked must be a boolean");
      seen.add(id);
      suggestions.push({
        id,
        proposed: input,
        confidence,
        occurrences,
        firstSeen,
        lastSeen,
        transactionIds: [...new Set(transactionIds as string[])],
        reasons: reasons as string[],
        ...(alreadyTracked !== undefined && { alreadyTracked }),
      });
    });
  }

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      engine: { name: (engine as { name: string }).name, isMock: (engine as { isMock: boolean }).isMock },
      suggestions,
      warnings: warningsRaw as string[],
      analyzedTransactions: analyzed as number,
    },
  };
}
