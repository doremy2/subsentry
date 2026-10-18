export type ConfidenceBand = "high" | "medium" | "low";

/** UI thresholds: >= 80% high, >= 50% medium, otherwise low. */
export function confidenceBand(confidence: number): ConfidenceBand {
  if (confidence >= 0.8) return "high";
  if (confidence >= 0.5) return "medium";
  return "low";
}

export const formatConfidence = (confidence: number): string => `${Math.round(confidence * 100)}%`;
