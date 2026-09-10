const config = require("../config");
const { xmlEscape: e } = require("./escape");

/**
 * Wraps one or more <TALLYMESSAGE> blocks in the standard Tally XML import
 * envelope. `reportName` is "All Masters" for ledgers/stock items, "Vouchers"
 * for any voucher type — that's what tells Tally's gateway which importer to
 * route the request to.
 */
function buildEnvelope(reportName, messagesXml) {
  return `<ENVELOPE>
 <HEADER>
  <TALLYREQUEST>Import Data</TALLYREQUEST>
 </HEADER>
 <BODY>
  <IMPORTDATA>
   <REQUESTDESC>
    <REPORTNAME>${reportName}</REPORTNAME>
    <STATICVARIABLES>
     <SVCURRENTCOMPANY>${e(config.tallyCompanyName)}</SVCURRENTCOMPANY>
    </STATICVARIABLES>
   </REQUESTDESC>
   <REQUESTDATA>
${messagesXml}
   </REQUESTDATA>
  </IMPORTDATA>
 </BODY>
</ENVELOPE>`;
}

module.exports = { buildEnvelope };
