const fs = require("fs");
const path = require("path");
const { app } = require("electron");

function logFile() {
  return path.join(app.getPath("userData"), "tally-connector.log");
}

/** No console window exists once installed — this is how anyone checks what happened. */
function log(line) {
  const entry = `[${new Date().toISOString()}] ${line}\n`;
  try {
    fs.appendFileSync(logFile(), entry);
  } catch {
    // best-effort — a logging failure should never take down a sync run
  }
}

module.exports = { log, logFile };
