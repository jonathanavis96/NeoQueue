/**
 * Type declarations for Electron API exposed via preload script
 */

import { AppState, ExportOptions } from '../../shared/types';

interface SaveDataResponse {
  success: boolean;
  error?: string;
}

interface LoadDataResponse {
  success: boolean;
  data?: AppState;
  error?: string;
}

type ShortcutCallback = () => void;

declare global {
  interface Window {
    electronAPI: {
      platform: NodeJS.Platform;
      saveData: (data: AppState) => Promise<SaveDataResponse>;
      loadData: () => Promise<LoadDataResponse>;
      getVersion: () => Promise<string>;
      exportJson: (data: AppState, options?: ExportOptions) => Promise<{ success: boolean; canceled?: boolean; filePath?: string; error?: string }>;
      exportMarkdown: (data: AppState, options?: ExportOptions) => Promise<{ success: boolean; canceled?: boolean; filePath?: string; error?: string }>;
      importJson: () => Promise<{ success: boolean; canceled?: boolean; data?: AppState; error?: string }>;
      getAlwaysOnTop: () => Promise<boolean>;
      setAlwaysOnTop: (enabled: boolean) => Promise<{ success: boolean; enabled: boolean; error?: string }>;
      onNewItemShortcut: (callback: ShortcutCallback) => () => void;
      onShowWindow: (callback: ShortcutCallback) => () => void;
    };
  }
}

export {};
