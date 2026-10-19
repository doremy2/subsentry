import { useState } from "react";
import { monthlyEquivalentMinor } from "../../domain/billing";
import { nextOccurrence, daysBetween } from "../../domain/dates";
import { formatMoney } from "../../domain/money";
import type { ISODate, Subscription } from "../../domain/subscription";
import { formatShortDate, INTERVAL_LABEL } from "../format";
import { Button } from "../ui/Button";
import { IconButton } from "../ui/IconButton";
import { MerchantAvatar } from "../ui/MerchantAvatar";
import { StatusBadge } from "../ui/StatusBadge";

interface Props {
  subscription: Subscription;
  today: ISODate;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  index: number;
}

export function SubscriptionRow({ subscription: sub, today, onEdit, onDelete, index }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const live = sub.status === "active";
  const next = nextOccurrence(sub.nextRenewal, sub.interval, today);
  const days = daysBetween(today, next);
  const monthly = monthlyEquivalentMinor(sub.priceMinor, sub.interval);

  async function confirmDelete() {
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  }

  return (
    <li className="panel lift animate-fade-up group flex items-center gap-4 rounded-2xl px-4 py-3 transition hover:bg-white/[0.07]" style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}>
      <MerchantAvatar name={sub.merchant} size={40} dimmed={!live} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`truncate font-medium ${live ? "" : "text-white/55"}`}>{sub.merchant}</span>
          <StatusBadge status={sub.status} />
        </div>
        <p className="text-xs text-white/50">
          {INTERVAL_LABEL[sub.interval]}
          {live ? <> · renews {formatShortDate(next, today)} ({days <= 0 ? "today" : `${days}d`})</> : <> · was due {formatShortDate(sub.nextRenewal, today)}</>}
        </p>
      </div>
      <div className="text-right">
        <p className="font-semibold tabular-nums">{formatMoney(sub.priceMinor, sub.currency)}</p>
        <p className="text-xs tabular-nums text-white/45">≈ {formatMoney(Math.round(monthly), sub.currency)}/mo</p>
      </div>
      <div className="flex w-[104px] justify-end gap-1">
        {confirming ? (
          <>
            <Button variant="danger" className="!px-3 !py-1 text-xs" onClick={confirmDelete} disabled={deleting}>{deleting ? "…" : "Delete"}</Button>
            <Button className="!px-3 !py-1 text-xs" onClick={() => setConfirming(false)} disabled={deleting}>No</Button>
          </>
        ) : (
          <>
            <IconButton icon="edit" label={`Edit ${sub.merchant}`} onClick={onEdit} />
            <IconButton icon="trash" tone="danger" label={`Delete ${sub.merchant}`} onClick={() => setConfirming(true)} />
          </>
        )}
      </div>
    </li>
  );
}
