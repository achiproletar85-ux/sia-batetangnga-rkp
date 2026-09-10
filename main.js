const { app, BrowserWindow, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Global Uncaught Exception Handler for Electron
process.on('uncaughtException', (err) => {
    console.error('❌ CRITICAL ELECTRON ERROR:', err);
    try {
        dialog.showErrorBox('Error Aplikasi SIA Batetangnga', err.stack || err.message || String(err));
    } catch(e) {}
});

// Determine root directory (handles packed vs unpacked app)
const appRootDir = __dirname;

// Load environment variables from .env if present
const envPath = path.join(appRootDir, '.env');
if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
}

let mainWindow = null;

async function createWindow() {
    try {
        process.env.USER_DATA_PATH = app.getPath('userData');
        const { startServer } = require(path.join(appRootDir, 'server.js'));
        const port = process.env.PORT || 5500;
        const boundPort = await startServer(port);

        const windowOptions = {
            width: 1366,
            height: 850,
            minWidth: 1024,
            minHeight: 700,
            title: 'SIA Batetangnga - Sistem Informasi Desa',
            autoHideMenuBar: false,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(appRootDir, 'preload.js')
            }
        };

        const iconPath = path.join(appRootDir, 'frontend', 'favicon.ico');
        if (fs.existsSync(iconPath) && fs.statSync(iconPath).size > 1000) {
            windowOptions.icon = iconPath;
        }

        mainWindow = new BrowserWindow(windowOptions);

        // Load local Express server URL (Start at Login page)
        const appUrl = `http://localhost:${boundPort}/login.html`;
        console.log(`💻 Memuat Electron BrowserWindow ke: ${appUrl}`);
        await mainWindow.loadURL(appUrl);

        // Open external links in default browser
        mainWindow.webContents.setWindowOpenHandler(({ url }) => {
            if (url.startsWith('http:') || url.startsWith('https:')) {
                shell.openExternal(url);
                return { action: 'deny' };
            }
            return { action: 'allow' };
        });

        mainWindow.on('closed', () => {
            mainWindow = null;
        });

    } catch (err) {
        console.error('❌ Gagal memulai server backend di Electron:', err);
        dialog.showErrorBox('Gagal Membuka Aplikasi', `Gagal menjalankan server internal: ${err.message}`);
    }
}

// Application Lifecycle
app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
