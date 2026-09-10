const config = require("./config");
const { runOnce } = require("./sync");

async function tick() {
  console.log(`\n=== sync run @ ${new Date().toISOString()} ===`);
  try {
    const summary = await runOnce();
    const pushed = summary.reduce((sum, r) => sum + r.pushed, 0);
    const failed = summary.reduce((sum, r) => sum + r.failed, 0);
    console.log(`=== done: ${pushed} pushed, ${failed} failed ===`);
  } catch (err) {
    console.error(`Sync run failed: ${err.message}`);
  }
}

async function main() {
  const once = process.argv.includes("--once");
  console.log(
    `tally-connector starting — MEVA: ${config.mevaApiBaseUrl}, Tally: ${config.tallyHost}:${config.tallyPort} (company "${config.tallyCompanyName}")`,
  );

  await tick();
  if (once) return;

  console.log(`Polling every ${config.syncIntervalSeconds}s. Press Ctrl+C to stop.`);
  setInterval(tick, config.syncIntervalSeconds * 1000);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
