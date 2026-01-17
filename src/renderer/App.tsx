import React, { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import './styles/App.css';
import { useQueueData, useKeyboardShortcuts, useUiEffects, useExperimentalFlags } from './hooks';
import { QuickCapture, SearchBox, QueueItemList, HelpPanel, CanvasView } from './components';
import type { QuickCaptureRef } from './components/QuickCapture';
import type { SearchBoxRef } from './components/SearchBox';
import type { CanvasViewRef } from './components/CanvasView';

const HELP_DISMISSED_KEY = 'neoqueue.help.dismissed';

const App: React.FC = () => {
  const { scanlinesEnabled, setScanlinesEnabled, pulseAction, triggerPulse } = useUiEffects();
  const {
    items,
    dictionaryTokens,
    isLoading,
    error,
    addItem,
    toggleComplete,
    deleteItem,
    addFollowUp,
    updateItem,
    canvasPositions,
    setCanvasPosition,
    exportJson,
    exportMarkdown,
    exportJsonScoped,
    exportMarkdownScoped,
    exportJsonScopedDateRange,
    exportMarkdownScopedDateRange,
    importJson,
    canUndo,
    undo,
  } = useQueueData();

  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'queue' | 'discussed'>('queue');

  const { flags: experimentalFlags, setFlag: setExperimentalFlag } = useExperimentalFlags();

  const [activeView, setActiveView] = useState<'list' | 'canvas'>(() => (experimentalFlags.canvas ? 'canvas' : 'list'));

  // If Canvas is turned off while the user is on it, bounce back to list.
  useEffect(() => {
    if (!experimentalFlags.canvas && activeView === 'canvas') {
      setActiveView('list');
    }
  }, [activeView, experimentalFlags.canvas]);

  const [isStartupBannerVisible, setIsStartupBannerVisible] = useState(false);
  const [startupBannerText, setStartupBannerText] = useState('');

  // Refs for programmatic focus
  const quickCaptureRef = useRef<QuickCaptureRef>(null);
  const canvasRef = useRef<CanvasViewRef>(null);
  const searchRef = useRef<SearchBoxRef>(null);
  const hasShownStartupBannerRef = useRef(false);

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

  // Sync "Always on top" state from the main process (single source of truth).
  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (!window.electronAPI?.getAlwaysOnTop) return;

      try {
        const enabled = await window.electronAPI.getAlwaysOnTop();
        if (isMounted) setIsAlwaysOnTop(Boolean(enabled));
      } catch {
        // If unavailable (e.g., during web-only rendering), leave default.
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  // Lightweight startup notification banner (in-app)
  useEffect(() => {
    if (isLoading) return;
    if (hasShownStartupBannerRef.current) return;

    const activeCount = items.reduce((acc, item) => (item.isCompleted ? acc : acc + 1), 0);
    const discussedCount = items.length - activeCount;

    // Show only when there is at least 1 active item.
    if (activeCount <= 0) {
      hasShownStartupBannerRef.current = true;
      return;
    }

    const itemWord = activeCount === 1 ? 'item' : 'items';
    const discussedSuffix = discussedCount > 0 ? ` / ${discussedCount} Discussed` : '';
    setStartupBannerText(`[ ${activeCount} ${itemWord} in your Queue${discussedSuffix} ]`);
    setIsStartupBannerVisible(true);
    hasShownStartupBannerRef.current = true;

    const timeoutId = window.setTimeout(() => {
      setIsStartupBannerVisible(false);
    }, 4500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isLoading, items]);

  // Handler for new item shortcut - focus the input
  const handleNewItemShortcut = useCallback(() => {
    if (activeView === 'canvas') {
      canvasRef.current?.openNewItemAtCenter();
      return;
    }
    quickCaptureRef.current?.focus();
  }, [activeView]);

  const handleFindShortcut = useCallback(() => {
    // Search only applies to list mode.
    if (activeView === 'canvas') return;
    searchRef.current?.focus();
  }, [activeView]);

  const handleUndo = useCallback(async () => {
    if (!canUndo) return;
    triggerPulse('restore');
    await undo();
  }, [canUndo, triggerPulse, undo]);

  const handleEscape = useCallback(() => {
    // Search only exists in list mode.
    if (activeView === 'canvas') return;

    // Prefer clearing search first (if active), otherwise no-op.
    if (searchQuery.trim().length > 0) {
      setSearchQuery('');
      searchRef.current?.focus();
    }
  }, [activeView, searchQuery]);

  const handleTabChange = useCallback((tab: 'queue' | 'discussed') => {
    // THOUGHTS.md: search persists within a tab and clears on tab switch.
    // In practice: switching Queue/Discussed clears the global search query.
    if (tab !== activeTab) {
      setSearchQuery('');
    }
    setActiveTab(tab);
  }, [activeTab]);

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

      if (followUpText.includes(normalizedQuery)) return true;

      // Include timestamps in search matches (THOUGHTS.md)
      const timestampText = [
        item.createdAt?.toISOString(),
        item.completedAt?.toISOString(),
        ...item.followUps.map((fu) => fu.createdAt?.toISOString()),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return timestampText.includes(normalizedQuery);
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
            {experimentalFlags.canvas && (
              <div className="app-view-toggle" role="group" aria-label="View">
                <button
                  type="button"
                  className={`app-view-toggle-btn ${activeView === 'list' ? 'active' : ''}`}
                  onClick={() => setActiveView('list')}
                  aria-pressed={activeView === 'list'}
                >
                  List
                </button>
                <button
                  type="button"
                  className={`app-view-toggle-btn ${activeView === 'canvas' ? 'active' : ''}`}
                  onClick={() => setActiveView('canvas')}
                  aria-pressed={activeView === 'canvas'}
                >
                  Canvas
                </button>
              </div>
            )}
            {activeView === 'list' && (
              <SearchBox
                ref={searchRef}
                value={searchQuery}
                onChange={setSearchQuery}
                onClear={() => setSearchQuery('')}
                disabled={isLoading}
              />
            )}
            <button
              type="button"
              className={`app-help-button app-pin-button ${isAlwaysOnTop ? 'is-pinned' : ''}`}
              onClick={async () => {
                if (!window.electronAPI?.setAlwaysOnTop) return;

                try {
                  const next = !isAlwaysOnTop;
                  const res = await window.electronAPI.setAlwaysOnTop(next);
                  if (res?.success) setIsAlwaysOnTop(Boolean(res.enabled));
                } catch {
                  // No-op; keep existing state.
                }
              }}
              aria-label={isAlwaysOnTop ? 'Disable always-on-top' : 'Enable always-on-top'}
              title={isAlwaysOnTop ? 'Always on top: ON' : 'Always on top: OFF'}
            >
              <span className="app-pin-glyph" aria-hidden="true">{isAlwaysOnTop ? 'PIN' : 'TOP'}</span>
            </button>
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
        onExportActiveJson={async () => {
          try {
            await exportJsonScoped('active');
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error(e);
          }
        }}
        onExportDiscussedJson={async () => {
          try {
            await exportJsonScoped('discussed');
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error(e);
          }
        }}
        onExportActiveMarkdown={async () => {
          try {
            await exportMarkdownScoped('active');
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error(e);
          }
        }}
        onExportDiscussedMarkdown={async () => {
          try {
            await exportMarkdownScoped('discussed');
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error(e);
          }
        }}
        onExportByDateRange={async ({ format, field, from, to }) => {
          try {
            const range = { field, from, to } as const;
            if (format === 'markdown') {
              await exportMarkdownScopedDateRange('all', range);
            } else {
              await exportJsonScopedDateRange('all', range);
            }
          } catch (e) {
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
        experimentalFlags={experimentalFlags}
        onToggleExperimentalFlag={(key, enabled) => {
          void setExperimentalFlag(key, enabled);
        }}
      />

      <main className="app-main" role="main">
        {activeView === 'list' ? (
          <QuickCapture
            ref={quickCaptureRef}
            onAdd={addItemWithFx}
            dictionary={dictionaryTokens}
            disabled={isLoading}
          />
        ) : (
          <CanvasView
            ref={canvasRef}
            items={items}
            positions={canvasPositions}
            onMoveItem={setCanvasPosition}
            onAddItem={addItemWithFx}
            isLoading={isLoading}
          />
        )}

        {isStartupBannerVisible && (
          <div className="startup-banner" role="status" aria-live="polite">
            <span className="startup-banner-text">{startupBannerText}</span>
            <button
              type="button"
              className="startup-banner-close"
              onClick={() => setIsStartupBannerVisible(false)}
              aria-label="Dismiss startup notification"
              title="Dismiss"
            >
              ×
            </button>
          </div>
        )}
        
        {error && (
          <div className="app-error">
            <span className="error-prefix">[ERROR]</span> {error}
          </div>
        )}
        
        {activeView === 'list' && (
          <QueueItemList
            items={filteredItems}
            dictionary={dictionaryTokens}
            hasUnfilteredItems={items.length > 0}
            hasActiveSearch={hasActiveSearch}
            onTabChange={handleTabChange}
            onToggleComplete={toggleComplete}
            onDelete={deleteItem}
            onAddFollowUp={addFollowUp}
            onUpdateItem={updateItem}
            isLoading={isLoading}
          />
        )}
      </main>
      
      {/* Keyboard shortcuts hint */}
      <div className="app-shortcuts-hint" aria-hidden="true">
        <kbd>{window.electronAPI?.platform === 'darwin' ? 'Cmd' : 'Ctrl'}</kbd>+<kbd>Z</kbd> Undo &nbsp;|&nbsp;
        <kbd>{window.electronAPI?.platform === 'darwin' ? 'Cmd' : 'Ctrl'}</kbd>+<kbd>N</kbd> New item &nbsp;|&nbsp;
        {activeView === 'list' && (
          <>
            <kbd>{window.electronAPI?.platform === 'darwin' ? 'Cmd' : 'Ctrl'}</kbd>+<kbd>F</kbd> Search &nbsp;|&nbsp;
          </>
        )}
        <kbd>{window.electronAPI?.platform === 'darwin' ? 'Cmd' : 'Ctrl'}</kbd>+<kbd>Shift</kbd>+<kbd>Q</kbd> Toggle window
      </div>
    </div>
  );
};

export default App;
