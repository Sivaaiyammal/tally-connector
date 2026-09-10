const { xmlEscape: e } = require("./escape");

/** A tax/round-off ledger line with no inventory allocation. */
function plainLedgerEntry(ledgerName, amount, isDeemedPositive) {
  return `
  <ALLLEDGERENTRIES.LIST>
   <LEDGERNAME>${e(ledgerName)}</LEDGERNAME>
   <ISDEEMEDPOSITIVE>${isDeemedPositive ? "Yes" : "No"}</ISDEEMEDPOSITIVE>
   <AMOUNT>${amount}</AMOUNT>
  </ALLLEDGERENTRIES.LIST>`;
}

/** Only emit a tax/charge line when it's actually nonzero. */
function taxLines(config, { cgstAmount, sgstAmount, igstAmount, roundOff }, sign) {
  const parts = [];
  const add = (ledger, amount) => {
    const n = Number(amount);
    if (n !== 0) parts.push(plainLedgerEntry(ledger, (sign * n).toFixed(2), sign < 0));
  };
  add(config.tallyCgstLedger, cgstAmount);
  add(config.tallySgstLedger, sgstAmount);
  add(config.tallyIgstLedger, igstAmount);
  add(config.tallyRoundoffLedger, roundOff);
  return parts.join("");
}

/** One inventory-carrying ledger line (the sales/purchase account) for a document line. */
function inventoryLedgerEntry(accountLedger, line, sign) {
  const qty = `${line.qty} ${e(line.uom || "Nos")}`;
  const rate = line.rate ? `${line.rate}/${e(line.uom || "Nos")}` : "";
  const amount = (sign * Number(line.taxableValue)).toFixed(2);
  return `
  <ALLLEDGERENTRIES.LIST>
   <LEDGERNAME>${e(accountLedger)}</LEDGERNAME>
   <ISDEEMEDPOSITIVE>${sign < 0 ? "Yes" : "No"}</ISDEEMEDPOSITIVE>
   <AMOUNT>${amount}</AMOUNT>
   <INVENTORYALLOCATIONS.LIST>
    <STOCKITEMNAME>${e(line.itemName)}</STOCKITEMNAME>
    <ACTUALQTY>${qty}</ACTUALQTY>
    <BILLEDQTY>${qty}</BILLEDQTY>
    ${rate ? `<RATE>${rate}</RATE>` : ""}
    <AMOUNT>${amount}</AMOUNT>
   </INVENTORYALLOCATIONS.LIST>
  </ALLLEDGERENTRIES.LIST>`;
}

module.exports = { plainLedgerEntry, taxLines, inventoryLedgerEntry };
