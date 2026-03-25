import { app, BrowserWindow } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const isDev = process.env.NODE_ENV === 'development';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveDistIndexPath() {
  const candidates = [
    path.join(__dirname, 'dist', 'index.html'),
    path.join(process.resourcesPath, 'app.asar', 'dist', 'index.html'),
    path.join(process.resourcesPath, 'app', 'dist', 'index.html'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}

// Prevent stale UI in desktop app when switching between builds.
app.commandLine.appendSwitch('disable-http-cache');

async function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
  });

  await mainWindow.webContents.session.clearCache();
  await mainWindow.webContents.session.clearStorageData();
  console.log('[electron] Cleared renderer cache and storage');

  let forcedReloadDone = false;
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[electron] did-finish-load');
    if (!forcedReloadDone) {
      forcedReloadDone = true;
      console.log('[electron] Reloading renderer ignoring cache');
      mainWindow.webContents.reloadIgnoringCache();
    }
  });

  if (isDev) {
    console.log('[electron] Loading dev URL: http://localhost:5173');
    await mainWindow.loadURL('http://localhost:5173');
  } else {
    const distIndexPath = resolveDistIndexPath();
    console.log('Loading latest build...');
    console.log('[electron] Loading file:', distIndexPath);
    await mainWindow.loadFile(distIndexPath);
  }

  const shouldOpenDevTools = isDev || process.env.ELECTRON_OPEN_DEVTOOLS === '1';
  if (shouldOpenDevTools) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});