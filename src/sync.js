const { customerLedgerXml, supplierLedgerXml } = require("./xml/ledger");
const { stockItemXml } = require("./xml/stockItem");
const { salesVoucherXml } = require("./xml/salesVoucher");
const { purchaseVoucherXml } = require("./xml/purchaseVoucher");
const { receiptVoucherXml } = require("./xml/receiptVoucher");
const { stockAdjustmentVoucherXml } = require("./xml/stockJournal");
const mevaClient = require("./mevaClient");
const tallyClient = require("./tallyClient");
const config = require("./config");

const ENTITY_BUILDERS = {
  customers: { build: customerLedgerXml, label: (r) => `Customer "${r.name}"` },
  suppliers: { build: supplierLedgerXml, label: (r) => `Supplier "${r.name}"` },
  items: { build: stockItemXml, label: (r) => `Item "${r.name}"` },
  salesInvoices: { build: salesVoucherXml, label: (r) => `Sales Invoice ${r.invoiceNumber}` },
  purchaseInvoices: { build: purchaseVoucherXml, label: (r) => `Purchase Invoice ${r.invoiceNumber}` },
  receipts: { build: receiptVoucherXml, label: (r) => `Receipt ${r.receiptNumber}` },
  stockAdjustments: {
    build: stockAdjustmentVoucherXml,
    label: (r) => `Stock Adjustment ${r.adjustmentNumber}`,
  },
};

async function syncEntity(entity) {
  const { build, label } = ENTITY_BUILDERS[entity];
  const records = await mevaClient.getPending(entity);
  if (records.length === 0) {
    console.log(`[${entity}] nothing pending`);
    return { entity, pushed: 0, failed: 0 };
  }

  let pushed = 0;
  let failed = 0;
  for (const record of records) {
    const name = label(record);
    try {
      const xml = build(record);
      const result = await tallyClient.postXml(xml);
      if (result.ok && result.created + result.altered > 0) {
        await mevaClient.ack(entity, record.id, "ok");
        console.log(`[${entity}] pushed: ${name}`);
        pushed++;
      } else {
        const message =
          result.lineError || `Tally reported ${result.errors} error(s), 0 created/altered`;
        await mevaClient.ack(entity, record.id, "error", message);
        console.error(`[${entity}] FAILED: ${name} — ${message}`);
        failed++;
      }
    } catch (err) {
      await mevaClient.ack(entity, record.id, "error", err.message).catch(() => {});
      console.error(`[${entity}] FAILED: ${name} — ${err.message}`);
      failed++;
    }
  }
  return { entity, pushed, failed };
}

async function runOnce() {
  const entities = Object.keys(ENTITY_BUILDERS).filter((entity) => config.syncEnabled[entity]);
  const summary = [];
  for (const entity of entities) {
    summary.push(await syncEntity(entity));
  }
  return summary;
}

module.exports = { runOnce, syncEntity, ENTITY_BUILDERS };
