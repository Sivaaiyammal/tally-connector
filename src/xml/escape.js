function xmlEscape(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** MEVA dates are ISO ("2026-03-20"); Tally's XML wants "20260320". */
function tallyDate(isoDate) {
  return String(isoDate).replace(/-/g, "");
}

function todayTallyDate() {
  return tallyDate(new Date().toISOString().slice(0, 10));
}

module.exports = { xmlEscape, tallyDate, todayTallyDate };
