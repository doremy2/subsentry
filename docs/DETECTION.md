# Milestone 4: CSV import & subscription detection

## Data flow (everything local)
```
CSV file ──(File API, in memory)──▶ parseCsv / buildTransactions   [renderer, src/domain/csv]
        Transaction[] ──IPC detection:analyze──▶ main process
            parseTransactions (validate) ─▶ SubscriptionDetector.detect ─▶ validateDetectionResult
        DetectionOutcome ◀── { ok, result | error } ──┘
suggestion cards ──user clicks Confirm──▶ subscriptions:create (validated like any subscription)
```
- **Privacy:** the file is read with the browser File API, parsed in memory, analyzed in the main process, and discarded when the user leaves the screen or clicks "Start over". Transactions are not written to SQLite, logged, or sent anywhere (the production CSP is `connect-src 'self'`; tests assert no `fetch`). Packaged builds make no external requests for this feature.
- **No auto-save:** a suggestion becomes a subscription only through an explicit Confirm click.

## Pieces
| Piece | Location | Owner |
|---|---|---|
| Contract types, validators, runner | `src/domain/detection/{types,validation,run}.ts` | shared (contract-change PRs) |
| Mock detector + fake transactions (labelled MOCK, NOT an algorithm) | `src/domain/detection/mock.ts` | Developer 1 |
| **Real detector (TODO)** | `electron/main/detection/recurringDetector.ts` | **Developer 2** |
| Detector selection (mock in dev, real when packaged; `SUBSENTRY_MOCK_DETECTION=1/0` override) | `electron/main/detection/index.ts` | shared |
| CSV parsing, column guess, date/amount parsing | `src/domain/csv/` | Developer 2 (UI depends on signatures) |
| UI: drop zone, column mapper, preview, suggestion cards | `src/components/import/` | Developer 1 |
| IPC channel `detection:analyze` | `electron/{shared/api,main/ipc,preload/preload}.ts` | shared |

## Errors
`DetectionOutcome = { ok: true, result } | { ok: false, error: { code, message, details? } }`; codes: `invalid_input`, `invalid_result`, `not_implemented`, `internal`. The renderer never sees a rejected promise; error messages never contain transaction contents.

## Transaction conventions
Signed `amountMinor` (negative = spent); `merchant` is the raw statement text; one currency per import (user-chosen); `id` = `tx-<csv row>`; max 20,000 rows and 5 MB per file.

## Tests
`src/domain/detection/detection.test.ts` (contract/validators/runner), `src/domain/csv/csv.test.ts` (parsing), `electron/main/detection/index.test.ts`, `src/components/import/ImportView.test.tsx` (UI: preview, confirm/reject, nothing saved without confirmation, error states, no network).
