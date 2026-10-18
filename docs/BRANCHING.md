# Branching & collaboration workflow

Two developers, one repository: `github.com/doremy2/subsentry`.

| Developer | Tool | Owns |
|---|---|---|
| **Developer 1** | Claude Code | Electron shell, React UI, CSV import UI, suggestion UI, widget customization, native desktop behaviour, cross-platform testing, packaging |
| **Developer 2** | Codex | CSV parsing & bank-format handling, transaction normalization, merchant matching, recurring-payment detection, confidence scoring, billing prediction, detection tests |

## Branches
| Branch | Purpose | Owner |
|---|---|---|
| `main` | Stable, releasable app. Protected. **Never push directly.** | both (via PR) |
| `feature/import-ui` | Milestone 4 frontend: CSV import, preview, suggestion cards, contracts, mock detector | Developer 1 |
| `feature/csv-detection` | Milestone 4 detection engine behind the contract | Developer 2 |
| `feature/widget-customization` | Milestone 5A: themes, resizable widget, layouts | Developer 1 |
| `fix/<topic>`, `docs/<topic>`, `feature/<topic>` | Anything else; short-lived | whoever |

`feature/csv-detection` starts from `feature/import-ui` (it needs the contract in `src/domain/detection/`). Once `feature/import-ui` is merged, merge `main` into `feature/csv-detection`.

## Rules
1. **No unfinished work on `main`.** Everything lands through a pull request.
2. **CI must be green** (`verify`, `build-macos`, `build-windows`) and `npm run check` must pass locally before you ask for review.
3. **One review** from the other developer before merging. Authors do not merge their own PR without a review unless the other developer is unavailable and the change is docs-only.
4. **Squash-merge**, then **delete the branch**. If you keep working on the same topic, start a fresh branch from the updated `main` (avoids phantom conflicts after a squash).
5. **Shared interfaces change in their own small PR** (see below).
6. **Keep macOS and Windows working:** no hard-coded path separators (use `node:path`), no OS-specific code outside `electron/main/platform.ts`, remember macOS filesystems are case-insensitive (never rename a file by case only in one commit; use `git mv`), and note which OS you actually tested in the PR.
7. **Never commit** `node_modules`, databases, `.env`, certificates/keys, or real bank exports (`.gitignore` blocks them; do not force-add). Only `docs/samples/*.MOCK.csv` fake data is allowed.

## Shared interfaces (avoid simultaneous changes)
These files are contracts between the two developers:
- `src/domain/detection/types.ts`, `validation.ts`, `run.ts` (detection contract)
- `src/domain/subscription.ts`, `src/data/types.ts`, `electron/shared/api.ts`
- DB migrations in `electron/main/db/database.ts` and `docs/DATA_MODEL.md`
- `src/domain/csv/importTransactions.ts` public function signatures (the UI calls them)

Process: (1) message the other developer *before* editing one; (2) make the change in a **small PR containing only the contract change** (+ tests/docs), labelled `contract-change`; (3) merge it to `main` first; (4) both developers immediately merge `main` into their branches. Additive, backward-compatible changes (new optional field) are preferred over breaking ones. Only one in-flight DB migration at a time: say which number you are taking.

## Daily workflow (copy/paste)
```bash
# one time
git clone https://github.com/doremy2/subsentry.git && cd subsentry && npm ci

# start work (always from fresh main, or from the branch above if told)
git fetch origin
git switch -c feature/my-topic origin/main

# work, then check
npm run check

# commit small and often
git add -A            # review with `git status` first: nothing from .gitignore'd categories should appear
git commit -m "Short imperative summary"

# publish your branch (first push)
git push -u origin feature/my-topic

# open the PR (web link is printed by git, or:)
gh pr create --base main --fill

# keep up to date with main (merge, don't rebase, once pushed)
git fetch origin && git merge origin/main
```
Commit messages: short imperative first line (`Add transaction preview table`), optional body explaining *why*.

## Resolving merge conflicts
1. `git fetch origin && git merge origin/main` into **your** branch (never resolve on `main`). If it gets confusing: `git merge --abort` and ask.
2. `git status` lists conflicted files. Open each (VS Code "Resolve in Merge Editor" works well). Keep **both** sides' intent; delete all `<<<<<<<`, `=======`, `>>>>>>>` markers.
3. Special files:
   - `package-lock.json`: don't hand-merge. `git checkout origin/main -- package-lock.json`, then `npm install` (re-adds your dependencies), commit.
   - `package.json`: keep both developers' scripts/dependencies, then `npm install`.
   - **Contract files** (list above): stop and talk to the other developer; do not guess.
   - `docs/*`: keep both sections.
4. `npm run check` — conflicts that "resolve" but break types/tests are common.
5. `git add <files> && git commit` (accept the default merge message), `git push`.
6. If you and your partner edited the same function, the one who merges second resolves, after a quick chat.
Prevent conflicts: stay inside your owned directories, merge `main` into your branch at least daily, keep PRs small.

## Repository settings (maintainer does once; see docs/GITHUB_SETUP.md)
Protect `main`: require PR + 1 approval + status checks (`verify`, `build-macos`, `build-windows`) + up-to-date branch; block force pushes; delete head branches after merge; allow squash merging only.

## Releases
Tag `vX.Y.Z` on `main` after both OS builds pass and have been smoke-tested (`docs/DISTRIBUTION.md`).
`tauri-prototype` is a historical tag of the abandoned Tauri prototype.
