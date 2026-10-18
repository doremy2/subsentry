# GitHub setup (one-time)

## 1. Get the project onto GitHub (from your MacBook)
You received `subsentry.bundle`, a single file containing the **full git history** (all commits, branches and the `tauri-prototype` tag). Do this once:

```bash
cd ~/Downloads                       # wherever the bundle is
git clone subsentry.bundle subsentry
cd subsentry
git remote set-url origin https://github.com/doremy2/subsentry.git
git remote -v                        # must show github.com/doremy2/subsentry
git branch -a                        # local: main; remotes/origin/{main,feature/import-ui,feature/csv-detection}
git switch feature/import-ui         # creates a local branch from the bundle's copy
git switch feature/csv-detection
git switch main
git push -u origin main feature/import-ui feature/csv-detection
git push origin --tags
```
If GitHub asks for a password, use `gh auth login` (brew install gh) or a Personal Access Token / SSH key; your account password does not work for git.

No bundle? Unzip `subsentry-feature-import-ui.zip`, then `git init -b main && git add -A && git commit -m "Initial commit" && git remote add origin https://github.com/doremy2/subsentry.git && git push -u origin main` (history will not be preserved).

## 2. Verify it is really there
- Open https://github.com/doremy2/subsentry: you should see `package.json`, `src/`, `electron/`, `docs/`, `.devcontainer/` and a branch dropdown with 3 branches.
- Commit count on `main` should be 5 (Tauri prototype -> Electron -> reminders -> setup).
- **Actions** tab: the CI workflow should start. If it asks, click "I understand my workflows, enable them".
- Search the repo for `.db`, `.env`, `.csv`, `node_modules`: nothing but `docs/samples/sample-transactions.MOCK.csv` should exist.
- Tell Claude "pushed": it can re-check the public repo (`git ls-remote`) and confirm.

## 3. Repository settings (Settings tab)
1. **Collaborators**: invite your partner (Settings > Collaborators > Add people, Write role). The repo is currently **public**; consider switching to private (Settings > General > Danger Zone) since this will hold a finance project.
2. **Branch protection for `main`** (Settings > Branches > Add ruleset/rule):
   - Require a pull request before merging, **1 approval**
   - Require status checks: `verify`, `build-macos`, `build-windows` (they appear after the first workflow run)
   - Require branches to be up to date; block force pushes; restrict deletions
3. **General**: allow squash merging only; "Automatically delete head branches" on.
4. **Secrets** (only for signing later): see `docs/DISTRIBUTION.md`.

## 4. Smoke test for *each* developer (proves the workflow works)
```bash
git clone https://github.com/doremy2/subsentry.git && cd subsentry && npm ci && npm run check
git switch -c test/<yourname>-smoke origin/main
echo "smoke test" >> docs/SMOKE.txt && git add docs/SMOKE.txt
git commit -m "Smoke test" && git push -u origin test/<yourname>-smoke
gh pr create --base main --fill        # then confirm: CI runs, you cannot push to main directly, other dev can review
```
Close the PR without merging and delete the branch afterwards. A push to `main` should be rejected (once protection is on): that is the expected result.

## What has and has not been verified
- Verified in the author's environment: the bundle clones, installs, type-checks, lints, tests and packages (see the QA notes in the PR).
- **Not verified:** that GitHub accepted a push, that CI is green on GitHub-hosted macOS/Windows runners, that your partner can access the repo, and that a Codespace opens. These need your accounts.
