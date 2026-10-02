import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toMarkdown } from '../src/main/markdownExport';
import type { AppState } from '../src/shared/types';

const state = (items: AppState['items']): AppState => ({ items, version: 5 } as AppState);

test('dates are rendered in local time, not UTC', () => {
  const prevTz = process.env.TZ;
  process.env.TZ = 'Africa/Johannesburg';
  try {
    const md = toMarkdown(
      state([
        {
          id: 'a',
          text: 'late night item',
          // 23:30 UTC on 1 Oct is 01:30 on 2 Oct in Johannesburg.
          createdAt: new Date('2026-10-01T23:30:00.000Z'),
          isCompleted: false,
          followUps: [],
        },
      ])
    );
    assert.match(md, /Created: 2026-10-02/);
  } finally {
    if (prevTz === undefined) delete process.env.TZ;
    else process.env.TZ = prevTz;
  }
});

test('an item with an invalid date does not crash the export', () => {
  const md = toMarkdown(
    state([
      {
        id: 'a',
        text: 'broken dates',
        createdAt: new Date('nope'),
        completedAt: 'also nope' as unknown as Date,
        isCompleted: true,
        followUps: [{ id: 'f', text: 'fu', createdAt: 'bad' as unknown as Date }],
      },
    ])
  );
  assert.match(md, /broken dates/);
  assert.match(md, /Created: unknown/);
});
