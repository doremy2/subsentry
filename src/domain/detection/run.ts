import type { ISODate, Subscription } from "../subscription";
import { DetectionFailure, type DetectionOutcome, type DetectionRequest, type SubscriptionDetector } from "./types";
import { parseTransactions, validateDetectionResult } from "./validation";

/**
 * The single entry point that runs a detector safely:
 *   untrusted transactions -> validate -> detector -> validate result -> outcome.
 * Never throws and never rejects. Used by the main process (and by the browser
 * preview), so partner code only has to implement `SubscriptionDetector`.
 */
export async function runDetection(
  detector: SubscriptionDetector,
  rawTransactions: unknown,
  context: { existingSubscriptions: readonly Subscription[]; today: ISODate },
): Promise<DetectionOutcome> {
  const parsed = parseTransactions(rawTransactions);
  if (!parsed.ok) {
    return { ok: false, error: { code: "invalid_input", message: "The imported transactions are not valid.", details: parsed.errors } };
  }

  const request: DetectionRequest = { transactions: parsed.value, ...context };
  try {
    const result = await detector.detect(request);
    const checked = validateDetectionResult(result, request);
    if (!checked.ok) {
      return { ok: false, error: { code: "invalid_result", message: "The detector returned data that breaks the contract.", details: checked.errors } };
    }
    return { ok: true, result: checked.value };
  } catch (error) {
    if (error instanceof DetectionFailure) return { ok: false, error: error.error };
    // Deliberately generic: never surface text that might contain transaction data.
    return { ok: false, error: { code: "internal", message: "Detection failed unexpectedly." } };
  }
}
