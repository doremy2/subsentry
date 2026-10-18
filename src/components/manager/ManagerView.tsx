import { useMemo, useState } from "react";
import { totalsByCurrency } from "../../domain/billing";
import { formatMoney } from "../../domain/money";
import { SUBSCRIPTION_STATUSES, type Subscription, type SubscriptionStatus } from "../../domain/subscription";
import { useApp } from "../../state/appContext";
import { useToday } from "../../state/useToday";
import { STATUS_LABEL } from "../format";
import { Button } from "../ui/Button";
import { NoticeBanner } from "../ui/Feedback";
import { Icon } from "../ui/Icon";
import { IconButton } from "../ui/IconButton";
import { SettingsPanel } from "./SettingsPanel";
import { SubscriptionForm } from "./SubscriptionForm";
import { SubscriptionRow } from "./SubscriptionRow";

type Filter = "all" | SubscriptionStatus;
type Editing = { kind: "add" } | { kind: "edit"; subscription: Subscription } | null;

/** Expanded management window: totals, full list, add / edit / delete, and settings. */
export function ManagerView() {
  const { subscriptions, addSubscription, updateSubscription, removeSubscription, setMode, hideWindow, reportError, notice, dismissNotice } = useApp();
  const today = useToday();
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<Editing>(null);

  const totals = useMemo(() => totalsByCurrency(subscriptions), [subscriptions]);
  const counts = useMemo(() => {
    const byStatus: Record<Filter, number> = { all: subscriptions.length, active: 0, paused: 0, cancelled: 0 };
    for (const s of subscriptions) byStatus[s.status] += 1;
    return byStatus;
  }, [subscriptions]);
  const visible = useMemo(() => (filter === "all" ? subscriptions : subscriptions.filter((s) => s.status === filter)), [subscriptions, filter]);

  const closeForm = () => setEditing(null);

  return (
    <div className="card animate-fade-in relative flex h-full flex-col overflow-hidden rounded-[28px]">
      <header data-drag className="flex items-center gap-2 px-6 pt-4 pb-2">
        <span data-drag className="pointer-events-none flex flex-1 items-center gap-2 text-sm font-semibold tracking-wide">
          <span className="text-accent"><Icon name="logo" size={20} /></span>
          SubSentry
          <span className="font-normal text-white/40">/ Manage</span>
        </span>
        <IconButton icon="collapse" label="Back to widget" onClick={() => void setMode("compact").catch(reportError)} />
        <IconButton icon="hide" label="Hide (stays in tray / menu bar)" onClick={() => void hideWindow().catch(reportError)} />
      </header>

      <div className="flex min-h-0 flex-1 gap-5 px-6 pb-6 pt-2">
        <aside className="flex w-[260px] shrink-0 flex-col gap-4 overflow-y-auto pr-1">
          <section aria-label="Spending estimates" className="panel rounded-2xl p-4">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-white/45">Estimated spend</p>
            {totals.length === 0 ? (
              <p className="mt-2 text-sm text-white/50">Nothing active yet.</p>
            ) : (
              totals.map((t) => (
                <div key={t.currency} className="mt-3 first:mt-2">
                  <p className="text-3xl font-semibold tracking-tight tabular-nums">
                    {formatMoney(Math.round(t.monthlyMinor), t.currency)}
                    <span className="ml-1 text-sm font-normal text-white/45">/ month</span>
                  </p>
                  <p className="mt-1 text-sm tabular-nums text-white/60">
                    {formatMoney(Math.round(t.yearlyMinor), t.currency)} <span className="text-white/40">/ year · {t.count} active</span>
                  </p>
                </div>
              ))
            )}
          </section>
          <div className="panel rounded-2xl p-4">
            <SettingsPanel />
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex items-center gap-3">
            <div role="tablist" aria-label="Filter by status" className="flex flex-1 gap-1 rounded-xl bg-white/[0.05] p-1">
              {(["all", ...SUBSCRIPTION_STATUSES] as Filter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  role="tab"
                  aria-selected={filter === f}
                  onClick={() => setFilter(f)}
                  className={`rounded-lg px-3 py-1 text-xs font-medium transition ${filter === f ? "bg-white/15 text-white" : "text-white/55 hover:text-white"}`}
                >
                  {f === "all" ? "All" : STATUS_LABEL[f]} <span className="text-white/40">{counts[f]}</span>
                </button>
              ))}
            </div>
            <Button variant="primary" onClick={() => setEditing({ kind: "add" })}>
              <Icon name="plus" size={14} className="mr-1 inline -translate-y-px" />Add
            </Button>
          </div>

          {notice && <NoticeBanner message={notice} onDismiss={dismissNotice} />}

          {visible.length === 0 ? (
            <div className="grid flex-1 place-items-center text-center">
              <div>
                <p className="font-medium">{subscriptions.length === 0 ? "No subscriptions yet" : `No ${filter} subscriptions`}</p>
                <p className="mt-1 text-sm text-white/50">{subscriptions.length === 0 ? "Add your first one to see your spending." : "Try a different filter."}</p>
              </div>
            </div>
          ) : (
            <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
              {visible.map((sub, i) => (
                <SubscriptionRow
                  key={sub.id}
                  index={i}
                  subscription={sub}
                  today={today}
                  onEdit={() => setEditing({ kind: "edit", subscription: sub })}
                  onDelete={() => removeSubscription(sub.id).catch(reportError)}
                />
              ))}
            </ul>
          )}
        </main>
      </div>

      {editing && (
        <SubscriptionForm
          {...(editing.kind === "edit" && { initial: editing.subscription })}
          today={today}
          onCancel={closeForm}
          onSubmit={async (input) => {
            if (editing.kind === "edit") await updateSubscription(editing.subscription.id, input);
            else await addSubscription(input);
            closeForm();
          }}
        />
      )}
    </div>
  );
}
