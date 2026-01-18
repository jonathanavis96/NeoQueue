/**
 * AppState migrations + normalization helpers.
 *
 * Why:
 * - electron-store / JSON export can persist older shapes as the schema evolves.
 * - We want best-effort loading/importing (never crash) while still rejecting
 *   completely invalid data.
 */

import type {
  AppState,
  QueueItem,
  FollowUp,
  ExperimentalFlags,
  Project,
  SavedCommand,
} from './types';
import { DEFAULT_PROJECT_ID } from './types';

const migrateLearnedDictionary = (raw: unknown): AppState['dictionary'] => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { tokens: [] };
  }

  const tokensRaw = (raw as Record<string, unknown>).tokens;
  if (!Array.isArray(tokensRaw)) {
    return { tokens: [] };
  }

  const tokens = tokensRaw
    .map((t) => (typeof t === 'string' ? t.trim() : ''))
    .filter((t) => t.length > 0);

  return { tokens };
};

const migrateExperimentalFlags = (raw: unknown): Partial<ExperimentalFlags> | undefined => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;

  const record = raw as Record<string, unknown>;
  const autocomplete = record.autocomplete;

  const next: Partial<ExperimentalFlags> = {};

  if (typeof autocomplete === 'boolean') next.autocomplete = autocomplete;

  return Object.keys(next).length > 0 ? next : undefined;
};

const migrateSettings = (raw: unknown): AppState['settings'] => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;

  const record = raw as Record<string, unknown>;
  const experimentalFlags = migrateExperimentalFlags(record.experimentalFlags);

  // Migrate matrixRain settings
  let matrixRain: { enabled: boolean; intensity: number } | undefined;
  if (record.matrixRain && typeof record.matrixRain === 'object') {
    const mr = record.matrixRain as Record<string, unknown>;
    matrixRain = {
      enabled: coerceBoolean(mr.enabled, false),
      intensity: typeof mr.intensity === 'number' ? mr.intensity : 15,
    };
  }

  // Migrate activeProjectId
  const activeProjectId = typeof record.activeProjectId === 'string' 
    ? record.activeProjectId 
    : undefined;

  // Return settings if any field is present
  if (!experimentalFlags && !matrixRain && !activeProjectId) return undefined;

  return {
    experimentalFlags,
    matrixRain,
    activeProjectId,
  };
};

export const CURRENT_APP_STATE_VERSION = 5;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const generateId = (): string => {
  // Not cryptographically secure; sufficient for local IDs.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const coerceString = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') return value;
  if (value == null) return fallback;
  return String(value);
};

const coerceBoolean = (value: unknown, fallback = false): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return ['true', '1', 'yes', 'y'].includes(value.toLowerCase());
  return fallback;
};

const coerceDate = (value: unknown, fallback: Date): Date => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  if (typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return fallback;
};

const migrateFollowUp = (raw: unknown): FollowUp | null => {
  if (!isRecord(raw)) return null;

  const id = coerceString(raw.id, '').trim() || generateId();
  const text = coerceString(raw.text, '').trim();
  if (!text) return null;

  const createdAt = coerceDate(raw.createdAt, new Date());

  return { id, text, createdAt };
};

const migrateQueueItem = (raw: unknown): QueueItem | null => {
  if (!isRecord(raw)) return null;

  const id = coerceString(raw.id, '').trim() || generateId();
  const text = coerceString(raw.text, '').trim();
  if (!text) return null;

  // Legacy support: `completed` (boolean) instead of `isCompleted`.
  const legacyCompleted = coerceBoolean((raw as Record<string, unknown>).completed, false);
  const isCompleted = coerceBoolean(raw.isCompleted, legacyCompleted);

  const createdAt = coerceDate(raw.createdAt, new Date());

  // If `completedAt` is missing but item is completed, keep it undefined (it may not exist in
  // legacy exports). The UI can still show it as discussed.
  const completedAtRaw = raw.completedAt;
  const completedAt =
    completedAtRaw == null
      ? undefined
      : coerceDate(completedAtRaw, new Date());

  const followUpsRaw =
    Array.isArray(raw.followUps)
      ? raw.followUps
      : Array.isArray((raw as Record<string, unknown>).followups)
        ? ((raw as Record<string, unknown>).followups as unknown[])
        : [];

  const followUps = followUpsRaw
    .map(migrateFollowUp)
    .filter((fu): fu is FollowUp => Boolean(fu));

  // Project ID - default to DEFAULT_PROJECT_ID for legacy items
  const projectId = coerceString(raw.projectId, DEFAULT_PROJECT_ID);

  return {
    id,
    text,
    createdAt,
    completedAt,
    isCompleted,
    followUps,
    projectId,
  };
};

const migrateProject = (raw: unknown): Project | null => {
  if (!isRecord(raw)) return null;

  const id = coerceString(raw.id, '').trim();
  if (!id) return null;

  const name = coerceString(raw.name, '').trim();
  if (!name) return null;

  const createdAt = coerceDate(raw.createdAt, new Date());
  const isCompleted = coerceBoolean(raw.isCompleted, false);
  
  const completedAtRaw = raw.completedAt;
  const completedAt =
    completedAtRaw == null
      ? undefined
      : coerceDate(completedAtRaw, new Date());

  return {
    id,
    name,
    createdAt,
    completedAt,
    isCompleted,
  };
};

/** Create the default project that always exists */
const createDefaultProject = (): Project => ({
  id: DEFAULT_PROJECT_ID,
  name: 'Default',
  createdAt: new Date(),
  isCompleted: false,
});

/**
 * Best-effort migration/normalization for persisted or imported AppState.
 *
 * Accepts legacy shapes:
 * - `AppState` object missing `version`
 * - Raw `QueueItem[]` (very early exports)
 *
 * Throws for completely invalid inputs.
 */
export const migrateAppState = (raw: unknown): AppState => {
  // Legacy: raw array means "items".
  const asObject: unknown = Array.isArray(raw) ? { items: raw, version: 0 } : raw;

  if (!isRecord(asObject)) {
    throw new Error('Invalid data: expected an object');
  }

  const itemsCandidate = (asObject as Record<string, unknown>).items;
  if (!Array.isArray(itemsCandidate)) {
    throw new Error('Invalid data: missing "items" array');
  }

  const fromVersion =
    typeof (asObject as Record<string, unknown>).version === 'number'
      ? ((asObject as Record<string, unknown>).version as number)
      : 0;

  // Current schema is v1. If/when v2+ exists, add stepwise migrations keyed by `fromVersion`.
  const items = itemsCandidate
    .map(migrateQueueItem)
    .filter((i): i is QueueItem => Boolean(i));

  // If nothing could be migrated but input had elements, treat it as invalid.
  if (items.length === 0 && itemsCandidate.length > 0) {
    throw new Error('Invalid data: no valid items found');
  }

  // Normalize completion timestamps:
  // - If item is *not* completed, completedAt should be undefined.
  // - If item *is* completed but completedAt is invalid/missing, leave undefined.
  const normalizedItems = items.map((item) => {
    if (!item.isCompleted) {
      return { ...item, completedAt: undefined };
    }
    return item;
  });

  // Migrate projects - ensure Default project always exists
  const projectsCandidate = (asObject as Record<string, unknown>).projects;
  let projects: Project[] = [];
  
  if (Array.isArray(projectsCandidate)) {
    projects = projectsCandidate
      .map(migrateProject)
      .filter((p): p is Project => Boolean(p));
  }
  
  // Ensure Default project exists
  if (!projects.find(p => p.id === DEFAULT_PROJECT_ID)) {
    projects.unshift(createDefaultProject());
  }

  const dictionary = migrateLearnedDictionary((asObject as Record<string, unknown>).dictionary);
  const settings = migrateSettings((asObject as Record<string, unknown>).settings);

  // Migrate commands - preserve saved commands
  const commandsCandidate = (asObject as Record<string, unknown>).commands;
  let commands: SavedCommand[] = [];
  
  if (Array.isArray(commandsCandidate)) {
    commands = commandsCandidate
      .filter((cmd): cmd is Record<string, unknown> => 
        cmd !== null && typeof cmd === 'object' && !Array.isArray(cmd))
      .filter((cmd) => typeof cmd.id === 'string' && typeof cmd.text === 'string')
      .map((cmd) => ({
        id: cmd.id as string,
        text: cmd.text as string,
        createdAt: cmd.createdAt ? new Date(cmd.createdAt as string) : new Date(),
      }));
  }

  // Upgrade to current version.
  void fromVersion; // reserved for future stepwise migrations

  return {
    items: normalizedItems,
    commands,
    projects,
    dictionary,
    settings,
    version: CURRENT_APP_STATE_VERSION,
  };
};
