import { describe, expect, it } from "vitest";
import { addMonths, daysBetween, isValidISODate, nextOccurrence } from "./dates";

describe("dates", () => {
  it("validates real calendar dates only", () => {
    expect(isValidISODate("2024-02-29")).toBe(true);
    expect(isValidISODate("2025-02-29")).toBe(false);
    expect(isValidISODate("2025-13-01")).toBe(false);
    expect(isValidISODate("2025-1-1")).toBe(false);
  });

  it("counts days across month and year boundaries", () => {
    expect(daysBetween("2025-12-30", "2026-01-02")).toBe(3);
    expect(daysBetween("2025-03-10", "2025-03-10")).toBe(0);
    expect(daysBetween("2025-03-10", "2025-03-05")).toBe(-5);
  });

  it("clamps to month end when adding months", () => {
    expect(addMonths("2025-01-31", 1)).toBe("2025-02-28");
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-29");
    expect(addMonths("2025-11-15", 3)).toBe("2026-02-15");
  });

  describe("nextOccurrence", () => {
    it("keeps future dates unchanged", () => {
      expect(nextOccurrence("2025-06-10", "monthly", "2025-06-01")).toBe("2025-06-10");
      expect(nextOccurrence("2025-06-10", "monthly", "2025-06-10")).toBe("2025-06-10");
    });

    it("rolls stale monthly dates forward", () => {
      expect(nextOccurrence("2025-01-15", "monthly", "2025-04-20")).toBe("2025-05-15");
    });

    it("does not drift the day-of-month after short months", () => {
      expect(nextOccurrence("2025-01-31", "monthly", "2025-03-01")).toBe("2025-03-31");
    });

    it("rolls weekly, quarterly and yearly", () => {
      expect(nextOccurrence("2025-01-01", "weekly", "2025-01-10")).toBe("2025-01-15");
      expect(nextOccurrence("2025-01-01", "quarterly", "2025-05-01")).toBe("2025-07-01");
      expect(nextOccurrence("2023-08-09", "yearly", "2025-09-01")).toBe("2026-08-09");
    });
  });
});
