const { XMLParser } = require("fast-xml-parser");
const config = require("./config");

const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: true });

/**
 * POSTs one Tally import envelope to the local ODBC/XML gateway and returns a
 * normalized result. Tally's own reply shape has drifted a little across
 * versions, so this reads defensively rather than assuming one exact path.
 */
async function postXml(xml) {
  const url = `http://${config.tallyHost}:${config.tallyPort}`;
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/xml" },
      body: xml,
    });
  } catch (err) {
    throw new Error(
      `Could not reach TallyPrime at ${url} — is it running with ODBC/XML Server enabled? (${err.message})`,
    );
  }

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Tally gateway HTTP ${res.status}: ${text.slice(0, 500)}`);
  }

  let parsed;
  try {
    parsed = parser.parse(text);
  } catch {
    throw new Error(`Could not parse Tally's response as XML: ${text.slice(0, 500)}`);
  }

  const response = parsed?.RESPONSE ?? parsed?.ENVELOPE?.BODY?.DATA?.IMPORTRESULT ?? {};
  const created = Number(response.CREATED ?? 0);
  const altered = Number(response.ALTERED ?? 0);
  const errors = Number(response.ERRORS ?? 0);
  const exceptions = Number(response.EXCEPTIONS ?? 0);
  const lineError = response.LINEERROR ?? "";

  return {
    ok: errors === 0 && exceptions === 0,
    created,
    altered,
    errors,
    exceptions,
    lineError,
    raw: text,
  };
}

module.exports = { postXml };
