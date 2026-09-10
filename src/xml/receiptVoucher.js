const config = require("../config");
const { xmlEscape: e, tallyDate } = require("./escape");
const { buildEnvelope } = require("./envelope");
const { plainLedgerEntry } = require("./voucherHelpers");

function receiptVoucherXml(receipt) {
  const cashOrBank = /cash/i.test(receipt.mode || "") ? config.tallyCashLedger : config.tallyBankLedger;
  const total = Number(receipt.amount);
  const allocated = receipt.allocations.reduce((sum, a) => sum + Number(a.amount), 0);

  const billAllocs = receipt.allocations
    .map(
      (a) => `
    <BILLALLOCATIONS.LIST>
     <NAME>${e(a.invoiceNumber)}</NAME>
     <BILLTYPE>Agst Ref</BILLTYPE>
     <AMOUNT>${Number(a.amount).toFixed(2)}</AMOUNT>
    </BILLALLOCATIONS.LIST>`,
    )
    .join("");

  // Anything received beyond what was allocated to specific invoices sits on
  // account, same as it does in MEVA (receipts.allocatedAmount < receipts.amount).
  const remainder = total - allocated;
  const onAccount =
    remainder > 0.004
      ? `
    <BILLALLOCATIONS.LIST>
     <NAME>${e(receipt.receiptNumber)}</NAME>
     <BILLTYPE>New Ref</BILLTYPE>
     <AMOUNT>${remainder.toFixed(2)}</AMOUNT>
    </BILLALLOCATIONS.LIST>`
      : "";

  return buildEnvelope(
    "Vouchers",
    `<TALLYMESSAGE xmlns:UDF="TallyUDF">
 <VOUCHER VCHTYPE="Receipt" ACTION="Create">
  <DATE>${tallyDate(receipt.receiptDate)}</DATE>
  <VOUCHERTYPENAME>Receipt</VOUCHERTYPENAME>
  <VOUCHERNUMBER>${e(receipt.receiptNumber)}</VOUCHERNUMBER>
  <PARTYLEDGERNAME>${e(receipt.customerName)}</PARTYLEDGERNAME>${plainLedgerEntry(cashOrBank, (-total).toFixed(2), true)}
  <ALLLEDGERENTRIES.LIST>
   <LEDGERNAME>${e(receipt.customerName)}</LEDGERNAME>
   <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
   <AMOUNT>${total.toFixed(2)}</AMOUNT>${billAllocs}${onAccount}
  </ALLLEDGERENTRIES.LIST>
 </VOUCHER>
</TALLYMESSAGE>`,
  );
}

module.exports = { receiptVoucherXml };
