# Working in GitHub Codespaces

The repo ships a dev container (`.devcontainer/devcontainer.json`: Node 22 on Debian, GitHub CLI) so either developer can edit, test and review code from a browser or VS Code without installing anything.

> Status: the configuration is committed but has **not been launched in a real Codespace by the author**; if something fails on first open, check the creation log (Command Palette > "Codespaces: View Creation Log") and fix `devcontainer.json`.

## Open it
1. On GitHub open `github.com/doremy2/subsentry` > green **Code** button > **Codespaces** tab > **Create codespace on main** (or choose your feature branch from the branch picker first).
2. Wait for setup. It runs `npm ci` automatically (`postCreateCommand`) and installs these VS Code extensions: ESLint, Tailwind CSS IntelliSense, Vitest Explorer, GitHub Pull Requests.
3. Open a terminal and run `npm run check`.

## Commands
| Command | Does | Works in Codespaces? |
|---|---|---|
| `npm run typecheck` | TypeScript, strict | yes |
| `npm run lint` | ESLint (no `any`, hooks rules) | yes |
| `npm test` | Unit + UI tests (Vitest, jsdom, in-memory SQLite) | yes |
| `npm run check` | typecheck + lint + test (what CI runs) | yes |
| `npm run dev:web` | UI only, in a browser tab, with in-memory demo data. Codespaces forwards port 1420: click the notification, or the Ports tab > Open in Browser | yes |
| `npm run build` | typecheck + package the app for Linux | yes (verifies it builds; the Linux package is not the product) |
| `npm run dev` / `npm start` | Real Electron desktop window | **no**, there is no display |

## Limits (read this)
- **Native behaviour cannot be verified in a Codespace**: window dragging, transparency, tray/menu bar, notifications, launch at login. Test those locally on macOS and Windows (`npm start`). The CI jobs only prove that the installers *build*.
- `npm run dev:web` uses a browser stand-in with demo data, not SQLite or IPC.
- A headless Electron smoke test is possible with `xvfb-run` after `sudo apt-get install -y xvfb` plus Electron's Linux libraries; a graphical desktop via the `desktop-lite` dev container feature is an option but untested here.
- **Privacy:** Codespaces is a cloud machine. Do **not** upload real bank statements. Use `docs/samples/sample-transactions.MOCK.csv`.
- Free Codespaces hours are limited per account; stop idle codespaces.

## Git in a Codespace
Same flow as locally; see `docs/BRANCHING.md`.
```bash
git fetch origin
git switch -c feature/my-topic origin/main     # or: git switch feature/csv-detection
npm run check
git add -A && git commit -m "Short imperative summary"
git push -u origin feature/my-topic
gh pr create --base main --fill                # or use the GitHub Pull Requests panel
```
Codespaces is already authenticated to GitHub for the repo, so pushes to *your* branches just work. Pushes to `main` are blocked by branch protection (once enabled), by design.
