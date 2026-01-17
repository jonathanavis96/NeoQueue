import { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, nativeImage } from 'electron';
import * as path from 'path';
import Store from 'electron-store';
import { AppState, IPC_CHANNELS } from '../shared/types';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

const isDev = process.env.NODE_ENV !== 'production' || !app.isPackaged;

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

const createWindow = (): void => {
  // Create the browser window.
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
  // Create a simple Matrix-style tray icon (16x16 green square with "N")
  // In production, you'd use a proper icon file
  const iconSize = 16;
  const canvas = `
    <svg width="${iconSize}" height="${iconSize}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${iconSize}" height="${iconSize}" fill="#0a0a0a"/>
      <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" 
            fill="#00ff00" font-family="monospace" font-size="12" font-weight="bold">N</text>
    </svg>
  `;
  
  // Create native image from data URL
  const icon = nativeImage.createFromDataURL(
    `data:image/svg+xml;base64,${Buffer.from(canvas).toString('base64')}`
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
