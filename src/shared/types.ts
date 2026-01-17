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
export interface LearnedDictionary {
  /**
   * Case-preserving tokens learned from existing content.
   *
   * Why: Provides a stable source for tab-autocomplete without needing a
   * heavyweight editor/spellcheck pipeline.
   */
  tokens: string[];
}

export type ExperimentalFlagKey = 'canvas' | 'autocomplete';

export interface ExperimentalFlags {
  canvas: boolean;
  autocomplete: boolean;
}

export type CanvasNodePosition = {
  /** Left position as a percentage of the canvas width (0-100). */
  leftPct: number;
  /** Top position as a percentage of the canvas height (0-100). */
  topPct: number;
};

export interface CanvasLayoutSettings {
  /**
   * Node positions keyed by QueueItem.id.
   *
   * Why: Lets the Canvas prototype persist a stable layout without changing the core QueueItem model.
   */
  positions: Record<string, CanvasNodePosition>;
}

export interface AppSettings {
  /**
   * Experimental flag overrides persisted in AppState.
   *
   * Note: flags are optional in persisted data so that older stores/imports can
   * fall back to build-time defaults (VITE_EXPERIMENTAL_*).
   */
  experimentalFlags?: Partial<ExperimentalFlags>;

  /** Optional persisted Canvas layout data (experimental). */
  canvasLayout?: CanvasLayoutSettings;
}

export interface AppState {
  items: QueueItem[];
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
  // Keyboard shortcut events from main to renderer
  SHORTCUT_NEW_ITEM: 'shortcut:new-item',
  SHORTCUT_TOGGLE_WINDOW: 'shortcut:toggle-window',
  // Tray actions
  TRAY_SHOW_WINDOW: 'tray:show-window',
} as const;
