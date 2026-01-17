/**
 * AppState migrations + normalization helpers.
 *
 * Why:
 * - electron-store / JSON export can persist older shapes as the schema evolves.
 * - We want best-effort loading/importing (never crash) while still rejecting
 *   completely invalid data.
 */

import type { AppState, QueueItem, FollowUp, ExperimentalFlags } from './types';

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
  const canvas = record.canvas;
  const autocomplete = record.autocomplete;

  const next: Partial<ExperimentalFlags> = {};

  if (typeof canvas === 'boolean') next.canvas = canvas;
  if (typeof autocomplete === 'boolean') next.autocomplete = autocomplete;

  return Object.keys(next).length > 0 ? next : undefined;
};

const migrateSettings = (raw: unknown): AppState['settings'] => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;

  const record = raw as Record<string, unknown>;
  const experimentalFlags = migrateExperimentalFlags(record.experimentalFlags);

  if (!experimentalFlags) return undefined;
  return { experimentalFlags };
};

export const CURRENT_APP_STATE_VERSION = 3;

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

  return {
    id,
    text,
    createdAt,
    completedAt,
    isCompleted,
    followUps,
  };
};

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

  const dictionary = migrateLearnedDictionary((asObject as Record<string, unknown>).dictionary);
  const settings = migrateSettings((asObject as Record<string, unknown>).settings);

  // Upgrade to current version.
  void fromVersion; // reserved for future stepwise migrations

  return {
    items: normalizedItems,
    dictionary,
    settings,
    version: CURRENT_APP_STATE_VERSION,
  };
};
