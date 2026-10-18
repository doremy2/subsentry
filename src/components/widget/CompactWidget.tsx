import { useMemo } from "react";
import { describeDaysUntil, totalsByCurrency, upcomingRenewals } from "../../domain/billing";
import { formatMoney } from "../../domain/money";
import { useApp } from "../../state/appContext";
import { useToday } from "../../state/useToday";
import { useWindowHeight } from "../../state/useWindowHeight";
import { ResizeGrips } from "../ui/ResizeGrips";
import { formatShortDate, INTERVAL_SUFFIX } from "../format";
import { Button } from "../ui/Button";
import { NoticeBanner } from "../ui/Feedback";
import { Icon } from "../ui/Icon";
import { IconButton } from "../ui/IconButton";
import { MerchantAvatar } from "../ui/MerchantAvatar";

/** Space taken by everything except the upcoming list (header, spend, next payment, footer, window margins), px. */
const FIXED_HEIGHT = 372;
const ROW_HEIGHT = 52;
const MAX_ROWS = 8;

/** The always-visible desktop widget: glanceable spend, next payment, and what is coming up. */
export function CompactWidget() {
  const { subscriptions, setMode, hideWindow, reportError, notice, dismissNotice, preferences } = useApp();
  const today = useToday();
  const height = useWindowHeight();
  const minimal = preferences.compactLayout === "minimal";
  // A taller widget shows more upcoming renewals; a shorter one shows fewer.
  const rows = minimal ? 0 : Math.min(MAX_ROWS, Math.max(0, Math.floor((height - FIXED_HEIGHT) / ROW_HEIGHT)));

  const totals = useMemo(() => totalsByCurrency(subscriptions), [subscriptions]);
  const upcoming = useMemo(() => upcomingRenewals(subscriptions, today), [subscriptions, today]);

  const primary = totals[0];
  const others = totals.slice(1);
  const activeCount = totals.reduce((sum, t) => sum + t.count, 0);
  const next = upcoming[0];
  const following = upcoming.slice(1, 1 + rows);

  const expand = () => void setMode("expanded").catch(reportError);

  return (
    <div className="card animate-fade-in relative flex h-full flex-col overflow-hidden rounded-[28px]">
      {/* Drag handle: children ignore the pointer so the whole strip drags. */}
      <header data-drag className="flex items-center gap-2 px-5 pt-4 pb-1">
        <span data-drag className="pointer-events-none flex flex-1 items-center gap-2 text-sm font-semibold tracking-wide">
          <span className="text-accent"><Icon name="logo" size={20} /></span>
          SubSentry
        </span>
        <IconButton icon="expand" label="Open manager" onClick={expand} />
        <IconButton icon="hide" label="Hide (stays in tray / menu bar)" onClick={() => void hideWindow().catch(reportError)} />
      </header>

      <section data-drag className="px-5 pt-3 pb-4">
        <p className="pointer-events-none text-xs font-medium uppercase tracking-[0.14em] text-white/45">Monthly spend</p>
        <p className="pointer-events-none mt-1 text-[44px] leading-none font-semibold tracking-tight tabular-nums">
          {primary ? formatMoney(Math.round(primary.monthlyMinor), primary.currency) : "—"}
        </p>
        <p className="pointer-events-none mt-2 text-sm text-white/55">
          {activeCount} active subscription{activeCount === 1 ? "" : "s"}
          {others.length > 0 && <> · + {others.map((t) => formatMoney(Math.round(t.monthlyMinor), t.currency)).join(", ")}</>}
        </p>
      </section>

      {next ? (
        <button
          type="button"
          onClick={expand}
          className="panel lift animate-fade-up group mx-4 flex items-center gap-3 rounded-2xl p-3 text-left transition hover:bg-white/[0.08] active:scale-[0.99]"
        >
          <MerchantAvatar name={next.subscription.merchant} size={42} />
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-medium uppercase tracking-[0.14em] text-accent">Next payment</span>
            <span className="block truncate text-[15px] font-semibold">{next.subscription.merchant}</span>
            <span className="block text-xs text-white/55">
              {formatMoney(next.subscription.priceMinor, next.subscription.currency)} · {formatShortDate(next.date, today)}
            </span>
          </span>
          <span className="text-right">
            <span className={`block text-2xl leading-none font-semibold tabular-nums ${next.daysUntil <= 3 ? "text-warn" : ""}`}>{next.daysUntil}</span>
            <span className="block text-[11px] text-white/50">{next.daysUntil === 1 ? "day" : "days"}</span>
          </span>
        </button>
      ) : (
        <div className="panel mx-4 rounded-2xl p-4 text-center">
          <p className="text-sm font-medium">No upcoming payments</p>
          <p className="mt-1 mb-3 text-xs text-white/50">Add a subscription to start tracking.</p>
          <Button variant="primary" onClick={expand}>Add subscription</Button>
        </div>
      )}

      {minimal ? (
        <div className="flex-1" />
      ) : (
        <section className="mt-3 flex min-h-0 flex-1 flex-col px-4">
          {following.length > 0 && <h2 className="px-1 pb-1 text-[11px] font-medium uppercase tracking-[0.14em] text-white/40">Coming up</h2>}
          <ul className="flex flex-col">
            {following.map(({ subscription: sub, date, daysUntil }, i) => (
              <li key={sub.id} className="animate-fade-up" style={{ animationDelay: `${60 + i * 40}ms` }}>
                <button
                  type="button"
                  onClick={expand}
                  className="flex w-full items-center gap-3 rounded-xl px-1 py-1.5 text-left transition hover:bg-white/[0.06]"
                >
                  <MerchantAvatar name={sub.merchant} size={28} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium">{sub.merchant}</span>
                    <span className="block text-[11px] text-white/45">{describeDaysUntil(daysUntil)} · {formatShortDate(date, today)}</span>
                  </span>
                  <span className="text-[13px] tabular-nums text-white/75">
                    {formatMoney(sub.priceMinor, sub.currency)}
                    <span className="text-[11px] text-white/40">{INTERVAL_SUFFIX[sub.interval]}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

      )}

      {notice && (
        <div className="px-4 pb-2">
          <NoticeBanner message={notice} onDismiss={dismissNotice} />
        </div>
      )}

      {minimal ? (
        <div className="h-4" />
      ) : (
        <footer className="px-4 pb-4 pt-2">
          <Button className="w-full" onClick={expand}>Manage subscriptions</Button>
        </footer>
      )}
      <ResizeGrips />
    </div>
  );
}
