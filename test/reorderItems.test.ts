import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeReorderedItems } from '../src/shared/reorderItems';
import type { QueueItem } from '../src/shared/types';

const item = (id: string, overrides: Partial<QueueItem> = {}): QueueItem => ({
  id,
  text: id,
  createdAt: new Date(0),
  isCompleted: false,
  followUps: [],
  projectId: 'default',
  ...overrides,
});

const ids = (items: QueueItem[]) => items.map((i) => i.id);

test('items outside the view keep their place', () => {
  const all = [item('a'), item('hidden1'), item('b'), item('hidden2'), item('c')];
  const merged = mergeReorderedItems(all, [item('c'), item('a'), item('b')]);
  assert.deepEqual(ids(merged), ['c', 'hidden1', 'a', 'hidden2', 'b']);
});

test('a reorder of every item just applies the new order', () => {
  const merged = mergeReorderedItems([item('a'), item('b')], [item('b'), item('a')]);
  assert.deepEqual(ids(merged), ['b', 'a']);
});

test('an item deleted since the drag began is not brought back', () => {
  const merged = mergeReorderedItems([item('a'), item('b')], [item('gone'), item('b'), item('a')]);
  assert.deepEqual(ids(merged), ['b', 'a']);
});

test('the newest copy of an item wins over the one the drag started from', () => {
  const merged = mergeReorderedItems([item('a', { text: 'edited' })], [item('a')]);
  assert.equal(merged[0].text, 'edited');
});
