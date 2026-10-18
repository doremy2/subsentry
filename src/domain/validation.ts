import { isValidISODate } from "./dates";
import { minorUnitDigits, parsePriceToMinor } from "./money";
import {
  BILLING_INTERVALS,
  SUBSCRIPTION_STATUSES,
  SUPPORTED_CURRENCIES,
  type BillingInterval,
  type SubscriptionInput,
  type SubscriptionStatus,
} from "./subscription";

/** Raw form values: everything the user types arrives as a string. */
export interface SubscriptionDraft {
  merchant: string;
  price: string;
  currency: string;
  interval: string;
  nextRenewal: string;
  status: string;
}

export type DraftField = keyof SubscriptionDraft;
export type ValidationErrors = Partial<Record<DraftField, string>>;

export type ValidationResult =
  | { ok: true; value: SubscriptionInput }
  | { ok: false; errors: ValidationErrors };

export const MERCHANT_MAX_LENGTH = 60;
/** Upper sanity bound in major units. */
export const PRICE_MAX_MAJOR = 100_000;

function includes<T extends string>(list: readonly T[], value: string): value is T {
  return (list as readonly string[]).includes(value);
}

export function validateSubscriptionDraft(draft: SubscriptionDraft): ValidationResult {
  const errors: ValidationErrors = {};

  const merchant = draft.merchant.trim().replace(/\s+/g, " ");
  if (!merchant) errors.merchant = "Enter a name.";
  else if (merchant.length > MERCHANT_MAX_LENGTH) errors.merchant = `Keep it under ${MERCHANT_MAX_LENGTH} characters.`;

  const currency = draft.currency.trim().toUpperCase();
  if (!includes(SUPPORTED_CURRENCIES, currency)) errors.currency = "Choose a supported currency.";

  let priceMinor: number | null = null;
  if (!draft.price.trim()) {
    errors.price = "Enter a price.";
  } else {
    priceMinor = parsePriceToMinor(draft.price, currency);
    if (priceMinor === null) errors.price = "Use a number like 9.99.";
    else if (priceMinor <= 0) errors.price = "Price must be above zero.";
    else if (priceMinor > PRICE_MAX_MAJOR * 10 ** minorUnitDigits(currency)) {
      errors.price = "That price looks too high.";
    }
  }

  if (!includes(BILLING_INTERVALS, draft.interval)) errors.interval = "Choose a billing cycle.";
  if (!includes(SUBSCRIPTION_STATUSES, draft.status)) errors.status = "Choose a status.";
  if (!isValidISODate(draft.nextRenewal)) errors.nextRenewal = "Pick a valid renewal date.";

  if (Object.keys(errors).length > 0 || priceMinor === null) return { ok: false, errors };

  return {
    ok: true,
    value: {
      merchant,
      priceMinor,
      currency,
      interval: draft.interval as BillingInterval,
      nextRenewal: draft.nextRenewal,
      status: draft.status as SubscriptionStatus,
    },
  };
}

/**
 * Strict check of an already-typed subscription from an untrusted source
 * (the renderer over IPC). Returns the normalised value or null.
 */
export function parseSubscriptionInput(value: unknown): SubscriptionInput | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const { merchant, priceMinor, currency, interval, nextRenewal, status } = v;
  if (typeof merchant !== "string" || typeof currency !== "string" || typeof interval !== "string") return null;
  if (typeof nextRenewal !== "string" || typeof status !== "string" || typeof priceMinor !== "number") return null;
  const name = merchant.trim().replace(/\s+/g, " ");
  if (!name || name.length > MERCHANT_MAX_LENGTH) return null;
  if (!includes(SUPPORTED_CURRENCIES, currency)) return null;
  if (!Number.isSafeInteger(priceMinor) || priceMinor <= 0 || priceMinor > PRICE_MAX_MAJOR * 10 ** minorUnitDigits(currency)) return null;
  if (!includes(BILLING_INTERVALS, interval) || !includes(SUBSCRIPTION_STATUSES, status) || !isValidISODate(nextRenewal)) return null;
  return { merchant: name, priceMinor, currency, interval, nextRenewal, status };
}
