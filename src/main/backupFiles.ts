/**
 * Pure file helpers for the backup system (no Electron imports, so they can be
 * unit tested with plain Node).
 */
import * as fs from 'fs';
import type { AppState } from '../shared/types';

const TIMESTAMPED_BACKUP =
  /^(backup|startup|pre-save|shutdown|emergency)-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)\.json$/;

/**
 * Given the names in a backup directory, return the timestamped backups that
 * fall outside the newest `keepCount`.
 *
 * Ordering is by the timestamp part of the name, not the whole name, so one
 * prefix never crowds out another (sorting whole names kept every "startup-"
 * file and pruned "emergency-" ones first).
 */
export const selectBackupsToPrune = (files: string[], keepCount: number): string[] => {
  const backups = files
    .map((file) => {
      const match = TIMESTAMPED_BACKUP.exec(file);
      return match ? { file, stamp: match[2] } : null;
    })
    .filter((b): b is { file: string; stamp: string } => b !== null);

  backups.sort((a, b) => (a.stamp < b.stamp ? 1 : a.stamp > b.stamp ? -1 : 0));
  return backups.slice(Math.max(0, keepCount)).map((b) => b.file);
};

/**
 * Write a file via a temp file plus rename, so a crash or a full disk mid-write
 * never leaves a truncated file where the previous good copy used to be.
 */
export const writeFileAtomic = async (
  filePath: string,
  contents: string,
  fsp: typeof fs.promises = fs.promises
): Promise<void> => {
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    await fsp.writeFile(tmpPath, contents, { encoding: 'utf8' });
    await fs.promises.rename(tmpPath, filePath);
  } catch (error) {
    await fs.promises.unlink(tmpPath).catch(() => undefined);
    throw error;
  }
};

/**
 * Decide whether a save may go ahead.
 *
 * `loadFailed` matters because a failed load leaves the renderer showing an
 * empty list and leaves nothing to compare against, so the first save would
 * otherwise replace stored data that may only need repairing.
 */
export const validateDataBeforeSave = (
  newData: AppState,
  existingData: AppState | null,
  loadFailed: boolean
): { valid: boolean; reason?: string } => {
  if (loadFailed) {
    return { valid: false, reason: 'Blocked: your saved data could not be read, so it was not overwritten' };
  }
  if (!existingData) return { valid: true };
  const existingCount = existingData.items?.length ?? 0;
  const newCount = newData.items?.length ?? 0;
  if (existingCount > 5 && newCount === 0) {
    return { valid: false, reason: `Blocked: would delete all ${existingCount} items` };
  }
  return { valid: true };
};

/**
 * Build a `before-quit` listener that holds the quit until the final backup is
 * done. Electron does not wait for an async listener, so the quit is cancelled
 * once, the backup runs, and `quit` is called again to finish. `timeoutMs` stops
 * a hung backup drive from keeping the app alive.
 */
export const createQuitHandler = ({
  runFinalBackup,
  quit,
  timeoutMs,
}: {
  runFinalBackup: () => Promise<void>;
  quit: () => void;
  timeoutMs: number;
}) => {
  let backupStarted = false;

  return (event: { preventDefault: () => void }): void => {
    if (backupStarted) return;
    backupStarted = true;
    event.preventDefault();

    const timedOut = new Promise<void>((resolve) => setTimeout(resolve, timeoutMs).unref());
    void Promise.race([runFinalBackup().catch(() => undefined), timedOut]).then(quit);
  };
};
