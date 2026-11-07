import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveActiveProjectId } from '../src/shared/activeProject';
import { DEFAULT_PROJECT_ID } from '../src/shared/types';

const projects = [{ id: DEFAULT_PROJECT_ID }, { id: 'a' }, { id: 'b' }];

test('the saved project wins when it exists', () => {
  assert.equal(resolveActiveProjectId('a', 'b', projects), 'b');
});

test('a saved project that is gone leaves the current one alone', () => {
  assert.equal(resolveActiveProjectId('a', 'deleted', projects), 'a');
});

test('a current project that is gone falls back to Default', () => {
  assert.equal(resolveActiveProjectId('deleted', undefined, projects), DEFAULT_PROJECT_ID);
  assert.equal(resolveActiveProjectId('deleted', 'deleted', projects), DEFAULT_PROJECT_ID);
});
