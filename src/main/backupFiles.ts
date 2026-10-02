/**
 * Pure file helpers for the backup system (no Electron imports, so they can be
 * unit tested with plain Node).
 */
import * as fs from 'fs';

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
