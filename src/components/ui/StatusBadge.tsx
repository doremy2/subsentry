import type { SubscriptionStatus } from "../../domain/subscription";
import { STATUS_LABEL } from "../format";

const STYLE: Record<SubscriptionStatus, string> = {
  active: "bg-ok/15 text-ok",
  paused: "bg-warn/15 text-warn",
  cancelled: "bg-white/10 text-white/50",
};

export function StatusBadge({ status }: { status: SubscriptionStatus }) {
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STYLE[status]}`}>{STATUS_LABEL[status]}</span>;
}
