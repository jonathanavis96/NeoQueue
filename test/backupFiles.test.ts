import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { selectBackupsToPrune, writeFileAtomic } from '../src/main/backupFiles';

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
