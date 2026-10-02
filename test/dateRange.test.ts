import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyDateRange, parseYyyyMmDd } from '../src/shared/dateRange';
import type { QueueItem } from '../src/shared/types';

const item = (id: string, iso: string): QueueItem => ({
  id,
  text: id,
  createdAt: new Date(iso),
  isCompleted: false,
  followUps: [],
});

const withTz = <T>(tz: string, fn: () => T): T => {
  const prev = process.env.TZ;
  process.env.TZ = tz;
  try {
    return fn();
  } finally {
    if (prev === undefined) delete process.env.TZ;
    else process.env.TZ = prev;
  }
};

test('date range uses the local calendar day the user picked', () => {
  withTz('Africa/Johannesburg', () => {
    const items = [
      // 01:30 on 2 Oct local (23:30 UTC on 1 Oct): belongs to 2 Oct.
      item('early-2nd', '2026-10-01T23:30:00.000Z'),
      // 23:30 on 2 Oct local (21:30 UTC on 2 Oct): belongs to 2 Oct.
      item('late-2nd', '2026-10-02T21:30:00.000Z'),
      // 00:30 on 3 Oct local (22:30 UTC on 2 Oct): belongs to 3 Oct.
      item('early-3rd', '2026-10-02T22:30:00.000Z'),
    ];
    const picked = applyDateRange(items, { field: 'createdAt', from: '2026-10-02', to: '2026-10-02' });
    assert.deepEqual(picked.map((i) => i.id), ['early-2nd', 'late-2nd']);
  });
});

test('impossible calendar dates are rejected', () => {
  assert.equal(parseYyyyMmDd('2026-02-31'), null);
  assert.equal(parseYyyyMmDd('2026-13-01'), null);
  assert.ok(parseYyyyMmDd('2024-02-29'));
  assert.throws(() => applyDateRange([], { field: 'createdAt', from: '2026-02-31' }), /YYYY-MM-DD/);
});
