const config = require("../config");
const { xmlEscape: e, tallyDate } = require("./escape");
const { buildEnvelope } = require("./envelope");
const { plainLedgerEntry, taxLines, inventoryLedgerEntry } = require("./voucherHelpers");

/** Mirror of salesVoucher.js with the party/account polarity flipped. */
function purchaseVoucherXml(invoice) {
  const partyEntry = plainLedgerEntry(invoice.supplierName, Number(invoice.totalAmount).toFixed(2), false);
  const lineEntries = invoice.lines
    .map((l) => inventoryLedgerEntry(config.tallyPurchaseLedger, l, -1))
    .join("");
  const taxEntries = taxLines(config, invoice, -1);

  return buildEnvelope(
    "Vouchers",
    `<TALLYMESSAGE xmlns:UDF="TallyUDF">
 <VOUCHER VCHTYPE="Purchase" ACTION="Create">
  <DATE>${tallyDate(invoice.invoiceDate)}</DATE>
  <VOUCHERTYPENAME>Purchase</VOUCHERTYPENAME>
  <VOUCHERNUMBER>${e(invoice.invoiceNumber)}</VOUCHERNUMBER>
  <PARTYLEDGERNAME>${e(invoice.supplierName)}</PARTYLEDGERNAME>${partyEntry}${lineEntries}${taxEntries}
 </VOUCHER>
</TALLYMESSAGE>`,
  );
}

module.exports = { purchaseVoucherXml };
