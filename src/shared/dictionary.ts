/**
 * Learned dictionary helpers.
 *
 * Why: Extract case-preserving tokens from queue content so the app can provide
 * lightweight tab-autocomplete without a heavy editor model.
 */

import type { QueueItem } from './types';

const TOKEN_REGEX = /[A-Za-z0-9._\-/]+/g;

/**
 * Extract unique, case-preserving tokens from QueueItems.
 *
 * Rules (per Task 26.1):
 * - Tokens are contiguous runs of `[A-Za-z0-9._\-/]`.
 * - Case-insensitive uniqueness.
 *
 * Notes:
 * - We keep only tokens with length >= 3 to reduce noise.
 * - Ordering is stable and predictable: alphabetical by lowercase token.
 */
export const extractLearnedTokens = (items: QueueItem[]): string[] => {
  const seen = new Map<string, string>();

  const ingest = (text: string) => {
    const matches = text.match(TOKEN_REGEX);
    if (!matches) return;

    for (const token of matches) {
      const trimmed = token.trim();
      if (trimmed.length < 3) continue;

      const key = trimmed.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, trimmed);
      }
    }
  };

  for (const item of items) {
    ingest(item.text ?? '');
    for (const fu of item.followUps ?? []) {
      ingest(fu.text ?? '');
    }
  }

  return Array.from(seen.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, original]) => original);
};
