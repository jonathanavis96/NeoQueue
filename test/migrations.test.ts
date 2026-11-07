import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrateAppState } from '../src/shared/migrations';
import { DEFAULT_PROJECT_ID } from '../src/shared/types';

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

test('an item whose project is not in the file moves to Default so it stays visible', () => {
  const state = migrateAppState({
    items: [
      { id: 'a', text: 'orphan', projectId: 'gone' },
      { id: 'b', text: 'kept', projectId: 'p1' },
    ],
    projects: [{ id: 'p1', name: 'Project one' }],
  });
  assert.equal(state.items.find((i) => i.id === 'a')?.projectId, DEFAULT_PROJECT_ID);
  assert.equal(state.items.find((i) => i.id === 'b')?.projectId, 'p1');
});

test('an item with a blank project moves to Default', () => {
  const state = migrateAppState({ items: [{ id: 'a', text: 'blank', projectId: '  ' }] });
  assert.equal(state.items[0].projectId, DEFAULT_PROJECT_ID);
});
