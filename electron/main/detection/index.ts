import { mockDetector } from "../../../src/domain/detection/mock";
import type { SubscriptionDetector } from "../../../src/domain/detection/types";
import { recurringDetector } from "./recurringDetector";

/**
 * Which detector the app uses.
 *   - Development (`npm start`): the labelled MOCK detector, so the UI is demoable.
 *   - Packaged builds: the real detector (`recurringDetector.ts`).
 * Override with SUBSENTRY_MOCK_DETECTION=1 (force mock) or =0 (force real, e.g.
 * to test your implementation with `npm start`).
 */
export function shouldUseMockDetection(isPackaged: boolean, env: Record<string, string | undefined>): boolean {
  if (env["SUBSENTRY_MOCK_DETECTION"] === "1") return true;
  if (env["SUBSENTRY_MOCK_DETECTION"] === "0") return false;
  return !isPackaged;
}

export function selectDetector(useMock: boolean): SubscriptionDetector {
  return useMock ? mockDetector : recurringDetector;
}
