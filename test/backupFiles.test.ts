import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { createQuitHandler, selectBackupsToPrune, validateDataBeforeSave, writeFileAtomic } from '../src/main/backupFiles';
import type { AppState } from '../src/shared/types';

const name = (prefix: string, iso: string) => `${prefix}-${iso.replace(/[:.]/g, '-')}.json`;

test('pruning keeps the newest backups regardless of prefix', () => {
  const newestEmergency = name('emergency', '2026-10-02T10:00:00.000Z');
  const files = [
    newestEmergency,
    name('startup', '2026-01-01T00:00:00.000Z'),
    name('startup', '2026-01-02T00:00:00.000Z'),
    name('shutdown', '2026-01-03T00:00:00.000Z'),
  ];
  const pruned = selectBackupsToPrune(files, 2);
  assert.ok(!pruned.includes(newestEmergency), 'newest emergency backup must be kept');
  assert.deepEqual(
    [...pruned].sort(),
    [name('startup', '2026-01-01T00:00:00.000Z'), name('startup', '2026-01-02T00:00:00.000Z')].sort()
  );
});

test('pruning ignores files that are not timestamped backups', () => {
  const files = ['backup-latest.json', 'notes.txt', name('backup', '2026-01-01T00:00:00.000Z')];
  assert.deepEqual(selectBackupsToPrune(files, 0), [name('backup', '2026-01-01T00:00:00.000Z')]);
});

test('writeFileAtomic leaves the previous file intact when the write fails', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'neoqueue-atomic-'));
  const target = path.join(dir, 'backup-latest.json');
  fs.writeFileSync(target, 'old');
  await writeFileAtomic(target, 'new');
  assert.equal(fs.readFileSync(target, 'utf8'), 'new');
  assert.deepEqual(fs.readdirSync(dir), ['backup-latest.json'], 'no temp file left behind');

  // A writer that dies half way must not truncate the existing file.
  const failing = {
    ...fs.promises,
    writeFile: async (p: fs.PathLike) => {
      await fs.promises.writeFile(p, 'partial');
      throw new Error('disk full');
    },
  };
  await assert.rejects(writeFileAtomic(target, 'newer', failing as typeof fs.promises));
  assert.equal(fs.readFileSync(target, 'utf8'), 'new');
  assert.deepEqual(fs.readdirSync(dir), ['backup-latest.json'], 'temp file cleaned up after failure');
});

const quitEvent = () => {
  let prevented = 0;
  return { event: { preventDefault: () => prevented++ }, prevented: () => prevented };
};

test('quit waits for the final backup, then quits once', async () => {
  let finishBackup!: () => void;
  let quits = 0;
  const onBeforeQuit = createQuitHandler({
    runFinalBackup: () => new Promise<void>((resolve) => (finishBackup = resolve)),
    quit: () => quits++,
    timeoutMs: 1000,
  });

  const first = quitEvent();
  onBeforeQuit(first.event);
  assert.equal(first.prevented(), 1, 'the first quit must be held back');
  await Promise.resolve();
  assert.equal(quits, 0, 'quit fired before the backup finished');

  finishBackup();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(quits, 1);

  const second = quitEvent();
  onBeforeQuit(second.event);
  assert.equal(second.prevented(), 0, 'the follow-up quit must go through');
  assert.equal(quits, 1);
});

test('a hung or failed final backup never stops the app quitting', async () => {
  let quits = 0;
  const hung = createQuitHandler({
    runFinalBackup: () => new Promise<void>(() => undefined),
    quit: () => quits++,
    timeoutMs: 5,
  });
  hung(quitEvent().event);
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(quits, 1);

  const failed = createQuitHandler({
    runFinalBackup: () => Promise.reject(new Error('disk full')),
    quit: () => quits++,
    timeoutMs: 1000,
  });
  failed(quitEvent().event);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(quits, 2);
});

const withItems = (count: number) =>
  ({ items: Array.from({ length: count }, (_, i) => ({ id: String(i) })) }) as unknown as AppState;

test('a save is refused while the stored data could not be read', () => {
  const result = validateDataBeforeSave(withItems(1), null, true);
  assert.equal(result.valid, false);
  assert.match(result.reason ?? '', /could not be read/i);
});

test('normal saves pass, and wiping a real list is still blocked', () => {
  assert.equal(validateDataBeforeSave(withItems(1), null, false).valid, true);
  assert.equal(validateDataBeforeSave(withItems(3), withItems(9), false).valid, true);
  assert.equal(validateDataBeforeSave(withItems(0), withItems(9), false).valid, false);
});
