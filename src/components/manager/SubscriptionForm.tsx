import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { addDays } from "../../domain/dates";
import { minorToInputString } from "../../domain/money";
import {
  BILLING_INTERVALS,
  SUBSCRIPTION_STATUSES,
  SUPPORTED_CURRENCIES,
  type ISODate,
  type Subscription,
  type SubscriptionInput,
} from "../../domain/subscription";
import { MERCHANT_MAX_LENGTH, validateSubscriptionDraft, type DraftField, type SubscriptionDraft, type ValidationErrors } from "../../domain/validation";
import { INTERVAL_LABEL, STATUS_LABEL } from "../format";
import { Button } from "../ui/Button";

interface Props {
  /** Present when editing; absent when adding. */
  initial?: Subscription;
  today: ISODate;
  onSubmit: (input: SubscriptionInput) => Promise<void>;
  onCancel: () => void;
}

function initialDraft(initial: Subscription | undefined, today: ISODate): SubscriptionDraft {
  if (initial) {
    return {
      merchant: initial.merchant,
      price: minorToInputString(initial.priceMinor, initial.currency),
      currency: initial.currency,
      interval: initial.interval,
      nextRenewal: initial.nextRenewal,
      status: initial.status,
    };
  }
  return { merchant: "", price: "", currency: "USD", interval: "monthly", nextRenewal: addDays(today, 30), status: "active" };
}

function Field({ label, error, children }: { label: string; error?: string | undefined; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-white/60">{label}</span>
      {children}
      {error && <span role="alert" className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}

/** Add / edit dialog. Validates with the shared domain rules before anything is saved. */
export function SubscriptionForm({ initial, today, onSubmit, onCancel }: Props) {
  const [draft, setDraft] = useState(() => initialDraft(initial, today));
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const firstField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstField.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !submitting && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, submitting]);

  const set = (field: DraftField) => (e: { target: { value: string } }) => {
    setDraft((d) => ({ ...d, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined })); // clear as the user fixes it
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const result = validateSubscriptionDraft(draft);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit(result.value);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Could not save. Please try again.");
      setSubmitting(false);
    }
  }

  const invalid = (field: DraftField) => (errors[field] ? true : undefined);

  return (
    <div className="animate-fade-in absolute inset-0 z-20 grid place-items-center rounded-[28px] bg-black/55 p-6" onMouseDown={(e) => e.target === e.currentTarget && !submitting && onCancel()}>
      <form
        onSubmit={handleSubmit}
        noValidate
        role="dialog"
        aria-modal="true"
        aria-label={initial ? "Edit subscription" : "Add subscription"}
        className="animate-pop w-full max-w-[420px] rounded-3xl border border-white/10 bg-[var(--overlay)] p-6 shadow-2xl"
      >
        <h2 className="mb-4 text-lg font-semibold">{initial ? "Edit subscription" : "Add subscription"}</h2>
        <div className="space-y-3">
          <Field label="Name" error={errors.merchant}>
            <input ref={firstField} className="field" value={draft.merchant} onChange={set("merchant")} maxLength={MERCHANT_MAX_LENGTH + 10} placeholder="Netflix" aria-invalid={invalid("merchant")} />
          </Field>
          <div className="grid grid-cols-[1fr_110px] gap-3">
            <Field label="Price" error={errors.price}>
              <input className="field tabular-nums" inputMode="decimal" value={draft.price} onChange={set("price")} placeholder="9.99" aria-invalid={invalid("price")} />
            </Field>
            <Field label="Currency" error={errors.currency}>
              <select className="field" value={draft.currency} onChange={set("currency")} aria-invalid={invalid("currency")}>
                {SUPPORTED_CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Billing cycle" error={errors.interval}>
              <select className="field" value={draft.interval} onChange={set("interval")} aria-invalid={invalid("interval")}>
                {BILLING_INTERVALS.map((i) => <option key={i} value={i}>{INTERVAL_LABEL[i]}</option>)}
              </select>
            </Field>
            <Field label="Next renewal" error={errors.nextRenewal}>
              <input type="date" className="field" value={draft.nextRenewal} onChange={set("nextRenewal")} aria-invalid={invalid("nextRenewal")} />
            </Field>
          </div>
          <Field label="Status" error={errors.status}>
            <select className="field" value={draft.status} onChange={set("status")} aria-invalid={invalid("status")}>
              {SUBSCRIPTION_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </Field>
        </div>
        {submitError && <p role="alert" className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{submitError}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button onClick={onCancel} disabled={submitting}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={submitting}>{submitting ? "Saving…" : initial ? "Save changes" : "Add"}</Button>
        </div>
      </form>
    </div>
  );
}
