import { formatMoney } from "../../domain/money";
import type { SkippedRow } from "../../domain/csv/importTransactions";
import type { Transaction } from "../../domain/detection/types";
import { formatFullDate } from "../format";

const MAX_ROWS = 100;

interface Props {
  transactions: Transaction[];
  skipped: SkippedRow[];
  truncated: boolean;
}

/** Read-only look at what will be analyzed: merchant, date, amount. */
export function TransactionPreview({ transactions, skipped, truncated }: Props) {
  const shown = transactions.slice(0, MAX_ROWS);
  const skippedByReason = skipped.reduce<Record<string, number>>((acc, s) => ({ ...acc, [s.reason]: (acc[s.reason] ?? 0) + 1 }), {});

  return (
    <section aria-label="Transaction preview" className="flex min-h-0 flex-1 flex-col">
      <div className="mb-2 flex items-baseline justify-between text-xs text-white/55">
        <span><strong className="text-sm text-white/85">{transactions.length}</strong> transactions ready{transactions.length > MAX_ROWS && ` (showing first ${MAX_ROWS})`}</span>
        {skipped.length > 0 && (
          <details className="relative text-right">
            <summary className="cursor-pointer text-warn">{skipped.length} rows skipped</summary>
            <ul className="absolute right-0 z-10 mt-1 w-64 rounded-xl border border-white/10 bg-[#171824] p-3 text-left shadow-xl">
              {Object.entries(skippedByReason).map(([reason, count]) => (
                <li key={reason} className="flex justify-between py-0.5"><span>{reason}</span><span className="tabular-nums">{count}</span></li>
              ))}
            </ul>
          </details>
        )}
      </div>
      {truncated && <p role="status" className="mb-2 text-xs text-warn">The file is very large; only the first rows were read.</p>}
      <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-white/[0.06]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[#1b1c28] text-left text-[11px] uppercase tracking-[0.12em] text-white/40">
            <tr><th className="px-4 py-2 font-medium">Date</th><th className="px-4 py-2 font-medium">Merchant</th><th className="px-4 py-2 text-right font-medium">Amount</th></tr>
          </thead>
          <tbody>
            {shown.map((t) => (
              <tr key={t.id} className="border-t border-white/[0.05]">
                <td className="whitespace-nowrap px-4 py-1.5 text-white/60">{formatFullDate(t.date)}</td>
                <td className="max-w-[260px] truncate px-4 py-1.5" title={t.merchant}>{t.merchant}</td>
                <td className={`whitespace-nowrap px-4 py-1.5 text-right tabular-nums ${t.amountMinor > 0 ? "text-ok" : ""}`}>
                  {t.amountMinor > 0 ? "+" : "−"}{formatMoney(Math.abs(t.amountMinor), t.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
