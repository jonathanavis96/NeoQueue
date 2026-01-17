import { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, nativeImage, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import Store from 'electron-store';
import { AppState, IPC_CHANNELS } from '../shared/types';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// `electron-squirrel-startup` is Windows-only; guard to avoid crashing on other platforms.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  if (require('electron-squirrel-startup')) {
    app.quit();
  }
} catch {
  // ignore
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

const isDev = process.env.NODE_ENV !== 'production' || !app.isPackaged;

const getAssetPath = (...segments: string[]): string => {
  // In dev, app.getAppPath() points at the project root (where package.json lives).
  // In production, it points at the packaged app path (often inside app.asar).
  return path.join(app.getAppPath(), ...segments);
};

const safeNativeImageFromPath = (assetPath: string): Electron.NativeImage | null => {
  try {
    if (!fs.existsSync(assetPath)) return null;
    const img = nativeImage.createFromPath(assetPath);
    return img.isEmpty() ? null : img;
  } catch {
    return null;
  }
};

const getAppIcon = (): Electron.NativeImage | null => {
  return safeNativeImageFromPath(getAssetPath('build', 'icon.png'));
};

const getTrayIcon = (): Electron.NativeImage | null => {
  return safeNativeImageFromPath(getAssetPath('build', 'tray.png'));
};

// Initialize electron-store for persistent data storage
const store = new Store<{ appState: AppState }>({
  name: 'neoqueue-data',
  defaults: {
    appState: {
      items: [],
      version: 1,
    },
  },
});

// IPC Handlers for data persistence
ipcMain.handle(IPC_CHANNELS.SAVE_DATA, async (_event, data: AppState) => {
  try {
    store.set('appState', data);
    return { success: true };
  } catch (error) {
    console.error('Failed to save data:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle(IPC_CHANNELS.LOAD_DATA, async () => {
  try {
    const appState = store.get('appState');
    return { success: true, data: appState };
  } catch (error) {
    console.error('Failed to load data:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle(IPC_CHANNELS.GET_VERSION, async () => {
  return app.getVersion();
});

ipcMain.handle(IPC_CHANNELS.EXPORT_JSON, async (_event, data: AppState) => {
  try {
    const defaultFileName = `neoqueue-export-${new Date().toISOString().slice(0, 10)}.json`;
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Export NeoQueue data',
      defaultPath: defaultFileName,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });

    if (canceled || !filePath) {
      return { success: true, canceled: true };
    }

    const json = JSON.stringify(
      data,
      (_key, value) => (value instanceof Date ? value.toISOString() : value),
      2
    );

    await fs.promises.writeFile(filePath, json, { encoding: 'utf8' });

    return { success: true, filePath };
  } catch (error) {
    console.error('Failed to export JSON:', error);
    return { success: false, error: String(error) };
  }
});

const createWindow = (): void => {
  // Create the browser window.
  const appIcon = getAppIcon();

  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 400,
    minHeight: 300,
    backgroundColor: '#0a0a0a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    // App icon (used on Windows/Linux; macOS uses the app bundle icon)
    ...(appIcon ? { icon: appIcon } : {}),

    // Matrix-style: dark title bar
    titleBarStyle: 'default',
    show: false, // Don't show until ready
  });

  // Load the app
  if (isDev) {
    // In development, load from Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from built files
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

/**
 * Create system tray icon with context menu
 */
const createTray = (): void => {
  const trayIcon = getTrayIcon();

  // Fallback to an inline SVG if the icon asset is missing.
  const fallbackIconSize = 16;
  const fallbackSvg = `
    <svg width="${fallbackIconSize}" height="${fallbackIconSize}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${fallbackIconSize}" height="${fallbackIconSize}" fill="#0a0a0a"/>
      <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" 
            fill="#00ff00" font-family="monospace" font-size="12" font-weight="bold">N</text>
    </svg>
  `;

  const icon = trayIcon ??
    nativeImage.createFromDataURL(
      `data:image/svg+xml;base64,${Buffer.from(fallbackSvg).toString('base64')}`
    );

  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip('NeoQueue - Discussion Tracker');
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show NeoQueue',
      click: () => {
        showAndFocusWindow();
      },
    },
    {
      label: 'New Item (Ctrl+Shift+N)',
      click: () => {
        showAndFocusWindow();
        // Send shortcut event to renderer
        mainWindow?.webContents.send(IPC_CHANNELS.SHORTCUT_NEW_ITEM);
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    },
  ]);
  
  tray.setContextMenu(contextMenu);
  
  // Double-click on tray icon shows window
  tray.on('double-click', () => {
    showAndFocusWindow();
  });
};

/**
 * Show and focus the main window
 */
const showAndFocusWindow = (): void => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.show();
    mainWindow.focus();
  }
};

/**
 * Register global keyboard shortcuts
 */
const registerGlobalShortcuts = (): void => {
  // Ctrl+Shift+N: Focus app and prepare for new item
  globalShortcut.register('CommandOrControl+Shift+N', () => {
    showAndFocusWindow();
    // Small delay to ensure window is focused before sending event
    setTimeout(() => {
      mainWindow?.webContents.send(IPC_CHANNELS.SHORTCUT_NEW_ITEM);
    }, 100);
  });
  
  // Ctrl+Shift+Q: Toggle window visibility (quick access)
  globalShortcut.register('CommandOrControl+Shift+Q', () => {
    if (mainWindow) {
      if (mainWindow.isVisible() && mainWindow.isFocused()) {
        mainWindow.hide();
      } else {
        showAndFocusWindow();
      }
    }
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  createWindow();
  createTray();
  registerGlobalShortcuts();

  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Unregister shortcuts when app is about to quit
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
