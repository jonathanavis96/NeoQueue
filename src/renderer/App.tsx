import React, { useRef, useCallback, useEffect, useState } from 'react';
import './styles/App.css';
import { useQueueData, useKeyboardShortcuts } from './hooks';
import { QuickCapture, QueueItemList, HelpPanel } from './components';
import type { QuickCaptureRef } from './components/QuickCapture';

const HELP_DISMISSED_KEY = 'neoqueue.help.dismissed';

const App: React.FC = () => {
  const {
    items,
    isLoading,
    error,
    addItem,
    toggleComplete,
    deleteItem,
    addFollowUp,
  } = useQueueData();

  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Ref to QuickCapture for programmatic focus
  const quickCaptureRef = useRef<QuickCaptureRef>(null);

  // First-run onboarding/help
  useEffect(() => {
    try {
      const dismissed = window.localStorage.getItem(HELP_DISMISSED_KEY) === 'true';
      if (!dismissed) setIsHelpOpen(true);
    } catch {
      // If localStorage is unavailable, fail open (help is safe).
      setIsHelpOpen(true);
    }
  }, []);

  // Handler for new item shortcut - focus the input
  const handleNewItemShortcut = useCallback(() => {
    quickCaptureRef.current?.focus();
  }, []);

  // Handle keyboard shortcuts (global from main process + local)
  useKeyboardShortcuts({
    onNewItem: handleNewItemShortcut,
  });

  return (
    <div className="app" role="application" aria-label="NeoQueue - Discussion Tracker">
      <header className="app-header">
        <div className="app-header-row">
          <div>
            <h1 className="app-title">NeoQueue</h1>
            <p className="app-subtitle">tracking discussion points</p>
          </div>
          <div className="app-header-actions">
            <button
              type="button"
              className="app-help-button"
              onClick={() => setIsHelpOpen(true)}
              aria-label="Open help"
            >
              Help
            </button>
          </div>
        </div>
      </header>

      <HelpPanel
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        onDismissForever={() => {
          try {
            window.localStorage.setItem(HELP_DISMISSED_KEY, 'true');
          } catch {
            // ignore
          }
          setIsHelpOpen(false);
        }}
      />

      <main className="app-main" role="main">
        <QuickCapture ref={quickCaptureRef} onAdd={addItem} disabled={isLoading} />
        
        {error && (
          <div className="app-error">
            <span className="error-prefix">[ERROR]</span> {error}
          </div>
        )}
        
        <QueueItemList
          items={items}
          onToggleComplete={toggleComplete}
          onDelete={deleteItem}
          onAddFollowUp={addFollowUp}
          isLoading={isLoading}
        />
      </main>
      
      {/* Keyboard shortcuts hint */}
      <div className="app-shortcuts-hint" aria-hidden="true">
        <kbd>Ctrl</kbd>+<kbd>N</kbd> New item &nbsp;|&nbsp;
        <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Q</kbd> Toggle window
      </div>
    </div>
  );
};

export default App;
