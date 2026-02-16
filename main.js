const { app, BrowserWindow, Menu } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const fs = require('fs');

app.disableHardwareAcceleration();

let adminWindow, playerWindow, pbProcess;

// Helper to find files whether in Dev or Packaged mode
function getResourcePath(...parts) {
  const base = app.isPackaged ? process.resourcesPath : __dirname;
  return path.join(base, ...parts);
}

function startPocketBase() {
  const pbExe = getResourcePath("pocketbase.exe");
  const pbDir = path.dirname(pbExe);
  const pbData = path.join(pbDir, "pb_data");

  if (!fs.existsSync(pbExe)) {
    console.error(`❌ PocketBase not found at: ${pbExe}`);
    return;
  }

  console.log(`🚀 Starting PocketBase...`);

  // FIX: Use the equals sign format strictly, as a single string per argument
  pbProcess = spawn(pbExe, ["serve", "--http=0.0.0.0:8090", `--dir=${pbData}`], {
    cwd: pbDir,
    windowsHide: true,
    shell: false // Ensure no shell interference
  });

  pbProcess.stdout.on("data", (data) => console.log(`[PB]: ${data}`));
  pbProcess.stderr.on("data", (data) => console.error(`[PB-ERR]: ${data}`));
}

function createWindows() {
  const isDev = !app.isPackaged;
  startPocketBase();

  const commonPrefs = {
    nodeIntegration: true,
    contextIsolation: false,
  };

  adminWindow = new BrowserWindow({
    width: 1100,
    height: 700,
    autoHideMenuBar: true,
    webPreferences: commonPrefs
  });

  // 🛑 BLOCK NEW TABS: This stops the app from opening popups in a new window
  adminWindow.webContents.setWindowOpenHandler(({ url }) => {
    console.log("Blocked popup:", url);
    return { action: 'deny' };
  });

  playerWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    titleBarStyle: "hidden",
    autoHideMenuBar: true,
    webPreferences: {
      ...commonPrefs,
      autoplayPolicy: "no-user-gesture-required" 
    }
  });

  if (isDev) {
    adminWindow.loadURL("http://localhost:5173");
    playerWindow.loadURL("http://localhost:5174");
  } else {
    // 📁 Load the built index files
    adminWindow.loadFile(getResourcePath("admin-panel", "dist", "index.html"));
    playerWindow.loadFile(getResourcePath("display-window", "dist", "index.html"));
  }

  // Prevent the "Alt" key from showing the menu bar
  adminWindow.setMenuBarVisibility(false);
  playerWindow.setMenuBarVisibility(false);
  Menu.setApplicationMenu(null);
}

// Ensure PB dies when app closes
app.on("before-quit", () => {
  if (pbProcess) {
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(pbProcess.pid), "/t", "/f"]);
    } else {
      pbProcess.kill();
    }
  }
});

app.whenReady().then(createWindows);