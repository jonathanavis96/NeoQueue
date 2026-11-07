import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { useKeyboardShortcuts } from '../src/renderer/hooks/useKeyboardShortcuts';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const pressCtrlZ = async (target: Record<string, unknown>) => {
  let listener: ((e: unknown) => void) | undefined;
  (globalThis as Record<string, unknown>).window = {
    addEventListener: (_type: string, fn: (e: unknown) => void) => {
      listener = fn;
    },
    removeEventListener: () => undefined,
  };

  let undoCalls = 0;
  const Probe = () => {
    useKeyboardShortcuts({ onUndo: () => undoCalls++ });
    return null;
  };
  await act(async () => {
    TestRenderer.create(createElement(Probe));
  });

  let prevented = false;
  listener?.({ ctrlKey: true, metaKey: false, shiftKey: false, key: 'z', target, preventDefault: () => (prevented = true) });
  return { undoCalls, prevented };
};

test('Ctrl+Z while typing is left to the text field', async () => {
  const result = await pressCtrlZ({ tagName: 'TEXTAREA', value: 'half a sentence' });
  assert.deepEqual(result, { undoCalls: 0, prevented: false });
});

test('Ctrl+Z in an empty field undoes the last list action', async () => {
  const result = await pressCtrlZ({ tagName: 'TEXTAREA', value: '' });
  assert.deepEqual(result, { undoCalls: 1, prevented: true });
});

test('Ctrl+Z outside a field undoes the last list action', async () => {
  const result = await pressCtrlZ({ tagName: 'BODY' });
  assert.deepEqual(result, { undoCalls: 1, prevented: true });
});
