const config = require("./config");

async function getPending(entity) {
  const res = await fetch(`${config.mevaApiBaseUrl}/api/tally/sync?entity=${entity}`, {
    headers: { "x-api-key": config.mevaApiKey },
  });
  if (!res.ok) {
    throw new Error(`MEVA API GET ${entity} failed: ${res.status} ${await res.text()}`);
  }
  const body = await res.json();
  return body.records;
}

async function ack(entity, id, status, error) {
  const res = await fetch(`${config.mevaApiBaseUrl}/api/tally/sync`, {
    method: "POST",
    headers: { "x-api-key": config.mevaApiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ entity, id, status, error }),
  });
  if (!res.ok) {
    throw new Error(`MEVA API ack ${entity}#${id} failed: ${res.status} ${await res.text()}`);
  }
}

module.exports = { getPending, ack };
