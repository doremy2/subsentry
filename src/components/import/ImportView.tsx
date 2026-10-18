import { useMemo, useState } from "react";
import { createDetectionClient, type DetectionClient } from "../../data/detectionClient";
import { ImportFileError, readCsvFile } from "../../data/readCsvFile";
import { buildTransactions, DEFAULT_IMPORT_OPTIONS, guessMapping, isMappingComplete, tableFromRows, type ColumnMapping, type CsvTable, type ImportOptions } from "../../domain/csv/importTransactions";
import { parseCsv } from "../../domain/csv/parseCsv";
import { buildMockTransactions } from "../../domain/detection/mock";
import type { DetectionOutcome, Transaction } from "../../domain/detection/types";
import { todayISO } from "../../domain/dates";
import { useApp } from "../../state/appContext";
import { useToday } from "../../state/useToday";
import { Button } from "../ui/Button";
import { ErrorState, Spinner } from "../ui/Feedback";
import { Icon } from "../ui/Icon";
import { ColumnMapper } from "./ColumnMapper";
import { DropZone } from "./DropZone";
import { SuggestionCard, type Decision } from "./SuggestionCard";
import { TransactionPreview } from "./TransactionPreview";

type Source = { kind: "file"; name: string; table: CsvTable } | { kind: "sample" };
type Stage = "choose" | "review" | "analyzing" | "results";

const ERROR_TITLES = {
  not_implemented: "Detection isn't available in this build yet",
  invalid_input: "These transactions couldn't be analyzed",
  invalid_result: "The detector returned unusable data",
  internal: "Detection failed",
} as const;

/**
 * CSV import flow: choose file -> review columns + preview -> analyze -> confirm/reject suggestions.
 * Everything stays on this device and in memory: leaving the screen (or "Start over") discards it.
 */
export function ImportView({ detection }: { detection?: DetectionClient }) {
  const { subscriptions, addSubscription } = useApp();
  const today = useToday();
  const client = useMemo(() => detection ?? createDetectionClient(() => subscriptions), [detection, subscriptions]);

  const [stage, setStage] = useState<Stage>("choose");
  const [source, setSource] = useState<Source | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({ date: null, description: null, amount: null, debit: null, credit: null });
  const [options, setOptions] = useState<ImportOptions>(DEFAULT_IMPORT_OPTIONS);
  const [fileError, setFileError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<DetectionOutcome | null>(null);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});

  const imported = useMemo(() => {
    if (!source) return { transactions: [] as Transaction[], skipped: [], truncated: false };
    if (source.kind === "sample") return { transactions: buildMockTransactions(todayISO()), skipped: [], truncated: false };
    return buildTransactions(source.table, mapping, options);
  }, [source, mapping, options]);

  const reset = () => {
    setStage("choose");
    setSource(null);
    setOutcome(null);
    setDecisions({});
    setFileError(null);
  };

  async function handleFile(file: File) {
    setFileError(null);
    try {
      const text = await readCsvFile(file);
      const table = tableFromRows(parseCsv(text).rows);
      if (!table) return setFileError("That file has no data rows. A CSV needs a header row and at least one transaction.");
      setSource({ kind: "file", name: file.name, table });
      setMapping(guessMapping(table.headers));
      setOptions(DEFAULT_IMPORT_OPTIONS);
      setStage("review");
    } catch (error) {
      setFileError(error instanceof ImportFileError ? error.message : "That file couldn't be read.");
    }
  }

  async function analyze() {
    setStage("analyzing");
    setDecisions({});
    setOutcome(await client.analyze(imported.transactions));
    setStage("results");
  }

  const setDecision = (id: string, decision: Decision | undefined) =>
    setDecisions((prev) => {
      const next = { ...prev };
      if (decision) next[id] = decision;
      else delete next[id];
      return next;
    });

  async function confirm(id: string, proposed: Parameters<typeof addSubscription>[0]) {
    setDecision(id, { status: "saving" });
    try {
      await addSubscription(proposed); // the ONLY place a suggestion is saved: an explicit click
      setDecision(id, { status: "added" });
    } catch (error) {
      setDecision(id, { status: "error", message: error instanceof Error ? error.message : "Could not add this subscription." });
    }
  }

  const privacyNote = (
    <p className="flex items-center gap-2 text-xs text-white/45">
      <Icon name="pin" size={12} />
      Your file is read and analyzed on this device only. Nothing is uploaded, and transactions are never saved.
    </p>
  );

  if (stage === "choose") {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
        <DropZone onFile={(f) => void handleFile(f)} />
        {fileError && <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{fileError}</p>}
        <div className="flex items-center justify-between gap-4">
          {privacyNote}
          <Button className="shrink-0 text-xs" onClick={() => { setSource({ kind: "sample" }); setStage("review"); }}>
            Try sample data <span className="ml-1 rounded bg-warn/20 px-1.5 text-[10px] font-semibold text-warn">MOCK</span>
          </Button>
        </div>
      </div>
    );
  }

  if (stage === "analyzing") {
    return <div className="grid flex-1 place-items-center"><Spinner label="Looking for recurring payments…" /></div>;
  }

  if (stage === "results" && outcome) {
    if (!outcome.ok) {
      return (
        <div className="grid flex-1 place-items-center">
          <div className="flex flex-col items-center gap-3">
            <ErrorState message={outcome.error.message} />
            <p className="text-xs text-white/40">{ERROR_TITLES[outcome.error.code]}</p>
            <div className="flex gap-2"><Button onClick={() => setStage("review")}>Back</Button><Button onClick={reset}>Start over</Button></div>
          </div>
        </div>
      );
    }
    const { result } = outcome;
    const suggestions = [...result.suggestions].sort((a, b) => b.confidence - a.confidence);
    const added = Object.values(decisions).filter((d) => d.status === "added").length;
    const rejected = Object.values(decisions).filter((d) => d.status === "rejected").length;
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {result.engine.isMock && (
          <div role="status" data-testid="mock-banner" className="rounded-xl border border-warn/30 bg-warn/10 px-4 py-2 text-sm text-warn">
            <strong>MOCK DATA.</strong> These suggestions are canned samples for development, not an analysis of your transactions.
          </div>
        )}
        {result.warnings.filter((w) => !result.engine.isMock || !w.startsWith("Mock")).map((w, i) => <p key={i} role="status" className="text-xs text-white/55">{w}</p>)}
        <div className="flex items-center justify-between">
          <p className="text-sm text-white/60">
            {suggestions.length} suggestion{suggestions.length === 1 ? "" : "s"} from {result.analyzedTransactions} transactions
            <span className="text-white/35"> · {added} added · {rejected} rejected</span>
          </p>
          <div className="flex gap-2"><Button className="!py-1 text-xs" onClick={() => setStage("review")}>Back</Button><Button className="!py-1 text-xs" onClick={reset}>Start over</Button></div>
        </div>
        {suggestions.length === 0 ? (
          <div className="grid flex-1 place-items-center text-center"><div><p className="font-medium">No recurring payments found</p><p className="mt-1 text-sm text-white/50">Try a longer date range, or add subscriptions manually.</p></div></div>
        ) : (
          <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1" aria-label="Detected subscriptions">
            {suggestions.map((s) => (
              <SuggestionCard
                key={s.id}
                suggestion={s}
                today={today}
                decision={decisions[s.id]}
                onConfirm={() => void confirm(s.id, s.proposed)}
                onReject={() => setDecision(s.id, { status: "rejected" })}
                onUndo={() => setDecision(s.id, undefined)}
              />
            ))}
          </ul>
        )}
      </div>
    );
  }

  // stage === "review"
  const ready = imported.transactions.length > 0;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-sm text-white/70">
          {source?.kind === "sample" ? <>Sample data <span className="rounded bg-warn/20 px-1.5 text-[10px] font-semibold text-warn">MOCK</span></> : source?.name}
        </p>
        <div className="flex gap-2">
          <Button className="!py-1.5 text-xs" onClick={reset}>Choose another file</Button>
          <Button variant="primary" className="!py-1.5 text-xs" disabled={!ready} onClick={() => void analyze()}>Find subscriptions</Button>
        </div>
      </div>
      {source?.kind === "file" && (
        <ColumnMapper headers={source.table.headers} mapping={mapping} options={options} onMappingChange={setMapping} onOptionsChange={setOptions} />
      )}
      {source?.kind === "file" && !isMappingComplete(mapping) && (
        <p role="alert" className="text-sm text-warn">Choose the Date and Merchant columns, plus an Amount (or Debit/Credit) column.</p>
      )}
      {ready || imported.skipped.length > 0 ? (
        <TransactionPreview transactions={imported.transactions} skipped={imported.skipped} truncated={imported.truncated} />
      ) : (
        <div className="grid flex-1 place-items-center text-sm text-white/45">Nothing to preview yet.</div>
      )}
      {privacyNote}
    </div>
  );
}
