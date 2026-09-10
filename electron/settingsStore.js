const fs = require("fs");
const path = require("path");
const { app } = require("electron");

const DEFAULTS = {
  mevaApiBaseUrl: "",
  mevaApiKey: "",
  tallyHost: "127.0.0.1",
  tallyPort: 9000,
  tallyCompanyName: "",
  tallyDebtorsGroup: "Sundry Debtors",
  tallyCreditorsGroup: "Sundry Creditors",
  tallyStockGroup: "Primary",
  tallySalesLedger: "Sales Account",
  tallyPurchaseLedger: "Purchase Account",
  tallyCgstLedger: "CGST",
  tallySgstLedger: "SGST",
  tallyIgstLedger: "IGST",
  tallyRoundoffLedger: "Round Off",
  tallyBankLedger: "Bank Account",
  tallyCashLedger: "Cash",
  syncEnabled: {
    customers: true,
    suppliers: true,
    items: true,
    salesInvoices: true,
    purchaseInvoices: true,
    receipts: true,
    stockAdjustments: true,
  },
  syncIntervalSeconds: 900,
};

function filePath() {
  return path.join(app.getPath("userData"), "settings.json");
}

function load() {
  try {
    const saved = JSON.parse(fs.readFileSync(filePath(), "utf8"));
    return {
      ...DEFAULTS,
      ...saved,
      syncEnabled: { ...DEFAULTS.syncEnabled, ...(saved.syncEnabled || {}) },
    };
  } catch {
    return { ...DEFAULTS, syncEnabled: { ...DEFAULTS.syncEnabled } };
  }
}

function save(values) {
  const current = load();
  const merged = {
    ...current,
    ...values,
    syncEnabled: { ...current.syncEnabled, ...(values.syncEnabled || {}) },
  };
  fs.mkdirSync(path.dirname(filePath()), { recursive: true });
  fs.writeFileSync(filePath(), JSON.stringify(merged, null, 2));
  return merged;
}

module.exports = { load, save, DEFAULTS, filePath };
