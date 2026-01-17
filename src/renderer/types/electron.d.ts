/**
 * Type declarations for Electron API exposed via preload script
 */

import { AppState } from '../../shared/types';

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
      onNewItemShortcut: (callback: ShortcutCallback) => () => void;
      onShowWindow: (callback: ShortcutCallback) => () => void;
    };
  }
}

export {};
