const config = require("../config");
const { xmlEscape: e } = require("./escape");
const { buildEnvelope } = require("./envelope");

function partyLedgerXml(party, parentGroup) {
  const gstBlock = party.gstin
    ? `
  <PARTYGSTIN>${e(party.gstin)}</PARTYGSTIN>
  <GSTREGISTRATIONTYPE>Regular</GSTREGISTRATIONTYPE>`
    : "";
  return buildEnvelope(
    "All Masters",
    `<TALLYMESSAGE xmlns:UDF="TallyUDF">
 <LEDGER NAME="${e(party.name)}" ACTION="Create">
  <PARENT>${e(parentGroup)}</PARENT>
  <ISBILLWISEON>Yes</ISBILLWISEON>${gstBlock}
  <ADDRESS.LIST>
   <ADDRESS>${e(party.address)}</ADDRESS>
  </ADDRESS.LIST>
  <STATENAME>${e(party.state)}</STATENAME>
  <OPENINGBALANCE>${e(party.openingBalance ?? "0.00")}</OPENINGBALANCE>
 </LEDGER>
</TALLYMESSAGE>`,
  );
}

function customerLedgerXml(customer) {
  return partyLedgerXml(customer, config.tallyDebtorsGroup);
}

function supplierLedgerXml(supplier) {
  return partyLedgerXml(supplier, config.tallyCreditorsGroup);
}

module.exports = { customerLedgerXml, supplierLedgerXml };
