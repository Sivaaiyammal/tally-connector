try {
  require("dotenv/config");
} catch {
  // dotenv is optional now — the Electron app persists settings as JSON via
  // electron/settingsStore.js instead. .env only matters for the headless
  // CLI path (`node src/index.js`), kept for local dev/testing.
}

function envBool(name, fallback) {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return value.trim().toLowerCase() === "true";
}

/**
 * A single mutable config object, not a frozen snapshot — every other module
 * in this app does `config.someField` inline at call time (not destructured
 * at require time), so mutating these properties in place propagates live,
 * which is what lets the settings GUI change behavior without a restart.
 */
const config = {
  mevaApiBaseUrl: (process.env.MEVA_API_BASE_URL || "").replace(/\/+$/, ""),
  mevaApiKey: process.env.MEVA_API_KEY || "",

  tallyHost: process.env.TALLY_HOST || "127.0.0.1",
  tallyPort: Number(process.env.TALLY_PORT) || 9000,
  tallyCompanyName: process.env.TALLY_COMPANY_NAME || "",

  tallyDebtorsGroup: process.env.TALLY_DEBTORS_GROUP || "Sundry Debtors",
  tallyCreditorsGroup: process.env.TALLY_CREDITORS_GROUP || "Sundry Creditors",
  tallyStockGroup: process.env.TALLY_STOCK_GROUP || "Primary",
  tallySalesLedger: process.env.TALLY_SALES_LEDGER || "Sales Account",
  tallyPurchaseLedger: process.env.TALLY_PURCHASE_LEDGER || "Purchase Account",
  tallyCgstLedger: process.env.TALLY_CGST_LEDGER || "CGST",
  tallySgstLedger: process.env.TALLY_SGST_LEDGER || "SGST",
  tallyIgstLedger: process.env.TALLY_IGST_LEDGER || "IGST",
  tallyRoundoffLedger: process.env.TALLY_ROUNDOFF_LEDGER || "Round Off",
  tallyBankLedger: process.env.TALLY_BANK_LEDGER || "Bank Account",
  tallyCashLedger: process.env.TALLY_CASH_LEDGER || "Cash",

  syncEnabled: {
    customers: envBool("SYNC_CUSTOMERS", true),
    suppliers: envBool("SYNC_SUPPLIERS", true),
    items: envBool("SYNC_ITEMS", true),
    salesInvoices: envBool("SYNC_SALES_INVOICES", true),
    purchaseInvoices: envBool("SYNC_PURCHASE_INVOICES", true),
    receipts: envBool("SYNC_RECEIPTS", true),
    stockAdjustments: envBool("SYNC_STOCK_ADJUSTMENTS", true),
  },

  // 15 minutes — matches what the connector is meant to run at once installed
  // as a background app, not the tighter interval that made sense for manual
  // `--once` testing runs during development.
  syncIntervalSeconds: Number(process.env.SYNC_INTERVAL_SECONDS) || 900,
};

/** Merges saved/edited settings in place — see the class comment above for why "in place" matters. */
function update(values) {
  if (!values) return;
  const { syncEnabled, ...rest } = values;
  Object.assign(config, rest);
  if (syncEnabled) Object.assign(config.syncEnabled, syncEnabled);
  config.mevaApiBaseUrl = (config.mevaApiBaseUrl || "").replace(/\/+$/, "");
}

function isConfigured() {
  return Boolean(config.mevaApiBaseUrl && config.mevaApiKey && config.tallyCompanyName);
}

module.exports = config;
module.exports.update = update;
module.exports.isConfigured = isConfigured;
