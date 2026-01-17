/**
 * HelpPanel - Minimal, dismissible onboarding/help modal.
 *
 * Goals:
 * - Show on first run (until dismissed)
 * - Allow manual open from header
 * - Keyboard accessible (Escape closes)
 */

import React, { useEffect, useMemo, useRef } from 'react';
import './HelpPanel.css';

interface HelpPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onDismissForever: () => void;
  onExportJson: () => void;
  scanlinesEnabled: boolean;
  onToggleScanlines: (enabled: boolean) => void;
}

export const HelpPanel: React.FC<HelpPanelProps> = ({
  isOpen,
  onClose,
  onDismissForever,
  onExportJson,
  scanlinesEnabled,
  onToggleScanlines,
}) => {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const isMac = useMemo(() => {
    // In Electron/Chromium, navigator.platform is still commonly available.
    // Fallback to userAgent for environments where platform is missing.
    const platform = (navigator.platform || '').toLowerCase();
    if (platform.includes('mac')) return true;

    const ua = (navigator.userAgent || '').toLowerCase();
    return ua.includes('mac os');
  }, []);

  const keyLabel = useMemo(() => {
    return {
      ctrl: isMac ? 'Cmd' : 'Ctrl',
      shift: 'Shift',
      n: 'N',
      q: 'Q',
      esc: 'Esc',
      enter: 'Enter',
    };
  }, [isMac]);

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
            <li><strong>Add item:</strong> type and press <kbd>{keyLabel.enter}</kbd></li>
            <li><strong>Copy:</strong> click the copy button on an item</li>
            <li><strong>Follow-ups:</strong> expand an item and add a follow-up</li>
            <li><strong>Discussed:</strong> mark an item complete to move it to “Discussed”</li>
          </ul>

          <h3 className="help-panel-section-title">Keyboard shortcuts</h3>
          <ul className="help-panel-list">
            <li><kbd>{keyLabel.ctrl}</kbd>+<kbd>{keyLabel.n}</kbd> Focus “New item” input</li>
            <li>
              <kbd>{keyLabel.ctrl}</kbd>+<kbd>{keyLabel.shift}</kbd>+<kbd>{keyLabel.n}</kbd> Focus “New item” input (global)
            </li>
            <li>
              <kbd>{keyLabel.ctrl}</kbd>+<kbd>{keyLabel.shift}</kbd>+<kbd>{keyLabel.q}</kbd> Toggle window (global)
            </li>
            <li><kbd>{keyLabel.esc}</kbd> Clear input / close this panel</li>
          </ul>

          <h3 className="help-panel-section-title">System tray</h3>
          <ul className="help-panel-list">
            <li>NeoQueue keeps running in your system tray for quick access.</li>
            <li><strong>Double-click</strong> the tray icon to show NeoQueue.</li>
          </ul>

          <h3 className="help-panel-section-title">UI effects</h3>
          <div className="help-panel-effects">
            <label className="help-panel-toggle">
              <input
                type="checkbox"
                checked={scanlinesEnabled}
                onChange={(e) => onToggleScanlines(e.target.checked)}
              />
              <span>Scanlines / CRT overlay</span>
            </label>
            <p className="help-panel-effects-hint">
              Subtle overlay for Matrix vibes. Default is off.
            </p>
          </div>

          <div className="help-panel-actions">
            <button type="button" className="help-panel-secondary" onClick={onDismissForever}>
              Don’t show again
            </button>
            <button type="button" className="help-panel-secondary" onClick={onExportJson}>
              Export data (JSON)
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
