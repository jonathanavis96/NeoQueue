import { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, nativeImage, dialog, screen } from 'electron';
import { migrateAppState } from '../shared/migrations';
import * as path from 'path';
import * as fs from 'fs';
import Store from 'electron-store';
import { AppState, ExportOptions, IPC_CHANNELS } from '../shared/types';

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

type AppSettings = {
  /**
   * When true, clicking the window close button hides NeoQueue instead of quitting.
   *
   * Why: NeoQueue is tray-first and should keep running for quick capture.
   */
  closeToTray: boolean;

  /**
   * When true, keep the window above other windows.
   *
   * Why: Some users prefer a "pinned" queue during 1:1s.
   */
  alwaysOnTop: boolean;
};

type WindowState = {
  /**
   * Window bounds in "normal" (non-maximized) state.
   *
   * Why: Persisting the normal bounds allows a maximized window to restore to the
   * user's last preferred size/position when un-maximized.
   */
  bounds: Electron.Rectangle;
  isMaximized: boolean;
};

type StoreSchema = {
  appState: AppState;
  settings: AppSettings;
  windowState?: WindowState;
};

// Initialize electron-store for persistent data storage
const store = new Store<StoreSchema>({
  name: 'neoqueue-data',
  defaults: {
    appState: {
      items: [],
      version: 2,
      dictionary: { tokens: [] },
    },
    settings: {
      closeToTray: false,
      alwaysOnTop: false,
    },
  },
});

const getSavedWindowState = (): WindowState | null => {
  const saved = store.get('windowState');
  if (!saved) return null;

  // Best-effort validation (defensive against corrupted store files).
  const bounds = (saved as WindowState).bounds;
  const isMaximized = Boolean((saved as WindowState).isMaximized);

  if (!bounds || typeof bounds !== 'object') return null;

  const { x, y, width, height } = bounds as Electron.Rectangle;
  if (![x, y, width, height].every((n) => typeof n === 'number' && Number.isFinite(n))) return null;
  if (width < 200 || height < 150) return null;

  return { bounds: { x, y, width, height }, isMaximized };
};

const doRectsIntersect = (a: Electron.Rectangle, b: Electron.Rectangle, minIntersection = 64): boolean => {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);

  const intersectionWidth = x2 - x1;
  const intersectionHeight = y2 - y1;

  return intersectionWidth >= minIntersection && intersectionHeight >= minIntersection;
};

const isBoundsVisibleOnAnyDisplay = (bounds: Electron.Rectangle): boolean => {
  // Work area excludes taskbar/dock; better UX for ensuring window isn't hidden.
  const displays = screen.getAllDisplays();
  return displays.some((d) => doRectsIntersect(bounds, d.workArea));
};

const getCenteredBounds = (width: number, height: number): Electron.Rectangle => {
  const primary = screen.getPrimaryDisplay();
  const workArea = primary.workArea;

  // Ensure the window fits on the primary display. BrowserWindow minWidth/minHeight
  // is enforced later, but centering with a too-large size can still place it oddly.
  const clampedWidth = Math.min(width, workArea.width);
  const clampedHeight = Math.min(height, workArea.height);

  const x = Math.round(workArea.x + (workArea.width - clampedWidth) / 2);
  const y = Math.round(workArea.y + (workArea.height - clampedHeight) / 2);

  return { x, y, width: clampedWidth, height: clampedHeight };
};

const getInitialWindowState = (): WindowState => {
  const saved = getSavedWindowState();
  if (!saved) {
    return { bounds: getCenteredBounds(800, 600), isMaximized: false };
  }

  // Multi-monitor sanity check: if the saved bounds are no longer visible (e.g.,
  // monitor disconnected), fall back to a centered window on the primary display.
  if (!isBoundsVisibleOnAnyDisplay(saved.bounds)) {
    return {
      bounds: getCenteredBounds(saved.bounds.width, saved.bounds.height),
      isMaximized: false,
    };
  }

  return saved;
};

const saveWindowState = (win: BrowserWindow): void => {
  // When maximized, getBounds() returns the maximized bounds, not the previous "normal" bounds.
  // Use getNormalBounds() to persist the meaningful restore target.
  const bounds = win.isMaximized() ? win.getNormalBounds() : win.getBounds();

  store.set('windowState', {
    bounds,
    isMaximized: win.isMaximized(),
  });
};

const getCloseToTraySetting = (): boolean => {
  return Boolean(store.get('settings')?.closeToTray);
};

const setCloseToTraySetting = (enabled: boolean): void => {
  store.set('settings', {
    ...(store.get('settings') ?? { closeToTray: false, alwaysOnTop: false }),
    closeToTray: enabled,
  });
};

const getAlwaysOnTopSetting = (): boolean => {
  return Boolean(store.get('settings')?.alwaysOnTop);
};

const setAlwaysOnTopSetting = (enabled: boolean): void => {
  store.set('settings', {
    ...(store.get('settings') ?? { closeToTray: false, alwaysOnTop: false }),
    alwaysOnTop: enabled,
  });
};

let isQuitting = false;

/**
 * Debounced backup to a secondary location.
 *
 * Why:
 * - electron-store already persists under userData, but a second copy reduces the
 *   chance of data loss if the primary store gets corrupted.
 * - Debounce prevents excessive disk writes during rapid UI interactions.
 */
let pendingBackupTimer: NodeJS.Timeout | null = null;
let latestBackupPayload: AppState | null = null;

const getBackupDir = (): string => {
  // "Documents" is generally user-visible and works well on Windows/macOS/Linux.
  // Using path.join keeps Windows pathing safe.
  return path.join(app.getPath('documents'), 'NeoQueue Backups');
};

const serializeAppState = (data: AppState): string =>
  JSON.stringify(
    data,
    (_key, value) => (value instanceof Date ? value.toISOString() : value),
    2
  );

const writeBackupNow = async (data: AppState): Promise<void> => {
  try {
    const backupDir = getBackupDir();
    await fs.promises.mkdir(backupDir, { recursive: true });

    // Keep a single "latest" backup to avoid unbounded growth.
    const filePath = path.join(backupDir, 'backup-latest.json');
    await fs.promises.writeFile(filePath, serializeAppState(data), { encoding: 'utf8' });
  } catch (error) {
    // Backups are best-effort and should never break the core save flow.
    console.warn('Failed to write secondary backup:', error);
  }
};

const scheduleSecondaryBackup = (data: AppState, debounceMs = 1500): void => {
  latestBackupPayload = data;

  if (pendingBackupTimer) clearTimeout(pendingBackupTimer);

  pendingBackupTimer = setTimeout(() => {
    pendingBackupTimer = null;
    if (!latestBackupPayload) return;
    void writeBackupNow(latestBackupPayload);
  }, debounceMs);
};

// IPC Handlers for data persistence
ipcMain.handle(IPC_CHANNELS.SAVE_DATA, async (_event, data: AppState) => {
  try {
    store.set('appState', data);

    // Best-effort secondary backup. Never fail the main save if backup fails.
    scheduleSecondaryBackup(data);

    return { success: true };
  } catch (error) {
    console.error('Failed to save data:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle(IPC_CHANNELS.LOAD_DATA, async () => {
  try {
    const raw = store.get('appState');

    // Defensive migration: older store files (or corrupted data) shouldn't crash the app.
    // If migration succeeds and produces a normalized shape, persist it back.
    const migrated = migrateAppState(raw);
    store.set('appState', migrated);

    return { success: true, data: migrated };
  } catch (error) {
    console.error('Failed to load data:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle(IPC_CHANNELS.GET_VERSION, async () => {
  return app.getVersion();
});

ipcMain.handle(IPC_CHANNELS.GET_ALWAYS_ON_TOP, async () => {
  return getAlwaysOnTopSetting();
});

ipcMain.handle(IPC_CHANNELS.SET_ALWAYS_ON_TOP, async (_event, enabled: boolean) => {
  try {
    const safeEnabled = Boolean(enabled);
    setAlwaysOnTopSetting(safeEnabled);
    mainWindow?.setAlwaysOnTop(safeEnabled);
    tray?.setContextMenu(buildTrayMenu());
    return { success: true, enabled: safeEnabled };
  } catch (error) {
    return { success: false, enabled: Boolean(enabled), error: String(error) };
  }
});

ipcMain.handle(IPC_CHANNELS.EXPORT_JSON, async (_event, data: AppState, options?: ExportOptions) => {
  try {
    const scopeSuffix = options?.scope && options.scope !== 'all' ? `-${options.scope}` : '';
    const defaultFileName = `neoqueue-export${scopeSuffix}-${new Date().toISOString().slice(0, 10)}.json`;
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

const escapeMarkdown = (value: string): string => {
  // Avoid turning headings/lists/emphasis into markdown syntax unexpectedly.
  // 1) escape backslashes, then 2) escape common markdown control chars.
  return value.replace(/\\/g, '\\\\').replace(/([[[*_`\]])/g, '\\$1');
};

const formatDate = (date: Date): string => {
  // Manager-friendly: YYYY-MM-DD
  return date.toISOString().slice(0, 10);
};

const toMarkdown = (data: AppState): string => {
  const active = data.items.filter((i) => !i.isCompleted);
  const discussed = data.items.filter((i) => i.isCompleted);

  const lines: string[] = [];
  lines.push(`# NeoQueue Export`);
  lines.push('');
  lines.push(`Generated: ${formatDate(new Date())}`);
  lines.push('');

  const renderSection = (title: string, sectionItems: typeof data.items) => {
    lines.push(`## ${title}`);
    lines.push('');

    if (sectionItems.length === 0) {
      lines.push('_No items._');
      lines.push('');
      return;
    }

    sectionItems.forEach((item, idx) => {
      const created = item.createdAt instanceof Date ? item.createdAt : new Date(item.createdAt);
      const completed = item.completedAt
        ? item.completedAt instanceof Date
          ? item.completedAt
          : new Date(item.completedAt)
        : undefined;

      const header = `${idx + 1}. ${escapeMarkdown(item.text)}`;
      lines.push(header);
      lines.push(`   - Created: ${formatDate(created)}`);
      if (completed) lines.push(`   - Discussed: ${formatDate(completed)}`);

      if (item.followUps?.length) {
        lines.push('   - Follow-ups:');
        item.followUps.forEach((fu) => {
          const fuCreated = fu.createdAt instanceof Date ? fu.createdAt : new Date(fu.createdAt);
          lines.push(`     - ${escapeMarkdown(fu.text)} _(${formatDate(fuCreated)})_`);
        });
      }

      lines.push('');
    });
  };

  renderSection('Active', active);
  renderSection('Discussed', discussed);

  return lines.join('\n');
};

ipcMain.handle(IPC_CHANNELS.EXPORT_MARKDOWN, async (_event, data: AppState, options?: ExportOptions) => {
  try {
    const scopeSuffix = options?.scope && options.scope !== 'all' ? `-${options.scope}` : '';
    const defaultFileName = `neoqueue-export${scopeSuffix}-${new Date().toISOString().slice(0, 10)}.md`;
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Export NeoQueue data (Markdown)',
      defaultPath: defaultFileName,
      filters: [{ name: 'Markdown', extensions: ['md'] }],
    });

    if (canceled || !filePath) {
      return { success: true, canceled: true };
    }

    const markdown = toMarkdown(data);

    await fs.promises.writeFile(filePath, markdown, { encoding: 'utf8' });

    return { success: true, filePath };
  } catch (error) {
    console.error('Failed to export Markdown:', error);
    return { success: false, error: String(error) };
  }
});

const normalizeImportedAppState = (raw: unknown): AppState => {
  // Import should be permissive: allow older exports to continue to work.
  // This uses the same migration logic we apply for the persisted store.
  return migrateAppState(raw);
};

ipcMain.handle(IPC_CHANNELS.IMPORT_JSON, async () => {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Import NeoQueue data (JSON)',
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });

    if (canceled || !filePaths?.[0]) {
      return { success: true, canceled: true };
    }

    const filePath = filePaths[0];
    const rawText = await fs.promises.readFile(filePath, { encoding: 'utf8' });
    const parsed = JSON.parse(rawText) as unknown;
    const normalized = normalizeImportedAppState(parsed);

    const confirm = await dialog.showMessageBox({
      type: 'warning',
      buttons: ['Overwrite current data', 'Cancel'],
      defaultId: 1,
      cancelId: 1,
      title: 'Overwrite NeoQueue data?',
      message: 'Import will overwrite your current NeoQueue items.',
      detail: `You are about to import ${normalized.items.length} item(s) from:\n${filePath}\n\nTip: export first if you want a backup.`,
      noLink: true,
    });

    if (confirm.response !== 0) {
      return { success: true, canceled: true };
    }

    store.set('appState', normalized);
    scheduleSecondaryBackup(normalized);

    return { success: true, data: normalized };
  } catch (error) {
    console.error('Failed to import JSON:', error);
    return { success: false, error: String(error) };
  }
});

let pendingWindowStateSaveTimer: NodeJS.Timeout | null = null;

const scheduleWindowStateSave = (win: BrowserWindow, debounceMs = 250): void => {
  if (pendingWindowStateSaveTimer) clearTimeout(pendingWindowStateSaveTimer);
  pendingWindowStateSaveTimer = setTimeout(() => {
    pendingWindowStateSaveTimer = null;
    saveWindowState(win);
  }, debounceMs);
};

const createWindow = (): void => {
  // Create the browser window.
  const appIcon = getAppIcon();

  const savedWindowState = getInitialWindowState();

  mainWindow = new BrowserWindow({
    width: savedWindowState.bounds.width,
    height: savedWindowState.bounds.height,
    x: savedWindowState.bounds.x,
    y: savedWindowState.bounds.y,
    minWidth: 400,
    minHeight: 300,
    backgroundColor: '#0a0a0a',
    // Apply persisted "pin" setting at creation time.
    alwaysOnTop: getAlwaysOnTopSetting(),
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

  // Close-to-tray: intercept the close button and hide the window instead.
  // Note: we only do this when a tray exists; otherwise the user could "lose" the app.
  mainWindow.on('close', (e) => {
    // Persist bounds on any close path (quit OR hide-to-tray).
    saveWindowState(mainWindow!);

    if (isQuitting) return;
    if (!tray) return;
    if (!getCloseToTraySetting()) return;

    e.preventDefault();
    mainWindow?.hide();
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
    if (savedWindowState?.isMaximized) {
      mainWindow?.maximize();
    }

    mainWindow?.show();
  });

  // Persist bounds on move/resize/maximize/unmaximize.
  // Debounced to avoid excessive writes while the user is dragging the window.
  mainWindow.on('resize', () => scheduleWindowStateSave(mainWindow!));
  mainWindow.on('move', () => scheduleWindowStateSave(mainWindow!));
  mainWindow.on('maximize', () => scheduleWindowStateSave(mainWindow!));
  mainWindow.on('unmaximize', () => scheduleWindowStateSave(mainWindow!));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

/**
 * Create system tray icon with context menu
 */
const buildTrayMenu = (): Electron.Menu => {
  return Menu.buildFromTemplate([
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
      label: 'Always on top',
      type: 'checkbox',
      checked: getAlwaysOnTopSetting(),
      click: (menuItem) => {
        setAlwaysOnTopSetting(menuItem.checked);
        mainWindow?.setAlwaysOnTop(menuItem.checked);
        tray?.setContextMenu(buildTrayMenu());
      },
    },
    {
      label: 'Close to tray',
      type: 'checkbox',
      checked: getCloseToTraySetting(),
      click: (menuItem) => {
        setCloseToTraySetting(menuItem.checked);
        tray?.setContextMenu(buildTrayMenu());
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
  
  tray.setContextMenu(buildTrayMenu());
  
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

// Mark that we are intentionally quitting (not just hiding on close-to-tray).
app.on('before-quit', () => {
  isQuitting = true;
});

// Unregister shortcuts when app is about to quit
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
