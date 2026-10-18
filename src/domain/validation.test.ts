import { describe, expect, it } from "vitest";
import { formatMoney, parsePriceToMinor } from "./money";
import { validateSubscriptionDraft, type SubscriptionDraft } from "./validation";

const valid: SubscriptionDraft = {
  merchant: "  Netflix ",
  price: "15.49",
  currency: "usd",
  interval: "monthly",
  nextRenewal: "2025-07-01",
  status: "active",
};

describe("parsePriceToMinor", () => {
  it("converts to minor units", () => {
    expect(parsePriceToMinor("15.49", "USD")).toBe(1549);
    expect(parsePriceToMinor("10", "USD")).toBe(1000);
    expect(parsePriceToMinor("9.9", "USD")).toBe(990);
    expect(parsePriceToMinor("1,299.00", "USD")).toBe(129900);
    expect(parsePriceToMinor("1500", "JPY")).toBe(1500);
  });

  it("rejects bad input", () => {
    expect(parsePriceToMinor("abc", "USD")).toBeNull();
    expect(parsePriceToMinor("-3", "USD")).toBeNull();
    expect(parsePriceToMinor("1.999", "USD")).toBeNull();
    expect(parsePriceToMinor("10.5", "JPY")).toBeNull();
  });
});

describe("formatMoney", () => {
  it("formats minor units", () => {
    expect(formatMoney(1549, "USD")).toContain("15.49");
  });
});

describe("validateSubscriptionDraft", () => {
  it("normalises a valid draft", () => {
    const result = validateSubscriptionDraft(valid);
    expect(result).toEqual({
      ok: true,
      value: { merchant: "Netflix", priceMinor: 1549, currency: "USD", interval: "monthly", nextRenewal: "2025-07-01", status: "active" },
    });
  });

  it("reports every bad field", () => {
    const result = validateSubscriptionDraft({
      merchant: " ",
      price: "",
      currency: "XXX",
      interval: "daily",
      nextRenewal: "2025-02-30",
      status: "gone",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(["currency", "interval", "merchant", "nextRenewal", "price", "status"]);
  });

  it("rejects zero and absurd prices", () => {
    expect(validateSubscriptionDraft({ ...valid, price: "0" }).ok).toBe(false);
    expect(validateSubscriptionDraft({ ...valid, price: "9999999" }).ok).toBe(false);
  });

  it("rejects over-long merchant names", () => {
    expect(validateSubscriptionDraft({ ...valid, merchant: "x".repeat(61) }).ok).toBe(false);
  });
});
