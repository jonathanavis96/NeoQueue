import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import type { AppState, Project, QueueItem } from '../src/shared/types';
import { DEFAULT_PROJECT_ID } from '../src/shared/types';
import { useQueueData } from '../src/renderer/hooks/useQueueData';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const when = new Date('2026-01-02T03:04:05.000Z');

const item = (id: string, projectId: string = DEFAULT_PROJECT_ID, isCompleted = false): QueueItem => ({
  id,
  text: `item ${id}`,
  createdAt: when,
  isCompleted,
  followUps: [],
  projectId,
});

const project = (id: string): Project => ({ id, name: id, createdAt: when, isCompleted: false });

const state = (items: QueueItem[], projects: Project[] = [project(DEFAULT_PROJECT_ID)]): AppState => ({
  items,
  projects,
  commands: [],
  dictionary: { tokens: [] },
  version: 5,
});

const mount = async (initial: AppState, imported?: AppState) => {
  const saves: AppState[] = [];
  (globalThis as Record<string, unknown>).window = {
    electronAPI: {
      loadData: async () => ({ success: true, data: initial }),
      saveData: async (data: AppState) => {
        saves.push(data);
        return { success: true };
      },
      importJson: async () => ({ success: true, data: imported }),
    },
  };

  let hook!: ReturnType<typeof useQueueData>;
  const Probe = () => {
    hook = useQueueData();
    return null;
  };
  await act(async () => {
    TestRenderer.create(createElement(Probe));
  });

  return {
    get hook() {
      return hook;
    },
    saves,
    run: (fn: (current: ReturnType<typeof useQueueData>) => Promise<void>) =>
      act(async () => {
        await fn(hook);
      }),
  };
};

const ids = (items: QueueItem[]) => items.map((i) => i.id);

test('reordering one project keeps the items of every other project', async () => {
  const app = await mount(
    state([item('a', 'p1'), item('other', 'p2'), item('b', 'p1')], [
      project(DEFAULT_PROJECT_ID),
      project('p1'),
      project('p2'),
    ])
  );

  await app.run((h) => h.reorderItems([item('b', 'p1'), item('a', 'p1')]));

  assert.deepEqual(ids(app.saves.at(-1)!.items), ['b', 'other', 'a']);
  assert.deepEqual(ids(app.hook.items), ['b', 'other', 'a']);
});

test('importing a file loads its projects, and the next save keeps them', async () => {
  const app = await mount(
    state([item('old')]),
    state([item('imported', 'p9')], [project(DEFAULT_PROJECT_ID), project('p9')])
  );

  await app.run((h) => h.importJson());
  assert.ok(app.hook.projects.some((p) => p.id === 'p9'), 'imported project is missing');

  await app.run((h) => h.addItem('new'));
  assert.ok(app.saves.at(-1)!.projects?.some((p) => p.id === 'p9'), 'save dropped the imported project');
});

test('importing a file with no default project still ends with one', async () => {
  const app = await mount(state([]), state([], [project('p9')]));
  await app.run((h) => h.importJson());
  assert.ok(app.hook.projects.some((p) => p.id === DEFAULT_PROJECT_ID));
});

test('undo after a later edit only reverts that edit', async () => {
  const app = await mount(state([item('a'), item('b')]));

  await app.run((h) => h.deleteItem('b'));
  await app.run((h) => h.updateItem('a', { text: 'edited' }));
  await app.run((h) => h.undo());

  assert.deepEqual(ids(app.hook.items), ['a']);
  assert.equal(app.hook.items[0].text, 'item a');
});

test('undo after a later follow-up keeps the earlier delete and drops only the follow-up', async () => {
  const app = await mount(state([item('a'), item('b')]));

  await app.run((h) => h.deleteItem('b'));
  await app.run((h) => h.addFollowUp('a', 'note'));
  await app.run((h) => h.undo());

  assert.deepEqual(ids(app.hook.items), ['a']);
  assert.equal(app.hook.items[0].followUps.length, 0);
});

test('undo cannot restore items into a project that has been deleted', async () => {
  const app = await mount(
    state([item('a', 'p1'), item('b', 'p1')], [project(DEFAULT_PROJECT_ID), project('p1')])
  );

  await app.run((h) => h.deleteItem('b'));
  await app.run((h) => h.deleteProject('p1'));
  await app.run((h) => h.undo());

  const known = new Set(app.hook.projects.map((p) => p.id));
  for (const i of app.hook.items) {
    assert.ok(known.has(i.projectId), `item ${i.id} points at missing project ${i.projectId}`);
  }
});

test('undo reverts a reorder rather than an older action', async () => {
  const app = await mount(state([item('a'), item('b'), item('c')]));

  await app.run((h) => h.deleteItem('c'));
  await app.run((h) => h.reorderItems([item('b'), item('a')]));
  await app.run((h) => h.undo());

  assert.deepEqual(ids(app.hook.items), ['a', 'b']);
});
