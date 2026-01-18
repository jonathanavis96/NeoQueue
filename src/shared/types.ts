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

export interface SavedCommand {
  id: string;
  text: string;
  createdAt: Date;
}

/**
 * Represents a project/category that groups queue items
 */
export interface Project {
  id: string;
  name: string;
  createdAt: Date;
  /** When all queue items are discussed and user marks project complete */
  completedAt?: Date;
  isCompleted: boolean;
}

/** The default project ID - cannot be deleted */
export const DEFAULT_PROJECT_ID = 'default';

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
  /** Project this item belongs to. Defaults to DEFAULT_PROJECT_ID */
  projectId: string;
}

/**
 * Application state stored persistently
 */
export interface LearnedDictionary {
  /**
   * Case-preserving tokens learned from existing content.
   *
   * Why: Provides a stable source for tab-autocomplete without needing a
   * heavyweight editor/spellcheck pipeline.
   */
  tokens: string[];
}

export type ExperimentalFlagKey = 'autocomplete';

export interface ExperimentalFlags {
  autocomplete: boolean;
}

export interface AppSettings {
  /**
   * Experimental flag overrides persisted in AppState.
   *
   * Note: flags are optional in persisted data so that older stores/imports can
   * fall back to build-time defaults (VITE_EXPERIMENTAL_*).
   */
  experimentalFlags?: Partial<ExperimentalFlags>;
  /**
   * Matrix rain background settings.
   */
  matrixRain?: {
    enabled: boolean;
    /** Intensity from 0-100, default 15 */
    intensity: number;
  };
  /**
   * Last active project ID for restoring state on app restart.
   */
  activeProjectId?: string;
}

export interface AppState {
  items: QueueItem[];
  commands?: SavedCommand[];
  /** Projects/categories for organizing items */
  projects?: Project[];
  version: number;
  dictionary: LearnedDictionary;
  settings?: AppSettings;
}

/**
 * Export scoping options.
 *
 * Why: Allows exporting only Active or only Discussed items without changing the core schema.
 */
export type ExportScope = 'all' | 'active' | 'discussed';

export type ExportDateField = 'createdAt' | 'completedAt';

export interface ExportDateRange {
  /** Which date on each item the filter should apply to. */
  field: ExportDateField;
  /** Inclusive start date, in YYYY-MM-DD format. */
  from?: string;
  /** Inclusive end date, in YYYY-MM-DD format. */
  to?: string;
}

export interface ExportOptions {
  scope?: ExportScope;
  /** Optional date-range filter applied in the renderer before export. */
  dateRange?: ExportDateRange;
}

/**
 * IPC channel names for type-safe communication
 */
export const IPC_CHANNELS = {
  SAVE_DATA: 'save-data',
  LOAD_DATA: 'load-data',
  GET_VERSION: 'get-version',
  EXPORT_JSON: 'export-json',
  EXPORT_MARKDOWN: 'export-markdown',
  IMPORT_JSON: 'import-json',
  // Window controls / settings
  GET_ALWAYS_ON_TOP: 'get-always-on-top',
  SET_ALWAYS_ON_TOP: 'set-always-on-top',
  WINDOW_MINIMIZE: 'window-minimize',
  WINDOW_MAXIMIZE: 'window-maximize',
  WINDOW_CLOSE: 'window-close',
  WINDOW_IS_MAXIMIZED: 'window-is-maximized',
  // Keyboard shortcut events from main to renderer
  SHORTCUT_NEW_ITEM: 'shortcut:new-item',
  SHORTCUT_TOGGLE_WINDOW: 'shortcut:toggle-window',
  // Tray actions
  TRAY_SHOW_WINDOW: 'tray:show-window',
} as const;
