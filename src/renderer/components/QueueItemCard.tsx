/**
 * QueueItemCard - Individual item display with copy-to-clipboard functionality
 * and expandable follow-up threading
 */

import React, { useState, useCallback, useRef, useId } from 'react';
import { QueueItem } from '../../shared/types';
import { useAutocomplete, useUiEffects } from '../hooks';
import { experimentalFlags } from '../experimentalFlags';
import { AutocompletePopover } from './AutocompletePopover';
import './QueueItemCard.css';

interface QueueItemCardProps {
  item: QueueItem;
  /** Learned dictionary tokens for autocomplete (case-preserving). */
  dictionary: readonly string[];
  onToggleComplete: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddFollowUp: (itemId: string, text: string) => Promise<void>;
}

// Format relative time (e.g., "2 hours ago")
const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
};

export const QueueItemCard: React.FC<QueueItemCardProps> = ({
  item,
  dictionary,
  onToggleComplete,
  onDelete,
  onAddFollowUp,
}) => {
  const { triggerPulse } = useUiEffects();

  const [isCopied, setIsCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [followUpText, setFollowUpText] = useState('');
  const [followUpCursor, setFollowUpCursor] = useState(0);
  const [isAddingFollowUp, setIsAddingFollowUp] = useState(false);
  const followUpInputRef = useRef<HTMLInputElement>(null);

  const followUpPopoverId = useId();

  const { state: acState, handleKeyDown: handleAutocompleteKeyDown } = useAutocomplete({
    value: followUpText,
    cursor: followUpCursor,
    dictionary,
    enabled: experimentalFlags.autocomplete,
  });

  const activeDescendantId = acState.isOpen
    ? `${followUpPopoverId}-opt-${Math.max(0, Math.min(acState.selectedIndex, acState.suggestions.length - 1))}`
    : undefined;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(item.text);
      triggerPulse('copy');
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [item.text, triggerPulse]);

  const handleToggleComplete = useCallback(async () => {
    triggerPulse(item.isCompleted ? 'restore' : 'toggleComplete');
    await onToggleComplete(item.id);
  }, [item.id, item.isCompleted, onToggleComplete, triggerPulse]);

  const handleDelete = useCallback(async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await onDelete(item.id);
    } finally {
      setIsDeleting(false);
    }
  }, [item.id, onDelete, isDeleting]);

  const handleToggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const syncCursorFromDom = useCallback(() => {
    const el = followUpInputRef.current;
    if (!el) return;
    const next = el.selectionStart ?? el.value.length;
    setFollowUpCursor(next);
  }, []);

  const handleRightClick = useCallback(async (e: React.MouseEvent) => {
    // "Right-click copy + follow-up" ergonomics:
    // - Copy the item text
    // - Expand follow-ups
    // - Focus the follow-up input for immediate typing
    // Avoid hijacking context menus on interactive elements (buttons/inputs).
    const target = e.target as HTMLElement | null;
    if (target && target.closest('button, input, textarea, a')) return;

    e.preventDefault();

    await handleCopy();
    setIsExpanded(true);

    // Wait a tick so the input exists in the DOM.
    window.setTimeout(() => {
      followUpInputRef.current?.focus();
      syncCursorFromDom();
    }, 0);
  }, [handleCopy, syncCursorFromDom]);

  const handleFollowUpSubmit = useCallback(async () => {
    const trimmedText = followUpText.trim();
    if (!trimmedText || isAddingFollowUp) return;

    setIsAddingFollowUp(true);
    try {
      await onAddFollowUp(item.id, trimmedText);
      setFollowUpText('');
      setFollowUpCursor(0);
      // Focus back on input for quick consecutive adds
      followUpInputRef.current?.focus();
    } finally {
      setIsAddingFollowUp(false);
    }
  }, [item.id, followUpText, isAddingFollowUp, onAddFollowUp]);

  const handleFollowUpKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    const result = handleAutocompleteKeyDown(e);
    if (result.handled) {
      if (result.accept) {
        setFollowUpText(result.accept.nextValue);
        const accept = result.accept;
        window.requestAnimationFrame(() => {
          if (!followUpInputRef.current) return;
          followUpInputRef.current.setSelectionRange(accept.nextCursor, accept.nextCursor);
          setFollowUpCursor(accept.nextCursor);
        });
      }
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleFollowUpSubmit();
    } else if (e.key === 'Escape') {
      setFollowUpText('');
      followUpInputRef.current?.blur();
      // Keep cursor state consistent.
      window.requestAnimationFrame(syncCursorFromDom);
    }
  }, [handleAutocompleteKeyDown, handleFollowUpSubmit, syncCursorFromDom]);

  const hasFollowUps = item.followUps.length > 0;

  return (
    <div
      className={`queue-item-card ${item.isCompleted ? 'completed' : ''} ${isExpanded ? 'expanded' : ''}`}
      onContextMenu={handleRightClick}
      role="group"
      aria-label="Queue item"
      title="Right-click to copy and add a follow-up"
    >
      <div className="queue-item-main">
        <button
          className={`queue-item-checkbox ${item.isCompleted ? 'checked' : ''}`}
          onClick={handleToggleComplete}
          title={item.isCompleted ? 'Mark as active' : 'Mark as discussed'}
          aria-label={item.isCompleted ? 'Mark as active' : 'Mark as discussed'}
        >
          {item.isCompleted ? '[x]' : '[ ]'}
        </button>
        
        <div className="queue-item-content">
          <p className={`queue-item-text ${item.isCompleted ? 'completed' : ''}`}>
            {item.text}
          </p>
          <div className="queue-item-meta">
            <span className="queue-item-time">{formatRelativeTime(item.createdAt)}</span>
            {hasFollowUps && (
              <button
                className="queue-item-followups-btn"
                onClick={handleToggleExpand}
                aria-expanded={isExpanded}
                aria-label={`${item.followUps.length} follow-up${item.followUps.length !== 1 ? 's' : ''}, click to ${isExpanded ? 'collapse' : 'expand'}`}
              >
                {item.followUps.length} follow-up{item.followUps.length !== 1 ? 's' : ''} {isExpanded ? '▼' : '▶'}
              </button>
            )}
            {!hasFollowUps && (
              <button
                className="queue-item-add-followup-btn"
                onClick={handleToggleExpand}
                aria-label="Add follow-up"
              >
                [+ follow-up]
              </button>
            )}
          </div>
        </div>

        <div className="queue-item-actions">
          <button
            className={`queue-item-btn copy ${isCopied ? 'copied' : ''}`}
            onClick={handleCopy}
            title="Copy to clipboard"
            aria-label="Copy to clipboard"
          >
            {isCopied ? '[✓]' : '[⎘]'}
          </button>
          <button
            className="queue-item-btn delete"
            onClick={handleDelete}
            disabled={isDeleting}
            title="Delete item"
            aria-label="Delete item"
          >
            [×]
          </button>
        </div>
      </div>

      {/* Expandable follow-up section */}
      {isExpanded && (
        <div className="queue-item-followups-section">
          {/* Existing follow-ups */}
          {hasFollowUps && (
            <div className="follow-ups-list">
              {item.followUps.map((followUp) => (
                <div key={followUp.id} className="follow-up-item">
                  <span className="follow-up-prefix">└─</span>
                  <span className="follow-up-text">{followUp.text}</span>
                  <span className="follow-up-time">{formatRelativeTime(followUp.createdAt)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Add new follow-up input */}
          <div className="follow-up-input-container">
            <span className="follow-up-input-prefix">└─</span>
            <div className="follow-up-input-wrap">
              <input
                ref={followUpInputRef}
                type="text"
                className="follow-up-input"
                placeholder="Add follow-up note..."
                value={followUpText}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={acState.isOpen}
                onChange={(e) => {
                  setFollowUpText(e.target.value);
                  syncCursorFromDom();
                }}
                onKeyDown={handleFollowUpKeyDown}
                onSelect={syncCursorFromDom}
                onKeyUp={syncCursorFromDom}
                disabled={isAddingFollowUp}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
                aria-label="Add follow-up note"
                aria-controls={acState.isOpen ? followUpPopoverId : undefined}
                aria-activedescendant={activeDescendantId}
              />
              <AutocompletePopover
                id={followUpPopoverId}
                suggestions={acState.suggestions}
                selectedIndex={acState.selectedIndex}
                isOpen={acState.isOpen}
              />
            </div>
            <button
              className="follow-up-submit-btn"
              onClick={handleFollowUpSubmit}
              disabled={!followUpText.trim() || isAddingFollowUp}
              aria-label="Submit follow-up"
            >
              [+]
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
