/**
 * QuickCapture - Friction-free input component for adding new items
 * Always visible at top, type + Enter to add
 * Supports ref forwarding for programmatic focus via keyboard shortcuts
 */

import React, { useState, useCallback, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import './QuickCapture.css';

interface QuickCaptureProps {
  onAdd: (text: string) => Promise<void>;
  disabled?: boolean;
}

// Expose focus method to parent components
export interface QuickCaptureRef {
  focus: () => void;
}

export const QuickCapture = forwardRef<QuickCaptureRef, QuickCaptureProps>(({ onAdd, disabled = false }, ref) => {
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Escape clears the input
    if (e.key === 'Escape') {
      setText('');
      inputRef.current?.focus();
    }
  }, []);

  return (
    <form className="quick-capture" onSubmit={handleSubmit} role="search" aria-label="Add new discussion item">
      <span className="quick-capture-prompt" aria-hidden="true">&gt;</span>
      <input
        ref={inputRef}
        type="text"
        className="quick-capture-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a discussion point and press Enter..."
        disabled={isSubmitting || disabled}
        autoFocus
        aria-label="New discussion item"
        aria-describedby="quick-capture-hint"
      />
      <span className={`quick-capture-cursor ${text ? 'active' : ''}`} aria-hidden="true">_</span>
      <span id="quick-capture-hint" className="visually-hidden">
        Press Enter to add, Escape to clear. Use Ctrl/Cmd+N to focus this input.
      </span>
    </form>
  );
});

// Display name for debugging
QuickCapture.displayName = 'QuickCapture';
