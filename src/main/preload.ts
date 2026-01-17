// Preload script for Electron
// This script runs in the renderer process but has access to Node.js APIs
// It's used to safely expose specific functionality to the renderer

import { contextBridge, ipcRenderer } from 'electron';
import { AppState, IPC_CHANNELS } from '../shared/types';

// Response types for IPC calls
interface SaveDataResponse {
  success: boolean;
  error?: string;
}

interface LoadDataResponse {
  success: boolean;
  data?: AppState;
  error?: string;
}

interface ExportJsonResponse {
  success: boolean;
  canceled?: boolean;
  filePath?: string;
  error?: string;
}

interface ExportMarkdownResponse {
  success: boolean;
  canceled?: boolean;
  filePath?: string;
  error?: string;
}

interface ImportJsonResponse {
  success: boolean;
  canceled?: boolean;
  data?: AppState;
  error?: string;
}

// Callback type for shortcut events
type ShortcutCallback = () => void;

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform info
  platform: process.platform,
  
  // Data persistence methods
  saveData: (data: AppState): Promise<SaveDataResponse> => 
    ipcRenderer.invoke(IPC_CHANNELS.SAVE_DATA, data),
  
  loadData: (): Promise<LoadDataResponse> => 
    ipcRenderer.invoke(IPC_CHANNELS.LOAD_DATA),
  
  getVersion: (): Promise<string> => 
    ipcRenderer.invoke(IPC_CHANNELS.GET_VERSION),

  exportJson: (data: AppState): Promise<ExportJsonResponse> =>
    ipcRenderer.invoke(IPC_CHANNELS.EXPORT_JSON, data),

  exportMarkdown: (data: AppState): Promise<ExportMarkdownResponse> =>
    ipcRenderer.invoke(IPC_CHANNELS.EXPORT_MARKDOWN, data),

  importJson: (): Promise<ImportJsonResponse> =>
    ipcRenderer.invoke(IPC_CHANNELS.IMPORT_JSON),
  
  // Keyboard shortcut event listeners
  onNewItemShortcut: (callback: ShortcutCallback): (() => void) => {
    const handler = () => callback();
    ipcRenderer.on(IPC_CHANNELS.SHORTCUT_NEW_ITEM, handler);
    // Return cleanup function
    return () => ipcRenderer.removeListener(IPC_CHANNELS.SHORTCUT_NEW_ITEM, handler);
  },
  
  onShowWindow: (callback: ShortcutCallback): (() => void) => {
    const handler = () => callback();
    ipcRenderer.on(IPC_CHANNELS.TRAY_SHOW_WINDOW, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.TRAY_SHOW_WINDOW, handler);
  },
});

// Type declarations for the exposed API
declare global {
  interface Window {
    electronAPI: {
      platform: NodeJS.Platform;
      saveData: (data: AppState) => Promise<SaveDataResponse>;
      loadData: () => Promise<LoadDataResponse>;
      getVersion: () => Promise<string>;
      exportJson: (data: AppState) => Promise<ExportJsonResponse>;
      exportMarkdown: (data: AppState) => Promise<ExportMarkdownResponse>;
      importJson: () => Promise<ImportJsonResponse>;
      onNewItemShortcut: (callback: ShortcutCallback) => () => void;
      onShowWindow: (callback: ShortcutCallback) => () => void;
    };
  }
}
