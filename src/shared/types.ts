/**
 * Core data types for NeoQueue
 * Shared between main process and renderer
 */

/**
 * Represents a follow-up note attached to a queue item
 */
export interface FollowUp {
  id: string;
  text: string;
  createdAt: Date;
}

/**
 * Represents a discussion item in the queue
 */
export interface QueueItem {
  id: string;
  text: string;
  createdAt: Date;
  completedAt?: Date;
  isCompleted: boolean;
  followUps: FollowUp[];
}

/**
 * Application state stored persistently
 */
export interface AppState {
  items: QueueItem[];
  version: number;
}

/**
 * IPC channel names for type-safe communication
 */
export const IPC_CHANNELS = {
  SAVE_DATA: 'save-data',
  LOAD_DATA: 'load-data',
  GET_VERSION: 'get-version',
  EXPORT_JSON: 'export-json',
  // Keyboard shortcut events from main to renderer
  SHORTCUT_NEW_ITEM: 'shortcut:new-item',
  SHORTCUT_TOGGLE_WINDOW: 'shortcut:toggle-window',
  // Tray actions
  TRAY_SHOW_WINDOW: 'tray:show-window',
} as const;
