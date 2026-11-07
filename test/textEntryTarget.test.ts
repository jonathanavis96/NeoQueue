import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasEditableText } from '../src/renderer/hooks/textEntryTarget';

const target = (fields: Record<string, unknown>) => fields as unknown as EventTarget;

test('a text field with text keeps its own undo', () => {
  assert.equal(hasEditableText(target({ tagName: 'TEXTAREA', value: 'draft' })), true);
  assert.equal(hasEditableText(target({ tagName: 'INPUT', type: 'text', value: 'draft' })), true);
  assert.equal(hasEditableText(target({ tagName: 'INPUT', type: 'search', value: 'draft' })), true);
});

test('an empty text field leaves undo to the list', () => {
  assert.equal(hasEditableText(target({ tagName: 'TEXTAREA', value: '' })), false);
  assert.equal(hasEditableText(target({ tagName: 'INPUT', type: 'text', value: '' })), false);
});

test('controls with no text leave undo to the list', () => {
  assert.equal(hasEditableText(target({ tagName: 'INPUT', type: 'checkbox', value: 'on' })), false);
  assert.equal(hasEditableText(target({ tagName: 'INPUT', type: 'range', value: '15' })), false);
  assert.equal(hasEditableText(target({ tagName: 'BUTTON' })), false);
  assert.equal(hasEditableText(null), false);
});

test('contenteditable content keeps its own undo', () => {
  assert.equal(hasEditableText(target({ tagName: 'DIV', isContentEditable: true })), true);
});
