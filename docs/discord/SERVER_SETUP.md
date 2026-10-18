# SubSentry Development: Discord server setup (manual, ~30 minutes)

Discord is for **communication, planning and updates**. GitHub stays the source of truth for code, docs, issues and reviews. Nothing here replaces a pull request or an Issue.

> Claude Code could not create the server: no Discord connector or browser automation was available in its environment, and it must never ask for your Discord password or token. So you create it by hand; every message is ready in [`MESSAGES.md`](MESSAGES.md). Permission names below match Discord's current UI but may be worded slightly differently in your version.

## 0. Before you start
- Use the Discord **desktop or web app** on the account that will own the server. Turn on **2FA** for your Discord account (User Settings > My Account).
- Have the partner's Discord username ready.

## 1. Create the server
1. Click **+** (Add a Server) > **Create My Own** > **For me and my friends**.
2. Name: **SubSentry Development**. Upload an icon if you like (e.g. `assets/icons/icon.png` from the repo).
3. Keep it **private**: do **not** enable *Community*, do not enable Server Discovery, do not post the invite publicly.

## 2. Safety settings (Server Settings)
- **Safety Setup / Moderation**: verification level *Medium* or higher; turn on **Require 2FA for moderator actions**.
- **Invites**: when you create the invite for your partner, set *Expire after: 1 day* and *Max uses: 1*. Delete unused invites. Under *Invites* you can see and revoke all of them.
- Remove the default `#general` / text / voice channels that Discord created (you will recreate them below).

## 3. Roles (Server Settings > Roles)
Never give anyone **Administrator**. As server owner you already have every permission; the roles exist so day-to-day use follows least privilege.

| Role | Who | Permissions to turn ON (everything else OFF) |
|---|---|---|
| **Project Maintainer** | you | Everything in *Developer* **plus**: Manage Channels, Manage Messages, Pin Messages, Manage Threads, Manage Webhooks, Create Invite, Mention @everyone |
| **Developer** | you + your partner | View Channels, Send Messages, Send Messages in Threads, Create Public Threads, Embed Links, Attach Files, Add Reactions, Read Message History, Connect, Speak, Use Voice Activity |
| **Beta Tester** | future testers (optional) | View Channels, Send Messages, Attach Files, Add Reactions, Read Message History: only effective in the channels listed in step 5 |

**@everyone** (default role): turn **off** Create Invite, Mention @everyone, Send Messages, Embed Links, Attach Files, Manage anything, and every voice permission. Leave only **View Channels** and **Read Message History** (this is what makes the server invite-only-readable until you assign a role).

Give yourself **Project Maintainer + Developer**; give your partner **Developer**.

## 4. Categories and channels (exact names)
Create **categories** first (right-click the server > Create Category), then channels inside them (right-click category > Create Channel).

```
INFORMATION
  #welcome
  #project-overview
  #roadmap
  #weekly-sprint
  #announcements
DEVELOPMENT
  #frontend-electron
  #backend-detection
  #github-updates
  #bugs-and-testing
  #code-reviews
TEAM
  #daily-standup
  #general
  #questions
  Development VC   (Voice channel)
```
Create **Development VC** with channel type *Voice*; everything else is *Text*.

## 5. Channel permissions (least privilege)
Set these on the **category** (Edit Category > Permissions), and add per-channel overrides only where noted.

| Where | @everyone | Developer | Maintainer | Beta Tester |
|---|---|---|---|---|
| **INFORMATION** category | View ✅ / Send ❌ | View ✅ / **Send ❌** (read-only) | View ✅ / Send ✅ | View ✅ / Send ❌ |
| **DEVELOPMENT** category | View ❌ | View ✅ / Send ✅ | View ✅ / Send ✅ | View ❌ |
| &nbsp;&nbsp;`#bugs-and-testing` (override) | View ❌ | (inherits) | (inherits) | **View ✅ / Send ✅** |
| **TEAM** category | View ❌ | View ✅ / Send ✅ / Connect ✅ | same | View ❌ |
| &nbsp;&nbsp;`#general`, `#questions` (override) | View ❌ | (inherits) | (inherits) | **View ✅ / Send ✅** |

Notes: only Maintainers post in INFORMATION (they own those messages); the partner discusses in #daily-standup / #questions. Use **Edit Channel > Permissions > Advanced permissions**; a green check = allow, red X = deny, grey slash = inherit. Test by using *View Server As Role* (Server Settings > Roles > the role > ⋮).

## 6. Post and pin the content
Open [`MESSAGES.md`](MESSAGES.md). For each channel heading, paste each message **in order** (each is under Discord's 2000-character limit). Where the file says *Pin*, right-click the message > **Pin Message**. Pinning needs the *Pin Messages* (older versions: *Manage Messages*) permission, which the Maintainer role has.

Order that reads well: #welcome → #project-overview → #roadmap → #weekly-sprint → #frontend-electron → #backend-detection → #github-updates → #daily-standup → #bugs-and-testing → #code-reviews → #announcements → #general → #questions.

Keep it honest: update **#roadmap** and **#weekly-sprint** at the end of each sprint, and only mark something ✅ when it is merged **and** tested where it claims to work.

## 7. GitHub → Discord notifications (optional, no bot)
A webhook posts GitHub events into **#github-updates**. No bot, no token, no code.

1. Discord: **#github-updates** > ⚙ **Edit Channel** > **Integrations** > **Webhooks** > **New Webhook**. Name it *GitHub*, then **Copy Webhook URL**.
2. GitHub: repo **Settings > Webhooks > Add webhook**.
   - **Payload URL:** paste the Discord URL and add **`/github`** at the end.
   - **Content type:** `application/json`. Leave *Secret* empty (Discord does not use it).
   - **Which events:** *Let me select individual events* > **Pull requests**, **Pull request reviews**, **Issues**, **Check suites** (CI results). Skip *Pushes* (noisy on feature branches).
3. Save, then open a test PR or push to check a message appears. Discord ignores event types it does not support, so if CI results do not show, CI is still visible on the PR in GitHub.

**Security:** the webhook URL is a secret (anyone with it can post to your channel). Never paste it into Discord chat, a commit, or an issue. If it leaks: delete the webhook in Discord and create a new one. Not tested by the author.

## 8. Bot? (proposal: not needed now)
A webhook covers what you asked for. Build a bot only if you later want commands or richer summaries. If you do: create it in the Discord Developer Portal with only **Send Messages** and **Embed Links** in #github-updates, no Administrator, no Message Content intent; keep its token in a password manager or a GitHub Actions secret, never in the repo or chat. A custom CI summary can also be posted from a GitHub Actions step using a `DISCORD_WEBHOOK_URL` repository secret. Neither is added to the repo.

## 9. Invite your partner
Server name > **Invite People** > Edit invite link: *Expire after 1 day*, *Max uses 1*. Send it privately. After they join, assign the **Developer** role (Server Settings > Members).

## 10. Final checklist
- [ ] Server is private (no Community, no public invite)
- [ ] Roles created; nobody has Administrator; @everyone locked down
- [ ] 3 categories, 13 text channels + Development VC with the exact names
- [ ] All messages pasted and the marked ones pinned
- [ ] Partner joined with the Developer role; can read everything, can post in DEVELOPMENT/TEAM, cannot post in INFORMATION
- [ ] (Optional) webhook set up, tested, URL stored nowhere public
- [ ] Nobody has posted secrets, tokens, real statements or financial data
