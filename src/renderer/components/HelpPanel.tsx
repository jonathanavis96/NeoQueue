/**
 * HelpPanel - Minimal, dismissible onboarding/help modal.
 *
 * Goals:
 * - Show on first run (until dismissed)
 * - Allow manual open from header
 * - Keyboard accessible (Escape closes)
 */

import React, { useEffect, useRef } from 'react';
import './HelpPanel.css';

interface HelpPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onDismissForever: () => void;
}

export const HelpPanel: React.FC<HelpPanelProps> = ({
  isOpen,
  onClose,
  onDismissForever,
}) => {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Focus close button for keyboard users.
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="help-panel-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        // Only close on backdrop click (not on dialog content).
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="help-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-panel-title"
        aria-describedby="help-panel-desc"
      >
        <div className="help-panel-header">
          <h2 id="help-panel-title" className="help-panel-title">[ How to use NeoQueue ]</h2>
          <button
            ref={closeButtonRef}
            type="button"
            className="help-panel-close"
            onClick={onClose}
            aria-label="Close help"
          >
            ×
          </button>
        </div>

        <p id="help-panel-desc" className="help-panel-desc">
          Capture discussion points fast, add follow-ups, then mark items discussed.
        </p>

        <div className="help-panel-body">
          <h3 className="help-panel-section-title">Core flow</h3>
          <ul className="help-panel-list">
            <li><strong>Add item:</strong> type and press <kbd>Enter</kbd></li>
            <li><strong>Copy:</strong> click the copy button on an item</li>
            <li><strong>Follow-ups:</strong> expand an item and add a follow-up</li>
            <li><strong>Discussed:</strong> mark an item complete to move it to “Discussed”</li>
          </ul>

          <h3 className="help-panel-section-title">Keyboard shortcuts</h3>
          <ul className="help-panel-list">
            <li><kbd>Ctrl</kbd>+<kbd>N</kbd> Focus “New item” input</li>
            <li><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>N</kbd> Focus “New item” input (global)</li>
            <li><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Q</kbd> Toggle window (global)</li>
            <li><kbd>Esc</kbd> Clear input / close this panel</li>
          </ul>

          <div className="help-panel-actions">
            <button type="button" className="help-panel-secondary" onClick={onDismissForever}>
              Don’t show again
            </button>
            <button type="button" className="help-panel-primary" onClick={onClose}>
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
