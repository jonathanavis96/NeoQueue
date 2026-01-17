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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      textareaRef.current?.focus();
      textareaRef.current?.select();
    },
  }), []);

  // Auto-focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    const trimmedText = text.trim();
    if (!trimmedText || isSubmitting || disabled) return;

    setIsSubmitting(true);
    try {
      await onAdd(trimmedText);
      setText('');
    } finally {
      setIsSubmitting(false);
      textareaRef.current?.focus();
    }
  }, [text, onAdd, isSubmitting, disabled]);

  const syncCursorFromDom = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    const next = el.selectionStart ?? el.value.length;
    setCursor(next);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const result = handleAutocompleteKeyDown(e);
    if (result.handled) {
      if (result.accept) {
        setText(result.accept.nextValue);
        const accept = result.accept;
        window.requestAnimationFrame(() => {
          if (!textareaRef.current) return;
          textareaRef.current.setSelectionRange(accept.nextCursor, accept.nextCursor);
          setCursor(accept.nextCursor);
        });
      }
      return;
    }

    // Cmd/Ctrl+Enter to submit
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
      return;
    }

    // Escape clears the input (when autocomplete isn't currently open)
    if (e.key === 'Escape') {
      setText('');
      window.requestAnimationFrame(() => {
        textareaRef.current?.focus();
        syncCursorFromDom();
      });
    }
  }, [handleAutocompleteKeyDown, handleSubmit, syncCursorFromDom]);

  // Click anywhere in the container to focus the textarea
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    // Don't steal focus if clicking on the textarea itself
    if (e.target === textareaRef.current) return;
    textareaRef.current?.focus();
  }, []);

  return (
    <div 
      className="quick-capture" 
      onClick={handleContainerClick}
      role="search" 
      aria-label="Add new discussion item"
    >
      <span className="quick-capture-prompt" aria-hidden="true">&gt;</span>
      <div className="quick-capture-input-wrap">
        <textarea
          ref={textareaRef}
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
          placeholder="Type a discussion point... (Ctrl/Cmd+Enter to add)"
          disabled={isSubmitting || disabled}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          autoFocus
          rows={4}
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
      <span id="quick-capture-hint" className="visually-hidden">
        Press Ctrl/Cmd+Enter to add, Escape to clear. Use Ctrl/Cmd+N to focus this input.
      </span>
    </div>
  );
});

// Display name for debugging
QuickCapture.displayName = 'QuickCapture';
