const config = require("../config");
const { xmlEscape: e, todayTallyDate } = require("./escape");
const { buildEnvelope } = require("./envelope");

function stockItemXml(item) {
  const rate = Number(item.gstRate) || 0;
  const gstBlock = item.hsnCode
    ? `
  <GSTAPPLICABLE>Applicable</GSTAPPLICABLE>
  <GSTDETAILS.LIST>
   <APPLICABLEFROM>${todayTallyDate()}</APPLICABLEFROM>
   <HSNCODE>${e(item.hsnCode)}</HSNCODE>
   <TAXABILITY>Taxable</TAXABILITY>
   <IGSTRATE>${rate.toFixed(2)}</IGSTRATE>
   <CGSTRATE>${(rate / 2).toFixed(2)}</CGSTRATE>
   <SGSTRATE>${(rate / 2).toFixed(2)}</SGSTRATE>
  </GSTDETAILS.LIST>`
    : "";
  return buildEnvelope(
    "All Masters",
    `<TALLYMESSAGE xmlns:UDF="TallyUDF">
 <STOCKITEM NAME="${e(item.name)}" ACTION="Create">
  <PARENT>${e(config.tallyStockGroup)}</PARENT>
  <BASEUNITS>${e(item.uom || "Nos")}</BASEUNITS>${gstBlock}
 </STOCKITEM>
</TALLYMESSAGE>`,
  );
}

module.exports = { stockItemXml };
