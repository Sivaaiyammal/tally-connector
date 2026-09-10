# tally-connector

Pushes data one-way from MEVA ERP into TallyPrime: Customers, Vendors, Items, Sales Invoices, Purchase Invoices, Receipts (customer payments), and Stock Adjustments (physical count corrections).

It does **not** use Tally's ODBC driver — that driver is read-only and can't create records. It posts XML to Tally's import gateway instead (the same port ODBC uses, just a different request type).

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
