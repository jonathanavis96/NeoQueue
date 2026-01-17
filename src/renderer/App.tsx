import React, { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import './styles/App.css';
import { useQueueData, useKeyboardShortcuts, useUiEffects } from './hooks';
import { QuickCapture, SearchBox, QueueItemList, HelpPanel } from './components';
import type { QuickCaptureRef } from './components/QuickCapture';
import type { SearchBoxRef } from './components/SearchBox';

const HELP_DISMISSED_KEY = 'neoqueue.help.dismissed';

const App: React.FC = () => {
  const { scanlinesEnabled, setScanlinesEnabled, pulseAction, triggerPulse } = useUiEffects();
  const {
    items,
    isLoading,
    error,
    addItem,
    toggleComplete,
    deleteItem,
    addFollowUp,
    exportJson,
    exportMarkdown,
    importJson,
    canUndo,
    undo,
  } = useQueueData();

  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Refs for programmatic focus
  const quickCaptureRef = useRef<QuickCaptureRef>(null);
  const searchRef = useRef<SearchBoxRef>(null);

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

  const handleFindShortcut = useCallback(() => {
    searchRef.current?.focus();
  }, []);

  const handleUndo = useCallback(async () => {
    if (!canUndo) return;
    triggerPulse('restore');
    await undo();
  }, [canUndo, triggerPulse, undo]);

  const handleEscape = useCallback(() => {
    // Prefer clearing search first (if active), otherwise no-op.
    if (searchQuery.trim().length > 0) {
      setSearchQuery('');
      searchRef.current?.focus();
    }
  }, [searchQuery]);

  // Handle keyboard shortcuts (global from main process + local)
  useKeyboardShortcuts({
    onNewItem: handleNewItemShortcut,
    onFind: handleFindShortcut,
    onEscape: handleEscape,
    onUndo: handleUndo,
  });

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredItems = useMemo(() => {
    if (!normalizedQuery) return items;

    return items.filter((item) => {
      const itemText = item.text.toLowerCase();
      if (itemText.includes(normalizedQuery)) return true;

      const followUpText = item.followUps
        .map((fu) => fu.text.toLowerCase())
        .join(' ');

      return followUpText.includes(normalizedQuery);
    });
  }, [items, normalizedQuery]);

  const hasActiveSearch = normalizedQuery.length > 0;

  const addItemWithFx = useCallback(async (text: string) => {
    triggerPulse('add');
    await addItem(text);
  }, [addItem, triggerPulse]);

  return (
    <div
      className={`app ${scanlinesEnabled ? 'scanlines-enabled' : ''} ${pulseAction ? 'fx-pulse' : ''}`}
      data-pulse-action={pulseAction || undefined}
      role="application"
      aria-label="NeoQueue - Discussion Tracker"
    >
      <header className="app-header">
        <div className="app-header-row">
          <div>
            <h1 className="app-title">NeoQueue</h1>
            <p className="app-subtitle">tracking discussion points</p>
          </div>
          <div className="app-header-actions">
            <SearchBox
              ref={searchRef}
              value={searchQuery}
              onChange={setSearchQuery}
              onClear={() => setSearchQuery('')}
              disabled={isLoading}
            />
            <button
              type="button"
              className="app-help-button"
              onClick={async () => {
                await handleUndo();
              }}
              aria-label="Undo last action"
              disabled={!canUndo}
              title="Undo (Ctrl/Cmd+Z)"
            >
              Undo
            </button>
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
        onExportJson={async () => {
          try {
            await exportJson();
          } catch (e) {
            // Keep the help panel open; surface error in app error box.
            // useQueueData already sets error on failure paths.
            // eslint-disable-next-line no-console
            console.error(e);
          }
        }}
        onExportMarkdown={async () => {
          try {
            await exportMarkdown();
          } catch (e) {
            // Keep the help panel open; surface error in app error box.
            // useQueueData already sets error on failure paths.
            // eslint-disable-next-line no-console
            console.error(e);
          }
        }}
        onImportJson={async () => {
          try {
            await importJson();
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error(e);
          }
        }}
        scanlinesEnabled={scanlinesEnabled}
        onToggleScanlines={setScanlinesEnabled}
      />

      <main className="app-main" role="main">
        <QuickCapture ref={quickCaptureRef} onAdd={addItemWithFx} disabled={isLoading} />
        
        {error && (
          <div className="app-error">
            <span className="error-prefix">[ERROR]</span> {error}
          </div>
        )}
        
        <QueueItemList
          items={filteredItems}
          hasUnfilteredItems={items.length > 0}
          hasActiveSearch={hasActiveSearch}
          onToggleComplete={toggleComplete}
          onDelete={deleteItem}
          onAddFollowUp={addFollowUp}
          isLoading={isLoading}
        />
      </main>
      
      {/* Keyboard shortcuts hint */}
      <div className="app-shortcuts-hint" aria-hidden="true">
        <kbd>Ctrl</kbd>+<kbd>Z</kbd> Undo &nbsp;|&nbsp;
        <kbd>Ctrl</kbd>+<kbd>N</kbd> New item &nbsp;|&nbsp;
        <kbd>Ctrl</kbd>+<kbd>F</kbd> Search &nbsp;|&nbsp;
        <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Q</kbd> Toggle window
      </div>
    </div>
  );
};

export default App;
