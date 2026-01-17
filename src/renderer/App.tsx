import React, { useRef, useCallback } from 'react';
import './styles/App.css';
import { useQueueData, useKeyboardShortcuts } from './hooks';
import { QuickCapture, QueueItemList } from './components';
import type { QuickCaptureRef } from './components/QuickCapture';

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

  // Ref to QuickCapture for programmatic focus
  const quickCaptureRef = useRef<QuickCaptureRef>(null);

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
        <h1 className="app-title">NeoQueue</h1>
        <p className="app-subtitle">// tracking discussion points</p>
      </header>
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
