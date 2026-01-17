/**
 * QuickCapture - Friction-free input component for adding new items
 * Always visible at top, type + Enter to add
 * Supports ref forwarding for programmatic focus via keyboard shortcuts
 */

import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useId,
} from 'react';
import { useAutocomplete, useExperimentalFlags } from '../hooks';
import { AutocompletePopover } from './AutocompletePopover';
import './QuickCapture.css';

interface QuickCaptureProps {
  onAdd: (text: string) => Promise<void>;
  dictionary: readonly string[];
  disabled?: boolean;
}

// Expose focus method to parent components
export interface QuickCaptureRef {
  focus: () => void;
}

export const QuickCapture = forwardRef<QuickCaptureRef, QuickCaptureProps>(({ onAdd, dictionary, disabled = false }, ref) => {
  const [text, setText] = useState('');
  const [cursor, setCursor] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const popoverId = useId();

  const { flags: experimentalFlags } = useExperimentalFlags();

  const { state: acState, handleKeyDown: handleAutocompleteKeyDown } = useAutocomplete({
    value: text,
    cursor,
    dictionary,
    enabled: experimentalFlags.autocomplete,
  });

  const activeDescendantId = acState.isOpen
    ? `${popoverId}-opt-${Math.max(0, Math.min(acState.selectedIndex, acState.suggestions.length - 1))}`
    : undefined;

  // Expose focus method via ref
  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
      inputRef.current?.select();
    },
  }), []);

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedText = text.trim();
    if (!trimmedText || isSubmitting || disabled) return;

    setIsSubmitting(true);
    try {
      await onAdd(trimmedText);
      setText('');
    } finally {
      setIsSubmitting(false);
      inputRef.current?.focus();
    }
  }, [text, onAdd, isSubmitting, disabled]);

  const syncCursorFromDom = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const next = el.selectionStart ?? el.value.length;
    setCursor(next);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    const result = handleAutocompleteKeyDown(e);
    if (result.handled) {
      if (result.accept) {
        setText(result.accept.nextValue);
        const accept = result.accept;
        window.requestAnimationFrame(() => {
          if (!inputRef.current) return;
          inputRef.current.setSelectionRange(accept.nextCursor, accept.nextCursor);
          setCursor(accept.nextCursor);
        });
      }
      return;
    }

    // Escape clears the input (when autocomplete isn't currently open)
    if (e.key === 'Escape') {
      setText('');
      window.requestAnimationFrame(() => {
        inputRef.current?.focus();
        syncCursorFromDom();
      });
    }
  }, [handleAutocompleteKeyDown, syncCursorFromDom]);

  return (
    <form className="quick-capture" onSubmit={handleSubmit} role="search" aria-label="Add new discussion item">
      <span className="quick-capture-prompt" aria-hidden="true">&gt;</span>
      <div className="quick-capture-input-wrap">
        <input
          ref={inputRef}
          type="text"
          className="quick-capture-input"
          value={text}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={acState.isOpen}
          onChange={(e) => {
            setText(e.target.value);
            syncCursorFromDom();
          }}
          onKeyDown={handleKeyDown}
          onSelect={syncCursorFromDom}
          onKeyUp={syncCursorFromDom}
          placeholder="Type a discussion point and press Enter..."
          disabled={isSubmitting || disabled}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          autoFocus
          aria-label="New discussion item"
          aria-describedby="quick-capture-hint"
          aria-controls={acState.isOpen ? popoverId : undefined}
          aria-activedescendant={activeDescendantId}
        />
        <AutocompletePopover
          id={popoverId}
          suggestions={acState.suggestions}
          selectedIndex={acState.selectedIndex}
          isOpen={acState.isOpen}
        />
      </div>
      <span className={`quick-capture-cursor ${text ? 'active' : ''}`} aria-hidden="true">_</span>
      <span id="quick-capture-hint" className="visually-hidden">
        Press Enter to add, Escape to clear. Use Ctrl/Cmd+N to focus this input.
      </span>
    </form>
  );
});

// Display name for debugging
QuickCapture.displayName = 'QuickCapture';
