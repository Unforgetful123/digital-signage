const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, exec } = require('child_process');

let mainWindow;
let pbProcess;

// We store the config and the live database in the Windows %APPDATA% folder 
const userDataPath = app.getPath('userData');
const configPath = path.join(userDataPath, 'signage-config.json');
const pbDataPath = path.join(userDataPath, 'pb_data');

const isDev = !app.isPackaged;
const resourcesPath = isDev ? __dirname : process.resourcesPath;

// --- THE SEED DATABASE LOGIC ---
function setupDatabase() {
    if (!fs.existsSync(pbDataPath)) {
        console.log("First launch detected: Copying seed database...");
        const seedPath = path.join(resourcesPath, 'pb_data');
        if (fs.existsSync(seedPath)) {
            fs.cpSync(seedPath, pbDataPath, { recursive: true });
        }
    }
}

function initApp() {
    setupDatabase(); // Ensure the database is ready BEFORE anything else

    if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath));
        if (config.role === 'admin') {
            startAdminServer();
        } else if (config.role === 'display') {
            startDisplayKiosk();
        }
    } else {
        showRoleSelector();
    }
}

// ==========================================
// 1. THE ROLE SELECTOR (First Launch Only)
// ==========================================
function showRoleSelector() {
    mainWindow = new BrowserWindow({
        width: 600,
        height: 400,
        webPreferences: { nodeIntegration: true, contextIsolation: false }
    });

    const setupHTML = `
        <body style="font-family: Arial; background: #0f172a; color: white; text-align: center; padding: 50px;">
            <h2>Welcome to Ad Player Pro</h2>
            <p>How do you want to use this computer?</p>
            <br/>
            <button onclick="const {ipcRenderer} = require('electron'); ipcRenderer.send('set-role', 'admin')" 
                    style="padding: 15px 30px; margin: 10px; cursor: pointer; font-size: 16px;">
                🖥️ This is the Admin Server
            </button>
            <button onclick="const {ipcRenderer} = require('electron'); ipcRenderer.send('set-role', 'display')" 
                    style="padding: 15px 30px; margin: 10px; cursor: pointer; font-size: 16px;">
                📺 This is a Display Screen
            </button>
        </body>
    `;
    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(setupHTML)}`);
}

ipcMain.on('set-role', (event, role) => {
    fs.writeFileSync(configPath, JSON.stringify({ role: role }));
    mainWindow.close();
    initApp();
});


// ==========================================
// 2. THE ADMIN SERVER LOGIC
// ==========================================
function startAdminServer() {
    // A. Open the Windows Firewall for Port 8090 silently
    exec('netsh advfirewall firewall add rule name="Ad Player Pro Database" dir=in action=allow protocol=TCP localport=8090');

    // B. Launch PocketBase WITH THE WEB SERVER TRICK
    const pbExe = path.join(resourcesPath, 'pocketbase.exe');
    const publicPath = path.join(resourcesPath, 'display-window/dist'); 
    
    pbProcess = spawn(pbExe, [
        'serve',
        `--http=0.0.0.0:8090`,
        `--dir=${pbDataPath}`,
        `--publicDir=${publicPath}` // <-- This line unlocks the web browsers!
    ]);

    pbProcess.stdout.on('data', (data) => console.log(`PocketBase: ${data}`));
    pbProcess.stderr.on('data', (data) => console.error(`PocketBase Error: ${data}`));

    // C. Open the Admin Panel Window
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        autoHideMenuBar: true,
        webPreferences: { nodeIntegration: true }
    });

    mainWindow.loadFile(path.join(resourcesPath, 'admin-panel/dist/index.html'));
}


// ==========================================
// 3. THE DISPLAY KIOSK LOGIC
// ==========================================
function startDisplayKiosk() {
    mainWindow = new BrowserWindow({
        kiosk: true, // This is Electron's bulletproof fullscreen mode
        alwaysOnTop: true,
        autoHideMenuBar: true,
        webPreferences: { nodeIntegration: true }
    });

    mainWindow.loadFile(path.join(resourcesPath, 'display-window/dist/index.html'));

    // Prevent closing via normal means
    mainWindow.on('close', (e) => {
        if (!isDev) e.preventDefault(); 
    });
}

// ==========================================
// APP LIFECYCLE
// ==========================================
app.whenReady().then(initApp);

// Clean up the PocketBase background process when closing the app
app.on('will-quit', () => {
    if (pbProcess) {
        pbProcess.kill();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});