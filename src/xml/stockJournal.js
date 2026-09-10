const { xmlEscape: e, tallyDate } = require("./escape");
const { buildEnvelope } = require("./envelope");

/**
 * MEVA stock adjustments record a physical count (`countedQty`) against the
 * system balance — exactly what Tally's "Physical Stock" voucher type is for:
 * you tell it the counted qty per item and Tally derives the difference
 * against its own book balance itself, rather than you posting the delta.
 */
function stockAdjustmentVoucherXml(adjustment) {
  const lines = adjustment.lines
    .map(
      (l) => `
  <ALLINVENTORYENTRIES.LIST>
   <STOCKITEMNAME>${e(l.itemName)}</STOCKITEMNAME>
   <ACTUALQTY>${l.countedQty} ${e(l.uom)}</ACTUALQTY>
   <BILLEDQTY>${l.countedQty} ${e(l.uom)}</BILLEDQTY>
  </ALLINVENTORYENTRIES.LIST>`,
    )
    .join("");

  return buildEnvelope(
    "Vouchers",
    `<TALLYMESSAGE xmlns:UDF="TallyUDF">
 <VOUCHER VCHTYPE="Physical Stock" ACTION="Create">
  <DATE>${tallyDate(adjustment.adjustmentDate)}</DATE>
  <VOUCHERTYPENAME>Physical Stock</VOUCHERTYPENAME>
  <VOUCHERNUMBER>${e(adjustment.adjustmentNumber)}</VOUCHERNUMBER>
  <NARRATION>${e(adjustment.reason || "")} - ${e(adjustment.warehouseName)}</NARRATION>${lines}
 </VOUCHER>
</TALLYMESSAGE>`,
  );
}

module.exports = { stockAdjustmentVoucherXml };
