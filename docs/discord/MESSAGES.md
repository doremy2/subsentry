# Discord messages for SubSentry Development
Copy-paste-ready. Each fenced block is **one Discord message** (≤ 2000 characters, checked by script). Paste them in order into the channel named above each group, then pin where noted.
Content reflects project state as of **Oct 18, 2026 (GitHub `main` @ c74addd, CI green)**. Update #roadmap and #weekly-sprint as things change; GitHub remains the source of truth.
> Tip: use the copy button on each block on GitHub. The 4-backtick fences are only to wrap messages that themselves contain code blocks; paste the content **inside** the fence.
Voice channel **Development VC** and the roles need no messages (see `SERVER_SETUP.md`).

---

## #welcome

**Pin:** Pin message 1.

**Message 1/2** · 781 characters

````markdown
# 👋 Welcome to SubSentry Development
A private workspace for the two people building **SubSentry**: a desktop widget that tracks your subscriptions and warns you before they renew (Windows + macOS).

**This server is for**
• Quick communication, planning and status updates
• Daily stand-ups, testing notes, questions

**This server is NOT for**
• Code, technical docs, tasks and decisions of record. Those live on **GitHub**, the source of truth.
• Anything private: never post passwords, API keys, tokens, signing certificates, real bank statements or financial data. The only CSV that may be shared is the fake sample `docs/samples/sample-transactions.MOCK.csv`.

**Repository:** https://github.com/doremy2/subsentry
**Start here:** #project-overview → #roadmap → #weekly-sprint
````

**Message 2/2** · 806 characters

````markdown
## 👥 How we work: two developers, two lanes
**Developer 1 (Project Maintainer) + Claude Code**
Electron shell, React UI, CSV import UI, widget customization, native macOS/Windows testing, packaging.

**Developer 2 + Codex**
CSV parsing, merchant normalization, recurring-payment detection, confidence scoring, renewal prediction, detection tests.

**Rules of the road**
1. `main` is stable and nobody pushes to it. Branch → pull request → green CI → review → merge.
2. Stay in your lane's folders. Before touching a shared file, say so in #daily-standup.
3. Shared contracts (detection types, `electron/shared/api.ts`, DB migrations) change in their own small PR.
4. Bugs and tasks go in GitHub Issues; Discord only links to them.

Details: #github-updates, `AGENTS.md` and `docs/BRANCHING.md` in the repo.
````

---

## #project-overview

**Pin:** Pin message 1.

**Message 1/3** · 1050 characters

````markdown
# 📦 SubSentry: what it is
A **desktop subscription watchdog**. A compact, draggable widget shows your monthly spend, your next renewal and how many days away it is. Click it to open a full manager. Native notifications warn you before a charge.

## ✨ Features (what exists today on `main`)
• Compact widget: monthly total, active count, next payment, upcoming list
• Expanded manager: add / edit / delete, status filters, monthly + yearly estimates (totals kept per currency)
• Native renewal reminders: days before + earliest time of day, click opens the widget
• Windows tray icon / macOS menu bar item, always-on-top, hide to tray, launch at login (packaged builds)
• Drag anywhere, position remembered per device
• CSV import UI: drag-and-drop, transaction preview, suggestion cards with confidence scores, explicit Confirm / Reject

## 🔜 Not on `main` yet
• Real recurring-payment detection (engine in progress; dev builds use a clearly labelled MOCK detector)
• Widget themes, Detailed/Minimal layouts, resizing (built, in review; see #roadmap)
````

**Message 2/3** · 946 characters

````markdown
## 🧱 Technology stack
• **Electron 44** + **Electron Forge** (packaging; Vite build)
• **React 19** + **TypeScript** (strict) + **Tailwind CSS 4**
• **SQLite** through Node's built-in `node:sqlite`: no native modules to compile
• Tests: **Vitest** + Testing Library · Lint: **ESLint** (no `any`)
• CI: **GitHub Actions** (verify on Linux; macOS arm64 + x64 and Windows builds)
• Dev: GitHub Codespaces dev container for editing/tests (the desktop window needs a real Mac/PC)
• One codebase for both OSes. Python only if we agree it's needed: not used today.

## 🖥️ Windows + macOS
• Windows 10/11 installer and macOS DMGs for **Apple Silicon (arm64)** and **Intel (x64)** are built by CI.
• Status: all three build successfully on GitHub (unsigned). Hands-on testing on real Macs/PCs is still in progress; nothing is declared "verified on macOS/Windows" until we've tested it there.
• OS differences live in one file: `electron/main/platform.ts`.
````

**Message 3/3** · 723 characters

````markdown
## 🔒 Local-first privacy
• Your subscriptions live in a **local SQLite file** on your computer. No accounts, no servers, no cloud sync, no analytics.
• CSV imports are read and analysed **locally, in memory**. They are never stored, logged or uploaded, and the detector has no network access.
• Suggestions are **never saved automatically**: only an explicit Confirm click creates a subscription.
• The app's content-security policy blocks the UI from making network requests.

## 🚫 Out of scope (for now)
Bank APIs · cloud sync · auto-update · true wallpaper-layer embedding

📚 Technical docs are in the repo, not here: `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/DETECTION.md`
https://github.com/doremy2/subsentry
````

---

## #roadmap

**Pin:** Pin message 1 (the legend and status table). Edit it at the end of each sprint.

**Message 1/4** · 711 characters

````markdown
# 🗺️ Roadmap
**Status as of Oct 18, 2026 (GitHub `main` @ c74addd, CI green)**
✅ Implemented: merged to `main`, covered by tests, CI builds pass
🟡 In progress / in review
⬜ Planned
⚠️ Built, but **not yet verified on real macOS/Windows hardware**

| # | Milestone | Status |
|---|---|---|
| 1 | Electron desktop foundation | ✅ ⚠️ |
| 2 | Subscription management + SQLite | ✅ |
| 3 | Native renewal reminders | ✅ ⚠️ |
| 4 | CSV subscription detection | 🟡 UI ✅, engine ⬜ |
| 5 | Widget customization | 🟡 built, PR not yet opened |
| 6 | Cross-platform testing + distribution | 🟡 CI builds ✅, the rest ⬜ |
| 7 | Optional advanced features | ⬜ ideas only |

Source of truth: `docs/ROADMAP.md` and GitHub PRs/Issues.
````

**Message 2/4** · 981 characters

````markdown
## Milestones 1–3
**M1 · Electron desktop foundation ✅ ⚠️**
Frameless transparent widget, drag + position memory per device, compact/expanded modes, always-on-top, Windows tray / macOS menu bar, hide/show, Electron Forge packaging, GitHub Actions. Verified in automated tests, on Linux and by CI builds. *Pending:* hands-on testing on a real Mac and Windows PC.

**M2 · Subscription management + SQLite ✅**
Add, edit, delete; price, currency, billing cycle, renewal date, status; monthly/yearly estimates; validation; versioned SQLite migrations; ~150 automated tests including database tests.

**M3 · Native renewal reminders ✅ ⚠️**
Scheduler (on start, every 15 min, after wake from sleep, after edits); one notification per renewal (logged so it never repeats); summary when several are due; settings for days-before and earliest hour. *Pending:* confirming real notifications appear on macOS and Windows (Settings → Send test notification; macOS needs notification permission).
````

**Message 3/4** · 1038 characters

````markdown
## Milestones 4–5
**M4 · CSV subscription detection 🟡**
✅ *Merged (PR #2):* import UI (drag-and-drop/file picker, column mapping, preview), suggestion cards with confidence indicators, Confirm/Reject, shared contract + validators, labelled MOCK detector, handoff docs.
⬜ *Developer 2, branch `feature/csv-detection`:* the actual engine: merchant normalization, recurring detection, confidence scoring, renewal prediction, tests. As of today there are no engine commits yet; packaged builds say "not available yet" until it lands.

**M5 · Widget customization 🟡**
Branch `feature/widget-customization` (Developer 1): 5 themes, adjustable transparency, Detailed/Minimal compact layouts, resizable widget with min/max sizes, size + position persistence, widget returns to its compact spot after expand/collapse, animations/hover effects. 149 tests, lint, typecheck and package build pass locally. **PR not opened yet. Hands-on macOS test (`docs/TESTING_5A.md`, on that branch until merged) comes before merge.** Windows behaviour unverified.
````

**Message 4/4** · 873 characters

````markdown
## Milestones 6–7
**M6 · Cross-platform testing + distribution 🟡**
✅ CI builds Windows, macOS arm64 and macOS x64 installers on GitHub (unsigned).
⬜ Install and smoke-test the installers on real machines (Apple Silicon, Intel, Windows 10/11)
⬜ Apple code signing + notarization (needs a paid Apple Developer Program account: decision pending)
⬜ Windows code signing (certificate options in `docs/DISTRIBUTION.md`)
⬜ Release process (tag, GitHub Release, install instructions)
Not planned: auto-update.

**M7 · Optional advanced features ⬜ (ideas to discuss, nothing committed)**
• Per-subscription reminder lead time and snooze
• More bank CSV formats
• Blur / vibrancy window effects (needs per-OS work)
• Custom themes
Explicitly not planned: bank APIs, cloud sync, wallpaper embedding.

*Don't mark anything ✅ here until it is merged AND tested where it claims to work.*
````

---

## #weekly-sprint

**Pin:** Pin message 1. Replace with the next sprint at the end of the week.

**Message 1/4** · 870 characters

````markdown
# 📅 Sprint: Mon Oct 19 – Sun Oct 25, 2026
*A proposed plan: adjust it together. Times are not estimates of effort, just ordering.*

**Sprint goal:** merge widget customization (M5), land a first working detection engine behind the contract (M4), and have installers smoke-tested on a real Mac (M6).

**Assumptions / dependencies**
• Dev 1 has a MacBook; **Windows hands-on testing only happens if a PC is available**: otherwise Windows stays "CI build only" and is reported as unverified.
• Apple code signing needs a paid Apple Developer account: a *decision* is on the agenda, not a purchase.
• Each PR: CI green (`verify`, macOS, Windows) + `npm run check` + one review.
• Shared files (`src/domain/detection/*`, `electron/shared/api.ts`, migrations) only change in their own small PR, announced in #daily-standup.

**Legend:** 🅰 Dev 1 (Claude Code) · 🅱 Dev 2 (Codex)
````

**Message 2/4** · 1558 characters

````markdown
## Mon Oct 19
🅰 **Open the M5 PR, test on the Mac**
• Task: open the `feature/widget-customization` → `main` PR; run `docs/TESTING_5A.md` on the MacBook (resize, positions, themes, persistence)
• Deliverable: PR + checklist results; each failure as a GitHub Issue
• Branch: `feature/widget-customization`
• Tests: `npm run check`, CI green, manual Mac checklist
• End of day: checklist fully run; PR open
🅱 **Merchant normalization**
• Task: `git merge origin/main` into `feature/csv-detection`; read `docs/HANDOFF_DETECTION.md`; build `normalizeMerchant` ("NETFLIX.COM", "OPENAI *CHATGPT SUBSCR" → clean names)
• Deliverable: normalization + unit tests
• Branch: `feature/csv-detection`
• Tests: `npm run check`
• End of day: pushed; no contract files changed

## Tue Oct 20
🅰 **Fix + merge M5**
• Task: fix issues from Monday's test; get partner review; merge
• Deliverable: M5 merged to `main` (note: if a stacked/squash merge is involved, see `docs/BRANCHING.md`)
• Branch: `feature/widget-customization` (fixes)
• Tests: re-run failed checklist items; CI green
• End of day: M5 merged, or a clear blocker list
🅱 **Review + recurrence grouping**
• Task: review Dev 1's PR in the morning; then group charges by merchant and detect weekly/monthly/quarterly/yearly intervals with tolerance
• Deliverable: grouping + interval logic with tests (sample CSV: Netflix, Spotify, ChatGPT, gym found; groceries, coffee, fuel, payroll not)
• Branch: `feature/csv-detection`
• Tests: unit tests on `docs/samples/sample-transactions.MOCK.csv` data
• End of day: pushed
````

**Message 3/4** · 1577 characters

````markdown
## Wed Oct 21
🅰 **Packaging smoke test**
• Task: download the CI artifacts; install the **arm64 DMG** on the MacBook (right-click → Open); check launch, tray/menu bar, reminders test notification, Import tab; check Intel (x64) only if an Intel Mac is available
• Deliverable: results in `docs/DISTRIBUTION.md` or GitHub Issues
• Branch: `docs/packaging-notes` (or `fix/<issue>`)
• Tests: manual install test; `npm run check` for any fix
• End of day: arm64 DMG verified, or issues filed
🅱 **Confidence scoring**
• Task: score by regularity, amount stability, occurrence count; write plain-language `reasons`
• Deliverable: scoring + tests; open a **Draft PR** so Dev 1 can see it early
• Branch: `feature/csv-detection`
• Tests: confidence ordering tests; every result passes `runDetection`
• End of day: Draft PR open

## Thu Oct 22
🅰 **Integrate the real detector**
• Task: run `SUBSENTRY_MOCK_DETECTION=0 npm start` with the sample CSV; check cards, errors, a 20,000-row file; fix UI problems (UI paths only)
• Deliverable: end-to-end import verified on the Mac
• Branch: `feature/import-ui-polish` (new, from `main`)
• Tests: UI tests updated as needed; `npm run check`
• End of day: import works end to end with the real engine
🅱 **Renewal prediction + edge cases**
• Task: `proposed.nextRenewal` on/after today; price = latest charge; `alreadyTracked`; refunds, price changes, duplicate spellings
• Deliverable: every item in the HANDOFF "Done when" list covered by tests
• Branch: `feature/csv-detection`
• Tests: `npm run check`
• End of day: PR marked ready for review
````

**Message 4/4** · 1273 characters

````markdown
## Fri Oct 23
🅰 **Review the detection PR**
• Task: review for contract compliance and privacy (no network, no logging of transactions, no auto-save); test the flow on the Mac
• Deliverable: review comments on the PR; UI polish PR if needed
• Branch: review on `feature/csv-detection`; fixes on `feature/import-ui-polish`
• Tests: CI green on both PRs
• End of day: review finished
🅱 **Finish + merge detection**
• Task: address review comments; final tests
• Deliverable: detection PR merged (after CI green + approval)
• Branch: `feature/csv-detection`
• Tests: `npm run check`; CI (macOS + Windows)
• End of day: merged, or an explicit list of what remains

## Sat Oct 24 (light day)
🅰 • Triage the week's bugs; record the **signing decision** (Apple Developer Program: yes/no/when); update `docs/DISTRIBUTION.md`
• Branch: `docs/release-checklist` · End of day: bug list + decision recorded
🅱 • More CSV formats using **synthetic** files only (semicolon delimiter, DD/MM dates, debit/credit columns); never real statements
• Branch: `feature/csv-formats` · Tests: new fixtures pass · End of day: 2–3 formats handled

## Sun Oct 25: sprint review
Both, ~30 min: demo, what slipped and why, update **#roadmap** and `docs/ROADMAP.md` honestly, plan next sprint. No coding.
````

---

## #frontend-electron

**Pin:** Pin message 1.

**Message 1/2** · 1319 characters

````markdown
# 🖥️ Developer 1 · Frontend + Desktop (Claude Code)
**Repo areas (owned):** `src/components/**`, `src/state/**`, `src/desktop/**`, `src/styles/**`, `electron/main/{window,tray,platform,index}.ts`, `electron/preload/**`, `forge.config.ts`, `.github/workflows/`

## Responsibilities
**1 · Milestone 5A: widget customization** *(branch `feature/widget-customization`)*
Themes, transparency, Detailed/Minimal layouts, resizable widget, size/position persistence, expand/collapse position memory. Built and passing automated checks; **needs hands-on macOS testing before merge** (`docs/TESTING_5A.md`, on the widget branch until its PR merges).

**2 · Native macOS testing**
Resizing with trackpad and mouse, positioning near screen edges and with an external monitor, Retina rendering, themes over real wallpapers, menu bar item, notifications, launch at login. Windows: test if a PC is available; otherwise report it as unverified.

**3 · UI integration**
Connect the suggestion UI to the real detector output; error and empty states; keep the detection contract intact; check large files.

**4 · Packaging**
Electron Forge, CI builds for Windows + macOS arm64/x64, smoke-testing installers, signing/notarization plan (`docs/DISTRIBUTION.md`).

**5 · Reviews**
Review Developer 2's PRs for contract compliance and privacy.
````

**Message 2/2** · 440 characters

````markdown
## Working with Claude Code
• One branch per task, from fresh `main`; small commits
• Before every PR: `npm run check` (typecheck + lint + tests); window/packaging changes also `npm start` and `npm run package`
• Claude Code does **not** touch `electron/main/detection/**` or `src/domain/csv/**` (Developer 2's area)
• State in each PR which OS you actually tested
• Open items: macOS test of M5A · open the M5A PR · packaged-app smoke test
````

---

## #backend-detection

**Pin:** Pin message 1.

**Message 1/2** · 926 characters

````markdown
# 🔎 Developer 2 · Detection engine (Codex)
**Branch:** `feature/csv-detection` · **Owned areas:** `electron/main/detection/**`, `src/domain/csv/**`, new helper modules for normalization/matching.
**Start here:** `docs/HANDOFF_DETECTION.md` (it has a paste-ready prompt for Codex) and `docs/DETECTION.md`.

## Responsibilities
• **CSV parsing & bank formats** (`src/domain/csv/`): delimiters, date orders, amount formats, debit/credit columns. Keep the exported function signatures the UI uses.
• **Merchant normalization** ("NETFLIX.COM" / "NETFLIX *1234" → "Netflix")
• **Merchant matching** across spellings
• **Recurring-payment detection**: weekly, monthly, quarterly, yearly
• **Confidence scoring** (regularity, amount stability, occurrences) with plain-language `reasons`
• **Renewal prediction**: `proposed.nextRenewal` on/after today, price = latest charge, `alreadyTracked`
• **Automated tests** for all of the above
````

**Message 2/2** · 1082 characters

````markdown
## Where the code goes
**The one function to implement:** `detectRecurring(request)` in `electron/main/detection/recurringDetector.ts`. Input: transactions, existing subscriptions, today. Output: a `DetectionResult` of suggestions.
Every result is validated by `runDetection` (`src/domain/detection/run.ts`); a contract violation shows the user an error, so test through it.

## Rules
• Local and private: **no network, no disk writes, no logging of transaction data**; deterministic (use `request.today`)
• Suggestions only: the user's Confirm click saves them, never your code
• Don't change contract files (`src/domain/detection/{types,validation,run}.ts`, `electron/shared/api.ts`) or UI files; need a change? small `contract-change` PR, tell Dev 1 first
• TypeScript strict, no `any`; cross-platform; no Python/backend without agreement

## Run it
`npm ci` · `npm run check` · `SUBSENTRY_MOCK_DETECTION=0 npm start` (real engine in the desktop app; needs a Mac/PC)
Sample data: `docs/samples/sample-transactions.MOCK.csv` (fake)
Status: **no engine commits yet** (see #roadmap)
````

---

## #github-updates

**Pin:** Pin message 1.

**Message 1/2** · 1017 characters

````markdown
# 🔀 GitHub workflow
**Repository:** https://github.com/doremy2/subsentry
GitHub is the source of truth for code, docs, issues and reviews. This channel only shows notifications and answers questions.

## Day to day
```
git fetch origin
git switch -c feature/my-topic origin/main   # always from fresh main
# ...work...
npm run check                                 # typecheck + lint + tests
git add -A && git commit -m "Short imperative summary"
git push -u origin feature/my-topic
```
Then open a **pull request into `main`** on GitHub.

**Branches:** `main` (stable, nobody pushes) · `feature/import-ui` ✅ merged · `feature/csv-detection` (Dev 2) · `feature/widget-customization` (Dev 1) · `fix/…`, `docs/…` as needed

**Code review:** the other developer reviews on GitHub (not in Discord). Checklist in #code-reviews.

**Merging:** after CI is green and the review is done. Squash-merge normally; use a *merge commit* when another branch is stacked on top (see `docs/BRANCHING.md`). Delete the branch afterwards.
````

**Message 2/2** · 903 characters

````markdown
## ✅ Required CI checks
Every PR runs: **`verify`** (typecheck, lint, tests) · **`build-macos`** (arm64 + x64) · **`build-windows`**.
All three must be green before merging.
⚠️ *Honest status:* the `Protect main` ruleset currently requires a pull request, but has **0 required approvals and no required status checks**. Until the maintainer enables them (Settings → Rules), "CI must be green and one review" is a team agreement, not enforced by GitHub.

## Conflicts & shared files
Merge `main` into your branch daily. Shared contracts (`src/domain/detection/*`, `electron/shared/api.ts`, migrations) change in their own small PR, announced in #daily-standup. Conflict how-to: `docs/BRANCHING.md`.

## 🔔 Notifications
A GitHub → Discord webhook can post PRs, reviews, issues and CI results here (setup in `docs/discord/SERVER_SETUP.md`). The webhook URL is a secret: never paste it in chat or commit it.
````

---

## #daily-standup

**Pin:** Pin message 1.

**Message 1/2** · 385 characters

````markdown
# 🗓️ Daily stand-up
Post once a day (copy, paste, fill in). Short is fine.
```
Yesterday:
Today:
Branch:
Tests:
Blockers:
Shared files changing:
```
**Tests:** what you ran, e.g. `npm run check` ✅, CI ✅/❌, tested on macOS/Windows/not yet.
**Shared files changing:** `src/domain/detection/*`, `electron/shared/api.ts`, DB migrations, `package.json`… or "none". Say it *before* you edit.
````

**Message 2/2** · 223 characters

````markdown
**Example**
```
Yesterday: merchant normalization + tests
Today: group charges by merchant, detect intervals
Branch: feature/csv-detection
Tests: npm run check ✅, not yet on CI
Blockers: none
Shared files changing: none
```
````

---

## #bugs-and-testing

**Pin:** Pin message 1.

**Message 1/2** · 677 characters

````markdown
# 🐞 Bug reports & testing
**Real bugs go in GitHub Issues** (https://github.com/doremy2/subsentry/issues). Post the link here so we see it. Use this template in Discord for quick or unclear problems:
```
**Title:**
**Steps to reproduce:**
1.
2.
3.
**Expected behavior:**
**Actual behavior:**
**OS + version:** (e.g. macOS 15.1 Apple Silicon / Windows 11 23H2)
**App version / branch / commit:**
**Screenshots / logs:** (terminal output from `npm start`)
**Severity:** Critical / High / Medium / Low
```
**Severity:** **Critical**: data loss, crash on launch, security/privacy leak · **High**: a main feature is broken · **Medium**: broken with a workaround · **Low**: cosmetic.
````

**Message 2/2** · 535 characters

````markdown
## ⚠️ Before you attach anything
• Never attach a **real bank statement** or CSV: use `docs/samples/sample-transactions.MOCK.csv` or a synthetic file.
• Never attach the **database file** (`subsentry.db`): it contains your subscriptions.
• Crop screenshots that show personal info.

## 🧪 Testing a build
Checklist for the widget (resizing, positions, themes, persistence): `docs/TESTING_5A.md` (on the widget branch until its PR merges)
Include which OS you **actually** tested on, and say "not tested on Windows" when that's the case.
````

---

## #code-reviews

**Pin:** Pin message 1.

**Message 1/1** · 874 characters

````markdown
# 👀 Code reviews
Reviews happen **on GitHub** (comments on the pull request). Use this channel to ask for one ("PR ready: link, what to look at") and to discuss anything that needs a call.

**Reviewer checklist**
☐ CI green (`verify`, macOS, Windows) and the author ran `npm run check`
☐ Only the author's own area changed, or shared files were announced first
☐ Contract files untouched, or the PR is a small `contract-change` PR
☐ Logic changes have tests
☐ **Privacy:** no network, no logging of transaction data, no auto-saving of suggestions
☐ Cross-platform: no `process.platform` outside `electron/main/platform.ts`, paths via `node:path`
☐ No secrets, databases, `.env`, certificates or real CSVs in the diff
☐ PR says which OS it was tested on

**Etiquette:** aim to review within a day · small PRs · say what is blocking vs. optional · the author resolves threads.
````

---

## #announcements

**Pin:** Pin message 1 only if you want it as the 'server opened' marker.

**Message 1/1** · 485 characters

````markdown
# 📣 SubSentry Development is open
• **Repo:** https://github.com/doremy2/subsentry
• **State of the project:** milestones 1–3 are on `main`; the CSV import UI is merged (PR #2); the widget customization PR (M5) is next; the detection engine (M4) is starting. Details in #roadmap, schedule in #weekly-sprint.
• **Ground rules:** GitHub is the source of truth. Discord is for communication. No secrets or financial data here.
• Use `@Developer` only for things that need attention today.
````

---

## #general

**Pin:** No pin needed.

**Message 1/1** · 207 characters

````markdown
💬 **#general:** everyday chat about the project. Keep decisions that matter in GitHub (Issue/PR) and link them here.
Be kind, be brief, and remember: no secrets, tokens or real financial data in this server.
````

---

## #questions

**Pin:** Pin message 1.

**Message 1/1** · 441 characters

````markdown
❓ **#questions:** ask anything about the code, the workflow or the plan.
Good questions include: what you tried, the branch/commit, and the exact error text.
Look first in the repo docs: `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/BRANCHING.md`, `docs/DETECTION.md`, `docs/DISTRIBUTION.md`, `docs/CODESPACES.md`.
If the answer changes how we work, put it in the docs through a PR so it isn't lost in chat.
https://github.com/doremy2/subsentry
````
