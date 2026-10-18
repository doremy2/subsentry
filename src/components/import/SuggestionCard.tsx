import { confidenceBand, formatConfidence } from "../../domain/detection/confidence";
import type { SubscriptionSuggestion } from "../../domain/detection/types";
import { formatMoney } from "../../domain/money";
import { formatShortDate, INTERVAL_LABEL } from "../format";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { MerchantAvatar } from "../ui/MerchantAvatar";

export type Decision = { status: "saving" } | { status: "added" } | { status: "rejected" } | { status: "error"; message: string };

const BAND_STYLE = {
  high: { bar: "bg-ok", text: "text-ok", label: "High" },
  medium: { bar: "bg-warn", text: "text-warn", label: "Medium" },
  low: { bar: "bg-white/40", text: "text-white/55", label: "Low" },
} as const;

interface Props {
  suggestion: SubscriptionSuggestion;
  today: string;
  decision: Decision | undefined;
  onConfirm: () => void;
  onReject: () => void;
  onUndo: () => void;
}

/** One suggestion: nothing is saved until the user presses Confirm. */
export function SuggestionCard({ suggestion: s, today, decision, onConfirm, onReject, onUndo }: Props) {
  const band = BAND_STYLE[confidenceBand(s.confidence)];
  const { proposed } = s;
  const busy = decision?.status === "saving";
  const settled = decision?.status === "added" || decision?.status === "rejected";

  return (
    <li className={`panel animate-fade-up rounded-2xl p-4 transition ${decision?.status === "rejected" ? "opacity-50" : ""}`} data-testid="suggestion">
      <div className="flex items-start gap-4">
        <MerchantAvatar name={proposed.merchant} size={40} dimmed={decision?.status === "rejected"} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{proposed.merchant}</span>
            {s.alreadyTracked && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/60">Already tracked</span>}
          </div>
          <p className="text-sm text-white/60">
            {formatMoney(proposed.priceMinor, proposed.currency)} · {INTERVAL_LABEL[proposed.interval]} · next {formatShortDate(proposed.nextRenewal, today)}
          </p>
          <p className="mt-1 text-xs text-white/40">
            {s.occurrences} charge{s.occurrences === 1 ? "" : "s"} · {formatShortDate(s.firstSeen, today)} to {formatShortDate(s.lastSeen, today)}
          </p>
          {s.reasons.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-xs text-white/50">
              {s.reasons.map((r, i) => <li key={i}>• {r}</li>)}
            </ul>
          )}
        </div>

        <div className="w-28 shrink-0 text-right">
          <p className={`text-lg font-semibold tabular-nums ${band.text}`} aria-label={`Confidence ${formatConfidence(s.confidence)}, ${band.label}`}>{formatConfidence(s.confidence)}</p>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
            <div className={`h-full rounded-full ${band.bar}`} style={{ width: `${Math.round(s.confidence * 100)}%` }} />
          </div>
          <p className="mt-1 text-[11px] uppercase tracking-wider text-white/35">{band.label} confidence</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        {decision?.status === "error" && <span role="alert" className="mr-auto text-xs text-danger">{decision.message}</span>}
        {decision?.status === "added" && <span className="mr-auto inline-flex items-center gap-1 text-sm text-ok"><Icon name="check" size={16} />Added to your subscriptions</span>}
        {decision?.status === "rejected" && (
          <Button className="!py-1 text-xs" onClick={onUndo}><Icon name="undo" size={12} className="mr-1 inline" />Undo</Button>
        )}
        {!settled && (
          <>
            <Button className="!py-1.5 text-xs" onClick={onReject} disabled={busy}>Reject</Button>
            <Button variant="primary" className="!py-1.5 text-xs" onClick={onConfirm} disabled={busy}>
              {busy ? "Adding…" : s.alreadyTracked ? "Add anyway" : "Confirm"}
            </Button>
          </>
        )}
      </div>
    </li>
  );
}
