const { app, BrowserWindow, ipcMain, Tray, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, exec } = require('child_process');

// ==========================================
// ENVIRONMENT & HARDWARE ACCELERATION
// ==========================================
// Force Electron to allow audio without a user clicking the screen
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
// Optimize for digital signage 24/7 running
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');

// ==========================================
// GLOBAL STATE
// ==========================================
let mainWindow = null;
let pbProcess = null;
let tray = null;
let isQuitting = false;

// ==========================================
// PATH RESOLUTION
// ==========================================
const userDataPath = app.getPath('userData');
const configPath = path.join(userDataPath, 'signage-config.json');
const pbDataPath = path.join(userDataPath, 'pb_data');
const isDev = !app.isPackaged;
const resourcesPath = isDev ? __dirname : process.resourcesPath;

// ==========================================
// SINGLE INSTANCE LOCK (Production Essential)
// ==========================================
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
        }
    });

    app.whenReady().then(initApp);
}

// ==========================================
// INITIALIZATION & DATABASE
// ==========================================
function setupDatabase() {
    try {
        if (!fs.existsSync(pbDataPath)) {
            console.log("[Setup] First launch detected: Migrating seed database...");
            const seedPath = path.join(resourcesPath, 'pb_data');
            if (fs.existsSync(seedPath)) {
                fs.cpSync(seedPath, pbDataPath, { recursive: true });
                console.log("[Setup] Database migration successful.");
            } else {
                console.warn("[Setup] No seed database found at:", seedPath);
            }
        }
    } catch (err) {
        console.error("[Setup] Database initialization failed:", err);
        dialog.showErrorBox("Database Error", "Failed to initialize the local database. Please check permissions.");
    }
}

function initApp() {
    setupDatabase();

    if (fs.existsSync(configPath)) {
        try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            if (config.role === 'admin') {
                startAdminServer();
            } else if (config.role === 'display') {
                startDisplayKiosk();
            } else {
                showRoleSelector();
            }
        } catch (err) {
            console.error("[Init] Corrupted config file. Resetting setup.", err);
            showRoleSelector();
        }
    } else {
        showRoleSelector();
    }
}

// ==========================================
// 1. ROLE SELECTOR LOGIC
// ==========================================
function showRoleSelector() {
    mainWindow = new BrowserWindow({
        width: 650,
        height: 450,
        resizable: false,
        center: true,
        show: false,
        webPreferences: { 
            nodeIntegration: true, 
            contextIsolation: false 
        }
    });

    const setupHTML = `
        <body style="font-family: 'Segoe UI', Arial, sans-serif; background: #0f172a; color: #f8fafc; text-align: center; padding: 40px; margin: 0;">
            <h1 style="color: #38bdf8; margin-bottom: 10px;">Ad Player Pro</h1>
            <p style="color: #94a3b8; font-size: 1.1rem; margin-bottom: 40px;">Select the operational mode for this device.</p>
            
            <div style="display: flex; flex-direction: column; gap: 15px; align-items: center;">
                <button onclick="const {ipcRenderer} = require('electron'); ipcRenderer.send('set-role', 'admin')" 
                        style="width: 80%; padding: 20px; background: #2563eb; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1.1rem; font-weight: bold; transition: background 0.2s;">
                    🖥️ Primary Admin Server
                </button>
                <button onclick="const {ipcRenderer} = require('electron'); ipcRenderer.send('set-role', 'display')" 
                        style="width: 80%; padding: 20px; background: #1e293b; color: white; border: 1px solid #334155; border-radius: 8px; cursor: pointer; font-size: 1.1rem; font-weight: bold; transition: background 0.2s;">
                    📺 Client Display Kiosk
                </button>
            </div>
        </body>
    `;
    
    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(setupHTML)}`);
    
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });
}

ipcMain.on('set-role', (event, role) => {
    try {
        fs.writeFileSync(configPath, JSON.stringify({ role: role }));
        mainWindow.close();
        initApp();
    } catch (err) {
        dialog.showErrorBox("Configuration Error", "Failed to save device role configuration.");
    }
});

// ==========================================
// 2. ADMIN SERVER LOGIC
// ==========================================
function startAdminServer() {
    console.log("[Admin] Initializing Admin Server...");

    // Open Firewall for network access
    exec('netsh advfirewall firewall add rule name="Ad Player Pro Database" dir=in action=allow protocol=TCP localport=8090', (error) => {
        if (error) console.warn("[Network] Firewall rule execution failed/skipped. Please ensure port 8090 is open.");
    });

    // Launch Embedded PocketBase
    const pbExe = path.join(resourcesPath, 'pocketbase.exe');
    const publicPath = path.join(resourcesPath, 'display-window/dist'); 
    
    pbProcess = spawn(pbExe, [
        'serve',
        `--http=0.0.0.0:8090`,
        `--dir=${pbDataPath}`,
        `--publicDir=${publicPath}` 
    ]);

    pbProcess.stdout.on('data', (data) => console.log(`[PB] ${data.toString().trim()}`));
    pbProcess.stderr.on('data', (data) => console.error(`[PB Error] ${data.toString().trim()}`));

    // Launch Dashboard UI
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 850,
        minWidth: 1024,
        minHeight: 768,
        autoHideMenuBar: true,
        show: false,
        webPreferences: { 
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile(path.join(resourcesPath, 'admin-panel/dist/index.html'));

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Hide to Tray functionality
    mainWindow.on('close', (event) => {
        if (!isQuitting) {
            event.preventDefault();
            mainWindow.hide(); 
            console.log("[Admin] Dashboard hidden to system tray.");
        }
    });

    if (!tray) createTrayIcon();
}

function createTrayIcon() {
    const iconPath = path.join(resourcesPath, 'icon.ico'); 
    
    try {
        if (!fs.existsSync(iconPath)) {
            console.warn("[System Tray] 'icon.ico' missing. Tray initialization skipped.");
            return;
        }

        tray = new Tray(iconPath);
        const contextMenu = Menu.buildFromTemplate([
            { 
                label: 'Open Ad Player Pro', 
                click: () => mainWindow && mainWindow.show() 
            },
            { type: 'separator' },
            { 
                label: 'Shutdown Server & Exit', 
                click: () => {
                    isQuitting = true;
                    app.quit(); 
                } 
            }
        ]);

        tray.setToolTip('Ad Player Pro (Server Active)');
        tray.setContextMenu(contextMenu);
        tray.on('double-click', () => mainWindow && mainWindow.show());

    } catch (err) {
        console.error("[System Tray] Failed to initialize:", err);
    }
}

// ==========================================
// 3. DISPLAY KIOSK LOGIC
// ==========================================
function startDisplayKiosk() {
    console.log("[Display] Initializing Kiosk Mode...");

    mainWindow = new BrowserWindow({
        kiosk: true, 
        alwaysOnTop: true,
        autoHideMenuBar: true,
        frame: false,
        backgroundColor: '#000000', // Prevent white flash on load
        webPreferences: { 
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false // Necessary for local file loading on strict networks
        }
    });

    mainWindow.loadFile(path.join(resourcesPath, 'display-window/dist/index.html'));

    // Lock down the window in production
    mainWindow.on('close', (e) => {
        if (!isDev && !isQuitting) {
            e.preventDefault(); 
            console.warn("[Display] Unauthorized exit attempt blocked.");
        }
    });

    // Handle unexpected crashes
    mainWindow.webContents.on('render-process-gone', (e, details) => {
        console.error("[Display] Renderer crashed:", details.reason);
        if (details.reason !== 'clean-exit') {
            mainWindow.reload(); // Auto-recover
        }
    });
}

// ==========================================
// LIFECYCLE & CLEANUP
// ==========================================
app.on('will-quit', () => {
    console.log("[System] Executing graceful shutdown...");
    if (pbProcess) {
        pbProcess.kill('SIGTERM');
        console.log("[System] PocketBase daemon terminated.");
    }
});

app.on('window-all-closed', () => {
    // Only quit automatically if we aren't using the system tray (macOS default behavior)
    if (process.platform !== 'darwin' && !tray) {
        app.quit();
    }
});