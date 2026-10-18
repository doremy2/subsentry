import { todayISO } from "../domain/dates";
import { mockDetector } from "../domain/detection/mock";
import { runDetection } from "../domain/detection/run";
import type { DetectionOutcome, Transaction } from "../domain/detection/types";
import type { Subscription } from "../domain/subscription";

/** How the UI asks for suggestions. Never rejects: failures come back as `{ ok: false, error }`. */
export interface DetectionClient {
  analyze(transactions: Transaction[]): Promise<DetectionOutcome>;
}

/**
 * Desktop app: analysis runs in the Electron main process (local, nothing leaves the device).
 * Plain browser preview (`npm run preview:web`): runs the MOCK detector in-page so the UI can be developed.
 */
export function createDetectionClient(getSubscriptions: () => readonly Subscription[]): DetectionClient {
  const api = window.subsentry;
  if (api) {
    return {
      analyze: (transactions) =>
        api.detection.analyze(transactions).catch(
          (): DetectionOutcome => ({ ok: false, error: { code: "internal", message: "Could not reach the detection service." } }),
        ),
    };
  }
  return { analyze: (transactions) => runDetection(mockDetector, transactions, { existingSubscriptions: getSubscriptions(), today: todayISO() }) };
}
