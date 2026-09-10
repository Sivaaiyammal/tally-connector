# tally-connector

Pushes data one-way from MEVA ERP into TallyPrime: Customers, Vendors, Items, Sales Invoices, Purchase Invoices, Receipts (customer payments), and Stock Adjustments (physical count corrections).

It does **not** use Tally's ODBC driver — that driver is read-only and can't create records. It posts XML to Tally's import gateway instead (the same port ODBC uses, just a different request type).

## Using this in another project

This is a standalone Node process — it talks to your ERP over HTTP and to Tally
over TCP, and imports nothing from the host app. So you can consume it three
ways, cheapest first.

**What the host app must provide either way:** an endpoint at
`GET/POST {MEVA_API_BASE_URL}/api/tally/sync` authenticated with an `x-api-key`
header, where `GET ?entity=<name>` returns pending records and `POST` acks them.
Dropping this connector into a project that doesn't expose that route will start
up fine and then fail on every fetch.

### Option A — just the installer (no source, no Node)

If you only need to *run* it, you don't need this repo in your project at all.
Build once (`npm run dist`), then copy the installer from `dist-build/` (e.g.
`Tally Connector Setup 1.0.0.exe`) to the Tally PC and run it — Next, Next,
Finish, like any Windows app. Simplest option by a distance; prefer it unless
you need to edit the connector alongside the host app.

### Option B — as a git submodule

Use this when you want the source checked out next to the host app so the two
can be changed together.

```bash
git submodule add git@github.com:Sivaaiyammal/tally-connector.git tally-connector
git commit -m "Add tally-connector submodule"

cd tally-connector
npm install
cp .env.example .env      # then fill it in — see steps below
```

Cloning a project that already has it:

```bash
git clone --recurse-submodules <project-url>

# or, if you already cloned without that flag and the folder is empty:
git submodule update --init
```

An empty `tally-connector/` directory after cloning always means the submodule
wasn't initialised — that is the single most common snag with this setup.

**Changing the connector from inside a host project.** The parent repo pins one
exact commit, not a branch, so a change takes two commits:

```bash
cd tally-connector
git add -A && git commit -m "Fix stock journal rounding"
git push                       # <- easy to forget; without it the pin below
                               #    points at a commit nobody else can fetch

cd ..
git add tally-connector        # stages the moved pin, not the file contents
git commit -m "Bump tally-connector"
```

**Pulling connector updates into a host project:**

```bash
git submodule update --remote tally-connector
git add tally-connector && git commit -m "Bump tally-connector"
```

### Option C — as an npm dependency

Use this when the host app should just install it like any other package and
never edit it.

```bash
npm install github:Sivaaiyammal/tally-connector
```

Then run it via `npx tally-connector --once`, or wire it into the host's scripts.
No submodule bookkeeping, but the source isn't editable in place.

### Requirements

End users need nothing — the installer bundles its own Electron/Node runtime.
Building from source needs Node 18+. `.env` is only used by the headless CLI
path; it's gitignored and never committed.

## 1. Enable Tally's XML gateway

In TallyPrime: **F1 (Help) → Settings → Connectivity → Client/Server configuration**
- Set **TCP/IP Port** (default `9000` — matches `TALLY_PORT` below).
- Turn **ODBC Server** to **On**.

Leave TallyPrime open with the correct company loaded while the connector runs — it only talks to whichever company is currently open, matched by `TALLY_COMPANY_NAME`.

## 2. Match your chart of accounts

The connector does **not** create ledger groups, tax ledgers, or your Sales/Purchase account — it only creates customer/vendor ledgers, stock items, and vouchers that *reference* those. Open **Gateway of Tally → Chart of Accounts** and note the exact names (case and spelling matter) of:

- Your Sundry Debtors / Sundry Creditors groups (usually the Tally defaults, unless renamed)
- Your Sales and Purchase accounts
- Your CGST / SGST / IGST ledgers
- Your Round Off, Bank, and Cash ledgers

You'll enter these exact names in the Settings window in step 4 below — there's no `.env` file to hand-edit for a normal install. If a name doesn't match, Tally will reject that voucher with a clear error, which the connector logs and records back in MEVA against that document — nothing is silently dropped.

## 3. Install

**End users — the installer (recommended):** build it once (`npm run dist` — see "Building the installer" below), then run the resulting `Tally Connector Setup <version>.exe` on the Tally PC. It installs to `Program Files`, adds a Start Menu shortcut, and launches the app, which sits in the system tray (bottom-right, near the clock) — that tray icon is the whole app; there's no window until you click it.

**Developers** (Node installed, running from source):
```
npm install
npm start
```

## 4. Configure via the Settings window

Click the tray icon (or right-click it → **Open Settings…**) to open the settings window. Fill in:
- **MEVA ERP connection** — Server URL and API key (the key must match `CONNECTOR_API_KEY` in MEVA ERP's own `.env`).
- **TallyPrime connection** — company name, host, port.
- **Chart of accounts** — the exact ledger/group names from step 2.
- **What to sync** — one checkbox per entity; uncheck any you don't want pushed.
- **Sync every (minutes)** — defaults to 15.

Click **Save**. Settings take effect immediately, no restart needed — the background loop picks up the new interval and config on its next tick. Click **Sync Now** to trigger a run immediately instead of waiting.

Right-click the tray icon for **Start with Windows** — check it once and the app relaunches automatically at login, so you don't have to remember to start it after a reboot.

## 5. Reading the output

The tray icon's tooltip and the Settings window both show the last run's result (`Last run: 4 pushed, 1 failed`) or the first error hit. For the full history, right-click the tray icon → **Open Log File**:
```
[2026-09-10T05:55:27Z] sync run start (scheduled)
[2026-09-10T05:55:28Z] sync run done (scheduled): 4 pushed, 1 failed
```
A per-record failure (e.g. a ledger-name mismatch) is also written back to MEVA against that document and retried automatically on the next run — nothing needs manual re-triggering once the underlying cause is fixed.

## 6. Order matters the first time

In Settings, enable only **Customers**, **Vendors**, and **Items** at first — leave the voucher checkboxes off. Save, click **Sync Now**, and confirm those ledgers/stock items actually appear in TallyPrime. *Then* turn the voucher checkboxes on. A sales voucher references a customer ledger and stock items that must already exist in Tally, so pushing invoices before their customer/items are there will fail every one of them.

## Building the installer

```
npm install
npm run icon     # regenerate electron/assets/icon.png if you've changed it
npm run dist      # produces dist-build/Tally Connector Setup <version>.exe (NSIS)
```
On Windows, if the build fails with `app.asar ... being used by another process`, it's almost always a background scanner (antivirus, or OneDrive if the project folder is under a synced Desktop/Documents path) grabbing the freshly-written file — wait a few seconds and rerun `npm run dist` rather than fighting it, or build outside a synced folder.

## Headless / CLI mode (development only)

The Electron app is the supported way to run this. For local testing without a GUI, the same sync engine is reachable directly:
```
cp .env.example .env   # fill in the same fields as the Settings window
npm run cli:sync       # one pass, then exits
npm run cli             # loops on SYNC_INTERVAL_SECONDS like the tray app would
```

## What isn't covered yet

- **No pull direction** — nothing comes back from Tally into MEVA. This is push-only.
- **No vendor payment vouchers** — MEVA doesn't currently track individual supplier payments as separate records (only a running total on the purchase invoice), so there's nothing per-transaction to sync on that side yet.
- **Stock transfers** — only physical-count *adjustments* are synced, not warehouse-to-warehouse transfers.

## Project layout

```
electron/
  main.js           tray icon, settings window, the 15-min background loop, IPC handlers
  preload.js        the only bridge the settings page has into Node (contextIsolation is on)
  settings.html/.js  the settings window's UI
  settingsStore.js   persists settings.json under the OS user-data folder
  log.js             appends to tally-connector.log next to settings.json
  assets/icon.png    tray/app icon (regenerate via `npm run icon`)
src/
  config.js         a live, mutable config object — settingsStore (GUI) or .env (CLI) populate it
  mevaClient.js      talks to MEVA's /api/tally/sync
  tallyClient.js     posts XML to Tally, parses its response
  sync.js            orchestrates: fetch pending -> build XML -> post -> ack
  index.js           headless CLI entry point (--once flag for a single pass)
  xml/               one file per Tally XML shape (ledger, stock item, sales/purchase
                     voucher, receipt voucher, physical-stock voucher) — each is
                     isolated, so adjusting one to match a Tally quirk you hit
                     doesn't risk the others.
```
