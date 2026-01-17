import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';

/**
 * Autocomplete engine + UI-agnostic hook.
 *
 * Scope (Task 26.3):
 * - Pure `getSuggestions(prefix, dictionary, limit)`
 * - Token detection based on `[A-Za-z0-9._\-/]`
 * - Hook that tracks visible suggestions + selected index + key handling
 *
 * NOTE: UI integration (popover/ghost text) is handled in Task 26.4.
 */

const DEFAULT_LIMIT = 6;
const DEFAULT_MIN_CHARS = 3;

const isAllowedTokenChar = (ch: string): boolean => /[A-Za-z0-9._\-/]/.test(ch);

export type TokenInfo = Readonly<{
  token: string;
  start: number;
  end: number; // end is the cursor index used to compute the token
}>;

/**
 * Returns the current token immediately before the cursor.
 *
 * Per spec, token boundaries are characters outside `[A-Za-z0-9._\-/]`.
 * We only consider the run before the cursor (end = cursor), because Tab
 * acceptance should not unexpectedly overwrite characters after the caret.
 */
export const getTokenBeforeCursor = (value: string, cursor: number): TokenInfo => {
  const end = Math.max(0, Math.min(cursor, value.length));
  let start = end;

  while (start > 0 && isAllowedTokenChar(value[start - 1])) {
    start -= 1;
  }

  return {
    token: value.slice(start, end),
    start,
    end,
  };
};

export type Suggestion = Readonly<{
  value: string;
  valueLower: string;
}>;

/**
 * Get suggestions from a dictionary, ordered for predictability.
 *
 * Ordering rules (Task 26.1):
 * - Prefix matches first
 * - Stable ordering, alphabetical tie-breaker
 */
export const getSuggestions = (
  prefix: string,
  dictionary: readonly string[],
  limit = DEFAULT_LIMIT
): string[] => {
  const trimmed = prefix.trim();
  if (!trimmed) return [];

  const p = trimmed.toLowerCase();

  const scored: { token: string; lower: string; group: 0 | 1 }[] = [];

  for (const token of dictionary) {
    if (!token) continue;
    const lower = token.toLowerCase();

    if (lower.startsWith(p)) {
      scored.push({ token, lower, group: 0 });
    } else if (lower.includes(p)) {
      // Keep non-prefix matches after prefix matches.
      scored.push({ token, lower, group: 1 });
    }
  }

  scored.sort((a, b) => {
    if (a.group !== b.group) return a.group - b.group;
    return a.lower.localeCompare(b.lower);
  });

  const out: string[] = [];
  const seen = new Set<string>();

  for (const { token, lower } of scored) {
    // Ensure uniqueness in case dictionary contains dupes.
    if (seen.has(lower)) continue;
    seen.add(lower);
    out.push(token);
    if (out.length >= limit) break;
  }

  return out;
};

export type AutocompleteState = Readonly<{
  token: TokenInfo;
  suggestions: readonly string[];
  isOpen: boolean;
  selectedIndex: number;
}>;

export type AcceptResult = Readonly<{
  nextValue: string;
  nextCursor: number;
  accepted: string;
}>;

export type UseAutocompleteOptions = Readonly<{
  value: string;
  cursor: number;
  dictionary: readonly string[];
  enabled?: boolean;
  limit?: number;
  minChars?: number;
}>;

/**
 * UI-agnostic state machine for tab-autocomplete.
 *
 * The caller owns:
 * - The input element and its value
 * - Writing the accepted value back to state
 * - Rendering a suggestion UI (optional)
 */
export const useAutocomplete = ({
  value,
  cursor,
  dictionary,
  enabled = true,
  limit = DEFAULT_LIMIT,
  minChars = DEFAULT_MIN_CHARS,
}: UseAutocompleteOptions) => {
  const token = useMemo(() => getTokenBeforeCursor(value, cursor), [value, cursor]);

  const suggestions = useMemo(() => {
    if (!enabled) return [];
    const trimmed = token.token.trim();
    if (trimmed.length < minChars) return [];
    return getSuggestions(trimmed, dictionary, limit);
  }, [dictionary, enabled, limit, minChars, token.token]);

  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const lastTokenRef = useRef<string>('');

  // Open/close behavior tracks token + suggestions.
  useEffect(() => {
    if (!enabled) {
      setIsOpen(false);
      return;
    }

    const shouldOpen = suggestions.length > 0;
    setIsOpen(shouldOpen);

    if (token.token !== lastTokenRef.current) {
      lastTokenRef.current = token.token;
      setSelectedIndex(0);
    } else if (selectedIndex >= suggestions.length) {
      setSelectedIndex(0);
    }
  }, [enabled, selectedIndex, suggestions.length, token.token]);

  const dismiss = useCallback(() => {
    setIsOpen(false);
  }, []);

  const cycle = useCallback((direction: 1 | -1) => {
    setSelectedIndex((prev) => {
      if (suggestions.length === 0) return 0;
      const next = (prev + direction + suggestions.length) % suggestions.length;
      return next;
    });
  }, [suggestions.length]);

  const accept = useCallback((): AcceptResult | null => {
    if (!enabled) return null;
    if (!isOpen) return null;
    if (suggestions.length === 0) return null;

    const accepted = suggestions[Math.max(0, Math.min(selectedIndex, suggestions.length - 1))];

    const nextValue = `${value.slice(0, token.start)}${accepted}${value.slice(token.end)}`;
    const nextCursor = token.start + accepted.length;

    return { nextValue, nextCursor, accepted };
  }, [enabled, isOpen, selectedIndex, suggestions, token.end, token.start, value]);

  const handleKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLElement>): { handled: boolean; accept?: AcceptResult } => {
      if (!enabled) return { handled: false };

      // Highest precedence: Esc dismisses suggestion UI (without clearing input).
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        dismiss();
        return { handled: true };
      }

      // Tab/Shift+Tab cycles/accepts only when suggestion UI is visible.
      if (e.key === 'Tab' && isOpen) {
        e.preventDefault();
        if (e.shiftKey) {
          cycle(-1);
          return { handled: true };
        }

        const accepted = accept();
        return accepted ? { handled: true, accept: accepted } : { handled: true };
      }

      if (isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault();
        cycle(e.key === 'ArrowDown' ? 1 : -1);
        return { handled: true };
      }

      return { handled: false };
    },
    [accept, cycle, dismiss, enabled, isOpen]
  );

  const state: AutocompleteState = useMemo(
    () => ({
      token,
      suggestions,
      isOpen,
      selectedIndex,
    }),
    [isOpen, selectedIndex, suggestions, token]
  );

  return {
    state,
    dismiss,
    accept,
    handleKeyDown,
  };
};
