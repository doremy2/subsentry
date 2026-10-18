# Handoff: recurring-payment detection (for Developer 2 + Codex)

**Your job:** implement ONE function, `detectRecurring`, in
[`electron/main/detection/recurringDetector.ts`](../electron/main/detection/recurringDetector.ts).
The import UI, preview, suggestion cards, confirm/reject, IPC and validation already exist and need no changes.

Work on branch **`feature/csv-detection`** (starts from `feature/import-ui`, which holds the contract). Read `AGENTS.md` and `docs/BRANCHING.md` first.

## The contract (src/domain/detection/types.ts)
```ts
detectRecurring(request: DetectionRequest): DetectionResult

DetectionRequest { transactions: Transaction[]; existingSubscriptions: Subscription[]; today: ISODate }
Transaction      { id; date: 'YYYY-MM-DD'; merchant: string /* raw, un-normalised */;
                   amountMinor: number /* cents, NEGATIVE = spent */; currency; sourceRow }
DetectionResult  { engine: { name; isMock: false }; suggestions: SubscriptionSuggestion[];
                   warnings: string[]; analyzedTransactions: number }
SubscriptionSuggestion {
  id /* unique */; proposed: SubscriptionInput /* what Confirm saves; status 'active' */;
  confidence /* 0..1 */; occurrences /* >=1 */; firstSeen; lastSeen;
  transactionIds /* must exist in the request */; reasons: string[]; alreadyTracked?: boolean }
```
Throw `new DetectionFailure('invalid_input' | 'internal' | ..., 'message')` for known failures. Everything you return is validated by `validateDetectionResult` (`src/domain/detection/validation.ts`); a violation shows the user an error, so run your output through `runDetection` in tests.

## Rules (non-negotiable)
- **Private & local:** no network, no disk writes, no logging of transaction data, no new services. Pure and deterministic; use `request.today`, not `new Date()`.
- **Never auto-save:** you only *suggest*. The user's Confirm click saves via the existing validated path.
- Keep it cross-platform (no OS-specific code; use `node:path` if you need paths).
- TypeScript strict, no `any`; add Vitest tests next to your code (`recurringDetector.test.ts`, helpers like `normalizeMerchant.ts`). No Python or backend unless we agree first.
- **Do not edit** contract files (`types.ts`, `validation.ts`, `run.ts`, `electron/shared/api.ts`) or UI files. Need a contract change? Open a small separate `contract-change` PR and tell Developer 1 first (`docs/BRANCHING.md`).
- You own `electron/main/detection/**` and `src/domain/csv/**` (bank-format parsing: keep the exported function signatures the UI uses).

## Run & test
```bash
npm ci
npm run check                      # typecheck + lint + tests
npm run dev:web                    # UI in browser; uses the MOCK detector
SUBSENTRY_MOCK_DETECTION=0 npm start   # real desktop app + YOUR detector (needs a local Mac/Windows; not Codespaces)
```
Sample data: `docs/samples/sample-transactions.MOCK.csv` (fake). Import it in the app: Manage > Import CSV. In development the app uses the labelled MOCK detector by default; `SUBSENTRY_MOCK_DETECTION=0` switches to yours. Packaged builds always use yours.

## Done when
- [ ] `detectRecurring` returns valid results for the sample CSV (Netflix, Spotify, ChatGPT, gym found; groceries/coffee/fuel/payroll not)
- [ ] Handles: empty/short history, one-off charges, price changes, weekly/monthly/quarterly/yearly, refunds (positive amounts), duplicate merchants with different spellings, already-tracked subscriptions (`alreadyTracked`)
- [ ] Confidence reflects evidence (more regular charges = higher); `reasons` explain it in plain language
- [ ] `proposed.nextRenewal` is on/after `today`; `proposed.priceMinor` is the latest charge
- [ ] Tests cover the above; `npm run check` green; PR to `main` with CI green on macOS + Windows

## Paste this into Codex
> You are working in the SubSentry repo (Electron + React + TypeScript), branch `feature/csv-detection`. Read `AGENTS.md`, `docs/HANDOFF_DETECTION.md`, `docs/DETECTION.md` and `src/domain/detection/types.ts`. Implement `detectRecurring` in `electron/main/detection/recurringDetector.ts` (plus helper modules and Vitest tests beside it) so that it detects recurring subscription payments from `request.transactions` and returns a contract-valid `DetectionResult`. Constraints: local, pure, deterministic, no network/disk/logging of transaction data, TypeScript strict with no `any`, cross-platform. Do not modify the UI, the contract files, or add a Python/backend service. Validate with `runDetection` from `src/domain/detection/run.ts` and `npm run check`.
