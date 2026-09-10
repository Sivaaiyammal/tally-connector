const config = require("../config");
const { xmlEscape: e, tallyDate } = require("./escape");
const { buildEnvelope } = require("./envelope");
const { plainLedgerEntry, taxLines, inventoryLedgerEntry } = require("./voucherHelpers");

/**
 * Tally XML sign convention: a ledger with ISDEEMEDPOSITIVE=Yes carries a
 * NEGATIVE amount, one with =No carries a POSITIVE amount — regardless of
 * whether that's conceptually a debit or credit. The party (debtor) is the
 * "Yes" side here; sales/tax accounts are the "No" side.
 */
function salesVoucherXml(invoice) {
  const partyEntry = plainLedgerEntry(
    invoice.customerName,
    (-Number(invoice.totalAmount)).toFixed(2),
    true,
  );
  const lineEntries = invoice.lines
    .map((l) => inventoryLedgerEntry(config.tallySalesLedger, l, 1))
    .join("");
  const taxEntries = taxLines(config, invoice, 1);

  return buildEnvelope(
    "Vouchers",
    `<TALLYMESSAGE xmlns:UDF="TallyUDF">
 <VOUCHER VCHTYPE="Sales" ACTION="Create">
  <DATE>${tallyDate(invoice.invoiceDate)}</DATE>
  <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
  <VOUCHERNUMBER>${e(invoice.invoiceNumber)}</VOUCHERNUMBER>
  <PARTYLEDGERNAME>${e(invoice.customerName)}</PARTYLEDGERNAME>${partyEntry}${lineEntries}${taxEntries}
 </VOUCHER>
</TALLYMESSAGE>`,
  );
}

module.exports = { salesVoucherXml };
