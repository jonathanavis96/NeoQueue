/**
 * QueueItemCard - Individual item display with copy-to-clipboard functionality
 * and expandable follow-up threading
 */

import React, { useEffect, useState, useCallback, useRef, useId } from 'react';
import { QueueItem } from '../../shared/types';
import { useAutocomplete, useUiEffects, useExperimentalFlags } from '../hooks';
import { AutocompletePopover } from './AutocompletePopover';
import './QueueItemCard.css';

interface QueueItemCardProps {
  item: QueueItem;
  /** Learned dictionary tokens for autocomplete (case-preserving). */
  dictionary: readonly string[];
  onToggleComplete: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddFollowUp: (itemId: string, text: string) => Promise<void>;
  onUpdateItem: (id: string, updates: Partial<QueueItem>) => Promise<void>;
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
  onUpdateItem,
}) => {
  const { triggerPulse } = useUiEffects();

  const [isCopied, setIsCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [draftText, setDraftText] = useState(item.text);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  const [followUpText, setFollowUpText] = useState('');
  const [followUpCursor, setFollowUpCursor] = useState(0);
  const [isAddingFollowUp, setIsAddingFollowUp] = useState(false);
  const [copiedFollowUpId, setCopiedFollowUpId] = useState<string | null>(null);
  const [editingFollowUpId, setEditingFollowUpId] = useState<string | null>(null);
  const [editingFollowUpText, setEditingFollowUpText] = useState('');
  const followUpInputRef = useRef<HTMLInputElement>(null);
  const editFollowUpInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing) return;
    setDraftText(item.text);
  }, [isEditing, item.text]);

  useEffect(() => {
    if (!isEditing) return;

    window.setTimeout(() => {
      const el = editInputRef.current;
      if (el) {
        el.focus();
        // Place cursor at end instead of selecting all text
        const len = el.value.length;
        el.setSelectionRange(len, len);
      }
    }, 0);
  }, [isEditing]);

  const followUpPopoverId = useId();

  const { flags: experimentalFlags } = useExperimentalFlags();

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
      // Copy only the main item text
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

  const exitEditMode = useCallback(() => {
    setIsEditing(false);
    setDraftText(item.text);
    setIsSavingEdit(false);
  }, [item.text]);

  const commitEdit = useCallback(async () => {
    if (isSavingEdit) return;

    const trimmed = draftText.trim();
    // Safety: never allow empty item text.
    if (!trimmed) {
      exitEditMode();
      return;
    }

    // No-op if unchanged.
    if (trimmed === item.text) {
      setIsEditing(false);
      return;
    }

    setIsSavingEdit(true);
    try {
      triggerPulse('other');
      await onUpdateItem(item.id, { text: trimmed });
      setIsEditing(false);
    } finally {
      setIsSavingEdit(false);
    }
  }, [draftText, exitEditMode, isSavingEdit, item.id, item.text, onUpdateItem, triggerPulse]);

  const handleStartEdit = useCallback(() => {
    if (item.isCompleted) {
      // Keep discussed items inert by default.
      return;
    }
    setIsEditing(true);
  }, [item.isCompleted]);

  const handleEditKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd+Enter to save, Escape to cancel
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void commitEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      exitEditMode();
    }
    // Regular Enter allows new lines
  }, [commitEdit, exitEditMode]);

  const syncCursorFromDom = useCallback(() => {
    const el = followUpInputRef.current;
    if (!el) return;
    const next = el.selectionStart ?? el.value.length;
    setFollowUpCursor(next);
  }, []);

  const handleCopyFollowUp = useCallback(async (followUpId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      triggerPulse('copy');
      setCopiedFollowUpId(followUpId);
      setTimeout(() => setCopiedFollowUpId(null), 1500);
    } catch (err) {
      console.error('Failed to copy follow-up:', err);
    }
  }, [triggerPulse]);

  const handleRightClick = useCallback((e: React.MouseEvent) => {
    // "Right-click copy + follow-up" ergonomics:
    // - Copy the item text
    // - Expand follow-ups
    // - Focus the follow-up input for immediate typing
    // Avoid hijacking context menus on interactive elements (buttons/inputs).
    const target = e.target as HTMLElement | null;
    if (target && target.closest('button, input, textarea, a, .follow-up-item')) return;

    // Prevent default context menu immediately
    e.preventDefault();
    e.stopPropagation();
    
    // Prevent any native context menu from appearing
    if (e.nativeEvent) {
      e.nativeEvent.preventDefault?.();
      e.nativeEvent.stopPropagation?.();
      e.nativeEvent.stopImmediatePropagation?.();
    }

    // Copy and expand without animation frame to reduce flicker
    handleCopy();
    setIsExpanded(true);

    // Wait a tick so the input exists in the DOM.
    window.setTimeout(() => {
      followUpInputRef.current?.focus();
      syncCursorFromDom();
    }, 50);
  }, [handleCopy, syncCursorFromDom]);

  const handleFollowUpRightClick = useCallback((e: React.MouseEvent, followUpId: string, text: string) => {
    e.preventDefault();
    e.stopPropagation();
    handleCopyFollowUp(followUpId, text);
  }, [handleCopyFollowUp]);

  // Start editing a follow-up note
  const handleStartEditFollowUp = useCallback((followUpId: string, text: string) => {
    setEditingFollowUpId(followUpId);
    setEditingFollowUpText(text);
    // Focus the input after render, cursor at end
    window.setTimeout(() => {
      const el = editFollowUpInputRef.current;
      if (el) {
        el.focus();
        const len = el.value.length;
        el.setSelectionRange(len, len);
      }
    }, 0);
  }, []);

  // Cancel editing a follow-up
  const handleCancelEditFollowUp = useCallback(() => {
    setEditingFollowUpId(null);
    setEditingFollowUpText('');
  }, []);

  // Save edited follow-up
  const handleSaveEditFollowUp = useCallback(async () => {
    if (!editingFollowUpId) return;
    
    const trimmed = editingFollowUpText.trim();
    if (!trimmed) {
      handleCancelEditFollowUp();
      return;
    }

    // Find the original follow-up to check if changed
    const originalFollowUp = item.followUps.find(fu => fu.id === editingFollowUpId);
    if (originalFollowUp && trimmed === originalFollowUp.text) {
      handleCancelEditFollowUp();
      return;
    }

    // Update the follow-ups array with the edited text
    const updatedFollowUps = item.followUps.map(fu => 
      fu.id === editingFollowUpId ? { ...fu, text: trimmed } : fu
    );

    try {
      triggerPulse('other');
      await onUpdateItem(item.id, { followUps: updatedFollowUps });
      handleCancelEditFollowUp();
    } catch (err) {
      console.error('Failed to update follow-up:', err);
    }
  }, [editingFollowUpId, editingFollowUpText, item.followUps, item.id, onUpdateItem, triggerPulse, handleCancelEditFollowUp]);

  const handleEditFollowUpKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void handleSaveEditFollowUp();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEditFollowUp();
    }
  }, [handleSaveEditFollowUp, handleCancelEditFollowUp]);

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
      const useCtrlEnter = e.ctrlKey || e.metaKey;
      handleFollowUpSubmit();
      
      // If Ctrl+Enter was used, focus the main QuickCapture input instead
      if (useCtrlEnter) {
        window.requestAnimationFrame(() => {
          const mainInput = document.querySelector<HTMLInputElement>('.quick-capture-input');
          mainInput?.focus();
        });
      }
    } else if (e.key === 'Escape') {
      setFollowUpText('');
      followUpInputRef.current?.blur();
      // Keep cursor state consistent.
      window.requestAnimationFrame(syncCursorFromDom);
    }
  }, [handleAutocompleteKeyDown, handleFollowUpSubmit, syncCursorFromDom]);

  const hasFollowUps = item.followUps.length > 0;

  // Handle left-click on the card to expand if it has follow-ups
  const handleCardClick = useCallback((e: React.MouseEvent) => {
    // Don't expand if clicking on interactive elements, text (for double-click edit), or follow-ups section
    const target = e.target as HTMLElement | null;
    if (target && target.closest('button, input, textarea, a, .queue-item-actions, .queue-item-followups-section, .queue-item-text')) return;
    
    // Only expand/collapse if there are follow-ups
    if (hasFollowUps) {
      setIsExpanded((prev) => !prev);
    }
  }, [hasFollowUps]);

  return (
    <div
      className={`queue-item-card ${item.isCompleted ? 'completed' : ''} ${isExpanded ? 'expanded' : ''} ${hasFollowUps ? 'has-followups' : ''}`}
      onContextMenu={handleRightClick}
      onClick={handleCardClick}
      onMouseDown={(e) => {
        // Blur any focused element (like edit textareas in other cards) when clicking this card
        const target = e.target as HTMLElement;
        if (!target.closest('textarea, input')) {
          (document.activeElement as HTMLElement)?.blur?.();
        }
      }}
      role="group"
      aria-label="Queue item"
      title={hasFollowUps ? "Click to expand/collapse notes, right-click to copy" : "Right-click to copy and add a note"}
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
          {isEditing ? (
            <textarea
              ref={editInputRef}
              className="queue-item-edit"
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              onKeyDown={handleEditKeyDown}
              onBlur={() => {
                // Keep this minimal and predictable: blur commits if changed, otherwise cancels.
                void commitEdit();
              }}
              disabled={isSavingEdit}
              aria-label="Edit queue item (Ctrl+Enter to save, Escape to cancel)"
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              rows={Math.max(3, draftText.split('\n').length)}
            />
          ) : (
            <p
              className={`queue-item-text ${item.isCompleted ? 'completed' : ''}`}
              onDoubleClick={handleStartEdit}
              title={item.isCompleted ? undefined : 'Double-click to edit'}
            >
              {item.text}
            </p>
          )}
          <div className="queue-item-meta">
            <span className="queue-item-time">{formatRelativeTime(item.createdAt)}</span>
            {hasFollowUps && (
              <button
                className="queue-item-followups-btn"
                onClick={handleToggleExpand}
                aria-expanded={isExpanded}
                aria-label={`${item.followUps.length} note${item.followUps.length !== 1 ? 's' : ''}, click to ${isExpanded ? 'collapse' : 'expand'}`}
              >
                {item.followUps.length} note{item.followUps.length !== 1 ? 's' : ''} {isExpanded ? '▼' : '▶'}
              </button>
            )}
            {!hasFollowUps && (
              <button
                className="queue-item-add-followup-btn"
                onClick={handleToggleExpand}
                aria-label="Add note"
              >
                [+ note]
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
                <div 
                  key={followUp.id} 
                  className={`follow-up-item ${copiedFollowUpId === followUp.id ? 'copied' : ''} ${editingFollowUpId === followUp.id ? 'editing' : ''}`}
                  onContextMenu={(e) => handleFollowUpRightClick(e, followUp.id, followUp.text)}
                  onDoubleClick={() => handleStartEditFollowUp(followUp.id, followUp.text)}
                  title="Double-click to edit, right-click to copy"
                >
                  <span className="follow-up-prefix">└─</span>
                  {editingFollowUpId === followUp.id ? (
                    <textarea
                      ref={editFollowUpInputRef}
                      className="follow-up-edit"
                      value={editingFollowUpText}
                      onChange={(e) => setEditingFollowUpText(e.target.value)}
                      onKeyDown={handleEditFollowUpKeyDown}
                      onBlur={() => handleSaveEditFollowUp()}
                      rows={Math.max(2, editingFollowUpText.split('\n').length)}
                      spellCheck={false}
                      autoCorrect="off"
                      autoCapitalize="off"
                      aria-label="Edit note (Ctrl+Enter to save, Escape to cancel)"
                    />
                  ) : (
                    <>
                      <span className="follow-up-text">{followUp.text}</span>
                      <span className="follow-up-time">{formatRelativeTime(followUp.createdAt)}</span>
                      <span className="follow-up-copy-indicator">{copiedFollowUpId === followUp.id ? '[✓]' : '[⎘]'}</span>
                      <button
                        type="button"
                        className="follow-up-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          const newFollowUps = item.followUps.filter(fu => fu.id !== followUp.id);
                          void onUpdateItem(item.id, { followUps: newFollowUps });
                        }}
                        title="Delete note"
                      >
                        [✕]
                      </button>
                    </>
                  )}
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
                placeholder="Add note..."
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
                aria-label="Add note"
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
              aria-label="Submit note"
            >
              [+]
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
