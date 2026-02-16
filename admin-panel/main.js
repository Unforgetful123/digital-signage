// admin-panel/main.js
const { app, BrowserWindow } = require('electron');
const path = require('path');

let adminWindow;

function createWindow() {
  const isDev = !app.isPackaged;
  const indexPath = isDev 
    ? "http://localhost:5173" 
    : `file://${path.join(__dirname, 'dist', 'index.html')}`;

  adminWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  adminWindow.loadURL(indexPath);
  adminWindow.maximize();
}

app.whenReady().then(createWindow);