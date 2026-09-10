require("dotenv/config");

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var ${name} — copy .env.example to .env and fill it in.`);
  }
  return value;
}

function bool(name, fallback) {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return value.trim().toLowerCase() === "true";
}

function int(name, fallback) {
  const value = process.env[name];
  if (value === undefined) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

const config = {
  mevaApiBaseUrl: required("MEVA_API_BASE_URL").replace(/\/+$/, ""),
  mevaApiKey: required("MEVA_API_KEY"),

  tallyHost: process.env.TALLY_HOST || "127.0.0.1",
  tallyPort: int("TALLY_PORT", 9000),
  tallyCompanyName: required("TALLY_COMPANY_NAME"),

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
  tallyAdjustmentLedger: process.env.TALLY_ADJUSTMENT_LEDGER || "Inventory Adjustment",

  syncEnabled: {
    customers: bool("SYNC_CUSTOMERS", true),
    suppliers: bool("SYNC_SUPPLIERS", true),
    items: bool("SYNC_ITEMS", true),
    salesInvoices: bool("SYNC_SALES_INVOICES", true),
    purchaseInvoices: bool("SYNC_PURCHASE_INVOICES", true),
    receipts: bool("SYNC_RECEIPTS", true),
    stockAdjustments: bool("SYNC_STOCK_ADJUSTMENTS", true),
  },

  syncIntervalSeconds: int("SYNC_INTERVAL_SECONDS", 300),
};

module.exports = config;
