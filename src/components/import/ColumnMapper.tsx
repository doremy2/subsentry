import type { ColumnMapping, DateOrder, ImportOptions } from "../../domain/csv/importTransactions";
import { SUPPORTED_CURRENCIES } from "../../domain/subscription";

interface Props {
  headers: string[];
  mapping: ColumnMapping;
  options: ImportOptions;
  /** Whether the full editor is expanded. The parent keeps it open while the mapping is incomplete. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMappingChange: (mapping: ColumnMapping) => void;
  onOptionsChange: (options: ImportOptions) => void;
}

const COLUMNS: Array<{ key: keyof ColumnMapping; label: string }> = [
  { key: "date", label: "Date" },
  { key: "description", label: "Merchant / description" },
  { key: "amount", label: "Amount" },
  { key: "debit", label: "Debit (optional)" },
  { key: "credit", label: "Credit (optional)" },
];

/** Lets the user correct the automatic column guesses, since every bank formats exports differently. */
export function ColumnMapper({ headers, mapping, options, open, onOpenChange, onMappingChange, onOptionsChange }: Props) {
  const name = (index: number | null) => (index === null ? null : headers[index] || `Column ${index + 1}`);
  const used = [
    ["Date", name(mapping.date)],
    ["Merchant", name(mapping.description)],
    ["Amount", name(mapping.amount) ?? (mapping.debit !== null || mapping.credit !== null ? [name(mapping.debit), name(mapping.credit)].filter(Boolean).join(" / ") : null)],
  ] as const;

  return (
    <details
      data-testid="column-mapper"
      className="panel group rounded-2xl"
      open={open}
      onToggle={(e) => onOpenChange(e.currentTarget.open)}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-2.5 text-xs [&::-webkit-details-marker]:hidden">
        <span className="font-medium uppercase tracking-[0.14em] text-white/40">Columns</span>
        <span className="min-w-0 flex-1 truncate text-white/60">
          {used.map(([label, value]) => `${label}: ${value ?? "—"}`).join("  ·  ")}
        </span>
        <span className="shrink-0 text-accent group-open:hidden">Edit</span>
        <span className="hidden shrink-0 text-white/50 group-open:inline">Hide</span>
      </summary>
      <div className="grid grid-cols-2 gap-3 px-4 pb-4 lg:grid-cols-3">
        {COLUMNS.map(({ key, label }) => (
          <label key={key} className="block">
            <span className="mb-1 block text-xs text-white/55">{label}</span>
            <select
              className="field !py-1.5 text-xs"
              aria-label={label}
              value={mapping[key] ?? ""}
              onChange={(e) => onMappingChange({ ...mapping, [key]: e.target.value === "" ? null : Number(e.target.value) })}
            >
              <option value="">— not used —</option>
              {headers.map((h, i) => (
                <option key={i} value={i}>{h || `Column ${i + 1}`}</option>
              ))}
            </select>
          </label>
        ))}
        <label className="block">
          <span className="mb-1 block text-xs text-white/55">Date format</span>
          <select className="field !py-1.5 text-xs" aria-label="Date format" value={options.dateOrder} onChange={(e) => onOptionsChange({ ...options, dateOrder: e.target.value as DateOrder })}>
            <option value="auto">Auto-detect</option>
            <option value="mdy">Month / Day / Year</option>
            <option value="dmy">Day / Month / Year</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-white/55">Currency</span>
          <select className="field !py-1.5 text-xs" aria-label="Currency" value={options.currency} onChange={(e) => onOptionsChange({ ...options, currency: e.target.value })}>
            {SUPPORTED_CURRENCIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="flex items-end gap-2 pb-1.5">
          <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={options.positiveIsSpending} onChange={(e) => onOptionsChange({ ...options, positiveIsSpending: e.target.checked })} />
          <span className="text-xs text-white/70">Charges are positive numbers</span>
        </label>
      </div>
    </details>
  );
}
