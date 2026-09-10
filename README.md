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

### Option A — just the executable (no source, no Node)

If you only need to *run* it, you don't need this repo in your project at all.
Build once (`npm run build`), then copy `dist/tally-connector.exe` and a
filled-in `.env` into a folder on the Tally PC. Simplest option by a distance;
prefer it unless you need to edit the connector alongside the host app.

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

Node 20 or newer (the `.exe` build targets `node20-win-x64`). `.env` is
gitignored and never committed — every deployment needs its own copy made from
`.env.example`.

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

Put those exact names into `.env` (see `.env.example` — every value is commented). If a name doesn't match, Tally will reject that voucher with a clear error, which the connector logs and records back in MEVA against that document (see "Retrying a failed record" below) — nothing is silently dropped.

## 3. Configure

```
cp .env.example .env
```

Fill in:
- `MEVA_API_BASE_URL` / `MEVA_API_KEY` — the key must match `CONNECTOR_API_KEY` in MEVA ERP's own `.env`.
- `TALLY_HOST` / `TALLY_PORT` / `TALLY_COMPANY_NAME`.
- The chart-of-accounts names from step 2.
- `SYNC_*` flags — set any to `false` to skip that entity entirely.

## 4. Run

**During development** (Node installed):
```
npm install
npm start        # runs continuously, polling every SYNC_INTERVAL_SECONDS
npm run sync      # runs once and exits — good for testing
```

**As the packaged `.exe`** (no Node required on the target PC):
```
npm run build     # produces dist/tally-connector.exe
```
Copy `dist/tally-connector.exe` and your filled-in `.env` to the Tally PC, into the same folder, then double-click it (or run `tally-connector.exe --once` from a terminal to do a single pass). It reads `.env` from its own folder.

## 5. Reading the output

Each record logs one line:
```
[salesInvoices] pushed: Sales Invoice INV-001
[items] FAILED: Item "Cotton Yarn 30s" — Tally gateway HTTP 400: ...
```
A `pushed` line means Tally reported the record as created and MEVA has been told not to send it again. A `FAILED` line means MEVA has recorded the error message on that record (visible nowhere in the UI yet, but stored) and will offer it again next run — fix the underlying cause (usually a ledger-name mismatch or a required master not yet synced) and it retries automatically.

## 6. Order matters the first time

Run with only masters enabled first (`SYNC_CUSTOMERS`, `SYNC_SUPPLIERS`, `SYNC_ITEMS` — leave the rest `false`), confirm those ledgers/stock items actually appear in TallyPrime, **then** enable the voucher types. A sales voucher references a customer ledger and stock items that must already exist in Tally, so pushing invoices before their customer/items are in Tally will fail every one of them.

## What isn't covered yet

- **No pull direction** — nothing comes back from Tally into MEVA. This is push-only.
- **No vendor payment vouchers** — MEVA doesn't currently track individual supplier payments as separate records (only a running total on the purchase invoice), so there's nothing per-transaction to sync on that side yet.
- **Stock transfers** — only physical-count *adjustments* are synced, not warehouse-to-warehouse transfers.

## Project layout

```
src/
  config.js        loads and validates .env
  mevaClient.js     talks to MEVA's /api/tally/sync
  tallyClient.js    posts XML to Tally, parses its response
  sync.js           orchestrates: fetch pending -> build XML -> post -> ack
  index.js          entry point (--once flag for a single pass)
  xml/              one file per Tally XML shape (ledger, stock item, sales/purchase
                     voucher, receipt voucher, physical-stock voucher) — each is
                     isolated, so adjusting one to match a Tally quirk you hit
                     doesn't risk the others.
```
