# Building and distributing SubSentry

## What CI produces
`.github/workflows/ci.yml` runs checks on Ubuntu, then builds on **separate native runners**:
- `macos-latest`, **two separate builds**: `arm64` (Apple Silicon) and `x64` (Intel), each a `.app` inside a `.dmg` (+ zip). A job named `build-macos` passes only if both succeed.
- `windows-latest` -> Squirrel installer `SubSentry-Setup.exe` (+ nupkg, zip)

Artifacts appear on each workflow run. Builds are **unsigned** until you add the secrets below.

Locally: `npm run make` builds for the OS and CPU you are on (DMG only on macOS, installer only on Windows). On a Mac you can pick the other architecture with `npm run make -- --arch=x64` (or `--arch=arm64`).

## Which Mac installer should I download?
| Your Mac | Download |
|---|---|
| Apple Silicon: M1, M2, M3, M4 (any "Chip: Apple M..." in  > About This Mac) | `SubSentry-<version>-mac-arm64.dmg` |
| Intel (shows "Processor: Intel ..." in  > About This Mac) | `SubSentry-<version>-mac-x64.dmg` |
| Windows 10/11 | `SubSentry-Setup.exe` |

The Intel build also runs on Apple Silicon through Rosetta 2, but slower; use the arm64 one on M-series Macs. Open the `.dmg` and drag SubSentry to Applications. Unsigned builds need right-click > Open the first time (see below).

Why not one universal installer? The universal merge step (`--arch=universal`) failed in CI with "the number of mach-o files is not the same between the arm64 and x64 builds". Our app has no native modules (its packaged `app.asar` contains only bundled JavaScript), so the separate builds are simple and reliable. Both are cross-built on one Apple Silicon runner. A universal build can be revisited later.

## Why signing matters
| Platform | Unsigned experience for other people |
|---|---|
| macOS | Gatekeeper blocks the app ("cannot be opened / is damaged"). Users must right-click > Open or run `xattr -cr`. Apple Silicon additionally requires a valid signature to run. Not acceptable for distribution. |
| Windows | SmartScreen shows "Windows protected your PC / unknown publisher"; users must click More info > Run anyway. Works, but looks untrustworthy. |

## macOS: sign + notarize (required to distribute)
1. Join the **Apple Developer Program** (paid, about $99/year).
2. Create a **Developer ID Application** certificate (Xcode > Settings > Accounts > Manage Certificates, or developer.apple.com). Export it with its private key as a `.p12`.
3. Create an **app-specific password** at appleid.apple.com and note your **Team ID**.
4. Add GitHub repository secrets:
   - `APPLE_CERTIFICATE_P12_BASE64` (`base64 -i cert.p12 | pbcopy`), `APPLE_CERTIFICATE_PASSWORD`
   - `APPLE_SIGNING_IDENTITY` (e.g. `Developer ID Application: Your Name (TEAMID)`)
   - `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`
5. `forge.config.ts` enables `osxSign` when `APPLE_SIGNING_IDENTITY` is set and `osxNotarize` when the Apple ID variables are also set. Notarization uploads the app to Apple (a few minutes) and staples the ticket.
6. Verify: `codesign --verify --deep --strict --verbose=2 SubSentry.app`, `spctl -a -vvv -t install SubSentry.app`, `xcrun stapler validate SubSentry.app`.
Hardened runtime is on by default with Forge's signing; Electron's default entitlements are sufficient (no custom entitlements needed for this app).

## Windows: Authenticode signing
Options, cheapest first:
- **Azure Trusted Signing** (about $10/month; individuals/orgs with verifiable identity; immediate SmartScreen reputation).
- **OV code-signing certificate** from a CA: SmartScreen reputation builds over time.
- **EV certificate**: immediate reputation, but hardware token (harder in CI).
For a PFX certificate: add secrets `WINDOWS_CERT_PFX_BASE64` and `WINDOWS_CERT_PASSWORD`; the workflow decodes it and `forge.config.ts` passes it to Squirrel. (Azure Trusted Signing/EV tokens need a signtool-based step instead; add when chosen.)

## Release process (suggested)
1. Merge to `main`, bump `version` in `package.json`, tag `vX.Y.Z`.
2. CI builds both OSes; download artifacts, smoke-test on a clean Mac and Windows machine.
3. Publish a GitHub Release with the `.dmg` and `Setup.exe`.
Auto-update is not implemented (needs signed builds and a release feed; later).

## Testing checklist per OS (manual)
Drag + position restored after restart; compact/expanded; always-on-top; hide to tray/menu bar and restore from icon; launch at login (packaged build only); test notification; add/edit/delete persists after restart; multi-monitor and DPI changes.
