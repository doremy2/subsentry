import type { ISODate, Subscription, SubscriptionInput } from "../subscription";

/**
 * Shared contract for recurring-payment detection (Milestone 4).
 *
 * The UI (renderer) and the detector (main process) only talk through these
 * types. Implement `SubscriptionDetector` (see electron/main/detection/) and the
 * UI works unchanged. Everything here is pure data: no Node, Electron or React.
 *
 * Privacy: transactions exist only in memory. They are never written to SQLite,
 * logged, or sent over the network. See docs/DETECTION.md.
 */

/** One bank/card transaction imported from a CSV file. */
export interface Transaction {
  /** Unique within one import (`tx-<row>`); referenced by suggestions as evidence. */
  id: string;
  date: ISODate;
  /** Merchant/description exactly as it appears in the statement. NOT normalised: that is detection's job. */
  merchant: string;
  /**
   * Signed amount in minor units (cents). Negative = money spent, positive = money received
   * (refund, salary). Detection should normally look at negative amounts only.
   */
  amountMinor: number;
  /** ISO 4217 code, e.g. "USD". One currency per import (chosen by the user). */
  currency: string;
  /** 1-based row number in the CSV file (header = row 1), for error messages. */
  sourceRow: number;
}

/** What a detector receives. Built by the main process; the renderer cannot set `existingSubscriptions` or `today`. */
export interface DetectionRequest {
  transactions: readonly Transaction[];
  /** Subscriptions the user already tracks, so the detector can flag duplicates. */
  existingSubscriptions: readonly Subscription[];
  /** Local date "today"; use this instead of `new Date()` so results are testable. */
  today: ISODate;
}

/** A suggested subscription. NEVER saved automatically: the user must confirm. */
export interface SubscriptionSuggestion {
  /** Unique within one result. */
  id: string;
  /** Exactly what "Confirm" saves. `status` must be "active". Validated like any user input. */
  proposed: SubscriptionInput;
  /** 0 (guess) to 1 (certain). Shown to the user as a percentage. */
  confidence: number;
  /** How many matching charges were found (>= 1). */
  occurrences: number;
  firstSeen: ISODate;
  lastSeen: ISODate;
  /** Evidence: ids of the `Transaction`s that support this suggestion. Must exist in the request. */
  transactionIds: string[];
  /** Short human-readable explanations, e.g. "Charged on the 12th of each month". */
  reasons: string[];
  /** True if it matches a subscription the user already tracks. */
  alreadyTracked?: boolean;
}

export interface DetectionEngineInfo {
  /** Display name, e.g. "recurring-v1". */
  name: string;
  /** True ONLY for the canned development detector. The UI shows a prominent MOCK banner. */
  isMock: boolean;
}

export interface DetectionResult {
  engine: DetectionEngineInfo;
  suggestions: SubscriptionSuggestion[];
  /** Non-fatal notes shown to the user, e.g. "3 transactions had no usable merchant". */
  warnings: string[];
  /** How many transactions were examined. */
  analyzedTransactions: number;
}

export const DETECTION_ERROR_CODES = ["invalid_input", "invalid_result", "not_implemented", "internal"] as const;
export type DetectionErrorCode = (typeof DETECTION_ERROR_CODES)[number];

/** Plain, serialisable error (crosses the IPC boundary as data). */
export interface DetectionError {
  code: DetectionErrorCode;
  /** Safe to show to the user. Must not contain transaction contents. */
  message: string;
  /** Optional technical details (field paths, never values). */
  details?: string[];
}

/** What the renderer gets back. Detection never rejects; it always resolves to one of these. */
export type DetectionOutcome = { ok: true; result: DetectionResult } | { ok: false; error: DetectionError };

/** Throw this from a detector to report a known failure with a code. Any other thrown error becomes `internal`. */
export class DetectionFailure extends Error {
  readonly error: DetectionError;
  constructor(code: DetectionErrorCode, message: string, details?: string[]) {
    super(message);
    this.name = "DetectionFailure";
    this.error = { code, message, ...(details && { details }) };
  }
}

/**
 * THE interface to implement. Runs locally in the Electron main process.
 * Must be deterministic and free of network or disk access.
 */
export interface SubscriptionDetector {
  detect(request: DetectionRequest): DetectionResult | Promise<DetectionResult>;
}

/** Safety limits enforced on every import. */
export const DETECTION_LIMITS = {
  maxTransactions: 20_000,
  maxMerchantLength: 200,
  maxSuggestions: 500,
  maxFileBytes: 5 * 1024 * 1024,
} as const;
