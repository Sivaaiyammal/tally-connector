const { app, Tray, Menu, BrowserWindow, ipcMain, nativeImage, shell } = require("electron");
const path = require("path");
const config = require("../src/config");
const settingsStore = require("./settingsStore");
const { runOnce } = require("../src/sync");
const { log, logFile } = require("./log");

if (!app.requestSingleInstanceLock()) {
  // Another instance already owns the tray icon and the sync loop — a second
  // one would double-push every record. Just hand focus to it and exit.
  app.quit();
} else {
  app.on("second-instance", () => {
    createSettingsWindow();
  });

  let tray = null;
  let settingsWindow = null;
  let intervalHandle = null;
  let syncing = false;
  let lastRunSummary = null;

  function applySavedSettings() {
    config.update(settingsStore.load());
  }

  function broadcastStatus() {
    const status = { syncing, lastRunSummary };
    if (settingsWindow) settingsWindow.webContents.send("sync:status-changed", status);
    updateTrayMenu();
    return status;
  }

  function createSettingsWindow() {
    if (settingsWindow) {
      settingsWindow.show();
      settingsWindow.focus();
      return;
    }
    settingsWindow = new BrowserWindow({
      width: 620,
      height: 760,
      title: "Tally Connector Settings",
      icon: path.join(__dirname, "assets", "icon.png"),
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
    settingsWindow.setMenuBarVisibility(false);
    settingsWindow.loadFile(path.join(__dirname, "settings.html"));
    settingsWindow.on("closed", () => {
      settingsWindow = null;
    });
  }

  async function runSyncTick(trigger) {
    if (syncing) return lastRunSummary;
    if (!config.isConfigured()) {
      lastRunSummary = {
        at: new Date().toISOString(),
        error: "Not configured yet — open Settings and fill in the MEVA and Tally fields.",
        trigger,
      };
      broadcastStatus();
      return lastRunSummary;
    }

    log(`sync run start (${trigger})`);
    syncing = true;
    broadcastStatus();
    try {
      const summary = await runOnce();
      const pushed = summary.reduce((sum, r) => sum + r.pushed, 0);
      const failed = summary.reduce((sum, r) => sum + r.failed, 0);
      lastRunSummary = { at: new Date().toISOString(), pushed, failed, trigger };
      log(`sync run done (${trigger}): ${pushed} pushed, ${failed} failed`);
    } catch (err) {
      lastRunSummary = { at: new Date().toISOString(), error: err.message, trigger };
      log(`sync run FAILED (${trigger}): ${err.message}`);
    } finally {
      syncing = false;
      broadcastStatus();
    }
    return lastRunSummary;
  }

  function scheduleInterval() {
    if (intervalHandle) clearInterval(intervalHandle);
    intervalHandle = setInterval(() => runSyncTick("scheduled"), config.syncIntervalSeconds * 1000);
  }

  function statusLabel() {
    if (syncing) return "Syncing…";
    if (!lastRunSummary) return "Not synced yet";
    if (lastRunSummary.error) return `Last run failed: ${lastRunSummary.error}`;
    return `Last run: ${lastRunSummary.pushed} pushed, ${lastRunSummary.failed} failed`;
  }

  function updateTrayMenu() {
    if (!tray) return;
    const menu = Menu.buildFromTemplate([
      { label: statusLabel(), enabled: false },
      { type: "separator" },
      { label: "Sync Now", click: () => runSyncTick("manual"), enabled: !syncing },
      { label: "Open Settings…", click: createSettingsWindow },
      { label: "Open Log File", click: () => shell.openPath(logFile()) },
      { type: "separator" },
      {
        label: "Start with Windows",
        type: "checkbox",
        checked: app.getLoginItemSettings().openAtLogin,
        click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked }),
      },
      { type: "separator" },
      { label: "Quit Tally Connector", click: () => app.exit(0) },
    ]);
    tray.setContextMenu(menu);
    tray.setToolTip(`Tally Connector — ${statusLabel()}`);
  }

  app.whenReady().then(() => {
    log("app ready");
    applySavedSettings();

    const icon = nativeImage.createFromPath(path.join(__dirname, "assets", "icon.png"));
    tray = new Tray(icon.resize({ width: 16, height: 16 }));
    tray.on("click", createSettingsWindow);
    updateTrayMenu();

    if (!config.isConfigured()) {
      createSettingsWindow();
    }

    scheduleInterval();
    runSyncTick("startup");
  });

  ipcMain.handle("settings:load", () => settingsStore.load());
  ipcMain.handle("settings:save", (_event, values) => {
    const saved = settingsStore.save(values);
    config.update(saved);
    scheduleInterval();
    return saved;
  });
  ipcMain.handle("sync:now", () => runSyncTick("manual"));
  ipcMain.handle("sync:status", () => ({ syncing, lastRunSummary }));

  // Tray app: closing the Settings window should not end the background sync
  // loop, only quitting from the tray menu should.
  app.on("window-all-closed", (event) => {
    event.preventDefault();
  });
}
