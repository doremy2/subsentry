import { DetectionFailure, type DetectionRequest, type DetectionResult, type SubscriptionDetector } from "../../../src/domain/detection/types";

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  PARTNER: IMPLEMENT RECURRING-PAYMENT DETECTION HERE  (Milestone 4)      ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * This is the ONLY file that must change for detection to work end to end.
 * The CSV import UI, preview, suggestion cards, confirm/reject and the IPC
 * plumbing are done and need no changes. Read docs/HANDOFF_DETECTION.md first.
 *
 * Contract (src/domain/detection/types.ts):
 *   input : DetectionRequest  { transactions, existingSubscriptions, today }
 *   output: DetectionResult   { engine, suggestions, warnings, analyzedTransactions }
 *
 * Rules:
 *   - Pure and deterministic: no network, no disk, no logging of transaction data.
 *   - Use `request.today`, not `new Date()`.
 *   - Negative `amountMinor` = money spent; ignore positive amounts unless useful.
 *   - Every suggestion needs `transactionIds` that exist in the request.
 *   - Set `engine.isMock: false`.
 *   - Throw `new DetectionFailure(code, message)` for known failures.
 *   - Output is validated by `runDetection` (src/domain/detection/run.ts); a
 *     contract violation shows the user an error instead of bad data.
 *
 * You may add helper files next to this one (e.g. normalizeMerchant.ts,
 * groupCharges.ts) and unit tests (*.test.ts). Pure helpers may also live in
 * src/domain/detection/ if the UI should reuse them.
 */
export function detectRecurring(_request: DetectionRequest): DetectionResult {
  // TODO(partner): replace this stub.
  throw new DetectionFailure("not_implemented", "Recurring-payment detection is not implemented yet.");
}

/** Adapter used by the app. Keep this export shape. */
export const recurringDetector: SubscriptionDetector = { detect: detectRecurring };
