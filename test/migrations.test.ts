import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrateAppState } from '../src/shared/migrations';

test('a saved command with an unparseable createdAt gets a valid date', () => {
  const state = migrateAppState({
    items: [],
    commands: [
      { id: 'c1', text: 'hello', createdAt: 'not a date' },
      { id: 'c2', text: 'world', createdAt: { nested: true } },
    ],
  });
  for (const cmd of state.commands ?? []) {
    assert.ok(cmd.createdAt instanceof Date);
    assert.ok(!Number.isNaN(cmd.createdAt.getTime()), `command ${cmd.id} has an Invalid Date`);
  }
});

test('a saved command keeps a valid createdAt', () => {
  const state = migrateAppState({
    items: [],
    commands: [{ id: 'c1', text: 'hello', createdAt: '2026-01-02T03:04:05.000Z' }],
  });
  assert.equal(state.commands?.[0].createdAt.toISOString(), '2026-01-02T03:04:05.000Z');
});
