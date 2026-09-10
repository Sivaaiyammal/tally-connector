const TEXT_FIELDS = [
  "mevaApiBaseUrl",
  "mevaApiKey",
  "tallyCompanyName",
  "tallyHost",
  "tallyPort",
  "tallyDebtorsGroup",
  "tallyCreditorsGroup",
  "tallyStockGroup",
  "tallySalesLedger",
  "tallyPurchaseLedger",
  "tallyCgstLedger",
  "tallySgstLedger",
  "tallyIgstLedger",
  "tallyRoundoffLedger",
  "tallyBankLedger",
  "tallyCashLedger",
];

const SYNC_KEYS = [
  "customers",
  "suppliers",
  "items",
  "salesInvoices",
  "purchaseInvoices",
  "receipts",
  "stockAdjustments",
];

const statusEl = document.getElementById("status");

function setStatus(text, cls) {
  statusEl.textContent = text;
  statusEl.className = cls || "";
}

function fillForm(settings) {
  for (const field of TEXT_FIELDS) {
    const el = document.getElementById(field);
    if (el) el.value = settings[field] ?? "";
  }
  for (const key of SYNC_KEYS) {
    const el = document.getElementById(`sync_${key}`);
    if (el) el.checked = Boolean(settings.syncEnabled?.[key]);
  }
  document.getElementById("syncIntervalMinutes").value = Math.round(
    (settings.syncIntervalSeconds || 900) / 60,
  );
}

function readForm() {
  const values = {};
  for (const field of TEXT_FIELDS) {
    const el = document.getElementById(field);
    values[field] = field === "tallyPort" ? Number(el.value) || 9000 : el.value.trim();
  }
  values.syncEnabled = {};
  for (const key of SYNC_KEYS) {
    values.syncEnabled[key] = document.getElementById(`sync_${key}`).checked;
  }
  const minutes = Number(document.getElementById("syncIntervalMinutes").value) || 15;
  values.syncIntervalSeconds = Math.max(60, minutes * 60);
  return values;
}

function describeStatus(status) {
  if (status.syncing) return { text: "Syncing…", cls: "" };
  const last = status.lastRunSummary;
  if (!last) return { text: "Not synced yet", cls: "" };
  if (last.error) return { text: `Last run failed: ${last.error}`, cls: "error" };
  return { text: `Last run: ${last.pushed} pushed, ${last.failed} failed (${last.trigger})`, cls: "ok" };
}

async function refreshStatus() {
  const status = await window.tallyConnector.getStatus();
  const { text, cls } = describeStatus(status);
  setStatus(text, cls);
}

async function main() {
  const settings = await window.tallyConnector.loadSettings();
  fillForm(settings);
  await refreshStatus();

  document.getElementById("saveBtn").addEventListener("click", async () => {
    const btn = document.getElementById("saveBtn");
    btn.disabled = true;
    try {
      await window.tallyConnector.saveSettings(readForm());
      setStatus("Saved.", "ok");
    } finally {
      btn.disabled = false;
    }
  });

  document.getElementById("syncNowBtn").addEventListener("click", async () => {
    const btn = document.getElementById("syncNowBtn");
    btn.disabled = true;
    setStatus("Syncing…");
    try {
      await window.tallyConnector.syncNow();
    } finally {
      btn.disabled = false;
      await refreshStatus();
    }
  });

  window.tallyConnector.onStatusChanged((status) => {
    const { text, cls } = describeStatus(status);
    setStatus(text, cls);
  });
}

main();
