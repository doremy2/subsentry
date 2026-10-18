import { describe, expect, it } from "vitest";
import { runDetection } from "../../../src/domain/detection/run";
import { buildMockTransactions } from "../../../src/domain/detection/mock";
import { selectDetector, shouldUseMockDetection } from "./index";

describe("detector selection", () => {
  it("uses the mock in development and the real detector when packaged", () => {
    expect(shouldUseMockDetection(false, {})).toBe(true);
    expect(shouldUseMockDetection(true, {})).toBe(false);
  });
  it("lets the environment override either way", () => {
    expect(shouldUseMockDetection(true, { SUBSENTRY_MOCK_DETECTION: "1" })).toBe(true);
    expect(shouldUseMockDetection(false, { SUBSENTRY_MOCK_DETECTION: "0" })).toBe(false);
  });
});

describe("real detector stub", () => {
  it("reports not_implemented as a clean error until the partner implements it", async () => {
    const outcome = await runDetection(selectDetector(false), buildMockTransactions("2026-10-18"), { existingSubscriptions: [], today: "2026-10-18" });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.error.code).toBe("not_implemented");
  });
});
