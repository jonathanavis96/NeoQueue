import React, { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import './styles/App.css';
import { useQueueData, useKeyboardShortcuts, useUiEffects, useExperimentalFlags } from './hooks';
import { QuickCapture, SearchBox, QueueItemList, HelpPanel, TitleBar, CommandsDropdown, MatrixRainBackground, RainControl, ProjectTabs } from './components';
import type { QuickCaptureRef } from './components/QuickCapture';
import type { SearchBoxRef } from './components/SearchBox';
import { DEFAULT_PROJECT_ID } from '../shared/types';

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
    reorderItems,
    exportJson,
    exportMarkdown,
    exportJsonScoped,
    exportMarkdownScoped,
    exportJsonScopedDateRange,
    exportMarkdownScopedDateRange,
    importJson,
    canUndo,
    undo,
    commands,
    addCommand,
    editCommand,
    deleteCommand,
    reorderCommands,
    projects,
    addProject,
    renameProject,
    deleteProject,
    markProjectComplete,
    reactivateProject,
    reorderProjects,
    moveItemToProject,
    settings,
    updateSettings,
  } = useQueueData();

  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'queue' | 'discussed'>('queue');
  const [matrixRainEnabled, setMatrixRainEnabled] = useState(() => {
    try {
      return window.localStorage.getItem('neoqueue-rain-enabled') === 'true';
    } catch {
      return false;
    }
  });
  const [matrixRainIntensity, setMatrixRainIntensity] = useState(() => {
    try {
      const saved = window.localStorage.getItem('neoqueue-rain-intensity');
      return saved ? parseInt(saved, 10) : 15;
    } catch {
      return 15;
    }
  });
  const [activeProjectId, setActiveProjectId] = useState<string>(DEFAULT_PROJECT_ID);
  const [showingCompleted, setShowingCompleted] = useState(false);

  const { flags: experimentalFlags, setFlag: setExperimentalFlag } = useExperimentalFlags();

  const [isStartupBannerVisible, setIsStartupBannerVisible] = useState(false);
  const [startupBannerText, setStartupBannerText] = useState('');

  // Refs for programmatic focus
  const quickCaptureRef = useRef<QuickCaptureRef>(null);
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

  // Persist rain settings
  useEffect(() => {
    try {
      window.localStorage.setItem('neoqueue-rain-enabled', String(matrixRainEnabled));
    } catch { /* ignore */ }
  }, [matrixRainEnabled]);

  useEffect(() => {
    try {
      window.localStorage.setItem('neoqueue-rain-intensity', String(matrixRainIntensity));
    } catch { /* ignore */ }
  }, [matrixRainIntensity]);

  // PIN state is now manual only - just a visual reminder toggle
  // No automatic detection since PowerToys controls the actual always-on-top state

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

  // Restore activeProjectId from settings on load
  useEffect(() => {
    if (settings?.activeProjectId && projects.find(p => p.id === settings.activeProjectId)) {
      setActiveProjectId(settings.activeProjectId);
    }
  }, [settings?.activeProjectId, projects]);

  // Save activeProjectId when it changes
  const handleSelectProject = useCallback((projectId: string) => {
    setActiveProjectId(projectId);
    setShowingCompleted(false);
    void updateSettings({ ...settings, activeProjectId: projectId });
  }, [settings, updateSettings]);

  const handleShowCompleted = useCallback(() => {
    setShowingCompleted(true);
  }, []);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  // Filter items by project first, then by search query
  const projectFilteredItems = useMemo(() => {
    if (showingCompleted) {
      // When showing completed projects view, don't filter by project
      return items;
    }
    return items.filter(item => item.projectId === activeProjectId);
  }, [items, activeProjectId, showingCompleted]);

  const filteredItems = useMemo(() => {
    if (!normalizedQuery) return projectFilteredItems;

    return projectFilteredItems.filter((item) => {
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
  }, [projectFilteredItems, normalizedQuery]);

  const hasActiveSearch = normalizedQuery.length > 0;

  const addItemWithFx = useCallback(async (text: string) => {
    triggerPulse('add');
    await addItem(text, activeProjectId);
  }, [addItem, activeProjectId, triggerPulse]);

  return (
    <div
      className={`app ${scanlinesEnabled ? 'scanlines-enabled' : ''} ${pulseAction ? 'fx-pulse' : ''}`}
      data-pulse-action={pulseAction || undefined}
      role="application"
      aria-label="NeoQueue - Discussion Tracker"
    >
      {matrixRainEnabled && <MatrixRainBackground intensity={matrixRainIntensity} />}
      <TitleBar title="NeoQueue" />
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
            <CommandsDropdown
              commands={commands.map((c) => ({ id: c.id, text: c.text }))}
              onAddCommand={addCommand}
              onEditCommand={editCommand}
              onDeleteCommand={deleteCommand}
              onReorderCommands={(newCmds) => {
                // Map back to SavedCommand with createdAt
                const reordered = newCmds.map((cmd) => {
                  const original = commands.find((c) => c.id === cmd.id);
                  return original || { ...cmd, createdAt: new Date() };
                });
                void reorderCommands(reordered);
              }}
            />
            <div className="app-pin-container">
              <button
                type="button"
                className={`app-pin-button ${isAlwaysOnTop ? 'is-pinned' : ''}`}
                onClick={() => setIsAlwaysOnTop((prev) => !prev)}
                aria-label={isAlwaysOnTop ? 'Window is pinned on top (click to unmark)' : 'Window is not pinned (click to mark)'}
                title="Click to toggle pin reminder"
              >
                PIN
              </button>
              <span className="app-pin-hint">Win+Ctrl+T</span>
            </div>
            <RainControl
              enabled={matrixRainEnabled}
              intensity={matrixRainIntensity}
              onToggle={setMatrixRainEnabled}
              onChangeIntensity={setMatrixRainIntensity}
            />
            <button
              type="button"
              className="app-help-button"
              onClick={() => setIsHelpOpen(true)}
              aria-label="Open help"
            >
              ?
            </button>
          </div>
        </div>
        
        <ProjectTabs
          projects={projects}
          activeProjectId={activeProjectId}
          showingCompleted={showingCompleted}
          onSelectProject={handleSelectProject}
          onShowCompleted={handleShowCompleted}
          onAddProject={addProject}
          onRenameProject={renameProject}
          onDeleteProject={deleteProject}
          onMoveItemToProject={moveItemToProject}
          onReorderProjects={reorderProjects}
        />
      </header>

      <HelpPanel
        isOpen={isHelpOpen}
        onClose={() => {
          // Any close action dismisses the help panel for future sessions
          try {
            window.localStorage.setItem(HELP_DISMISSED_KEY, 'true');
          } catch {
            // ignore
          }
          setIsHelpOpen(false);
        }}
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
        matrixRainEnabled={matrixRainEnabled}
        matrixRainIntensity={matrixRainIntensity}
        onToggleMatrixRain={setMatrixRainEnabled}
        onChangeMatrixRainIntensity={setMatrixRainIntensity}
      />

      <main className="app-main" role="main">
        <QuickCapture
          ref={quickCaptureRef}
          onAdd={addItemWithFx}
          dictionary={dictionaryTokens}
          disabled={isLoading}
        />

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
        
        {/* Show completed projects list or regular queue */}
        {showingCompleted ? (
          <div className="completed-projects-view">
            <h2 className="completed-projects-title">Completed Projects</h2>
            {projects.filter(p => p.isCompleted).length === 0 ? (
              <p className="completed-projects-empty">No completed projects yet.</p>
            ) : (
              <ul className="completed-projects-list">
                {projects.filter(p => p.isCompleted).map(project => (
                  <li key={project.id} className="completed-project-item">
                    <button
                      className="completed-project-button"
                      onClick={() => {
                        handleSelectProject(project.id);
                      }}
                    >
                      <span className="completed-project-name">{project.name}</span>
                      {project.completedAt && (
                        <span className="completed-project-date">
                          Completed {new Date(project.completedAt).toLocaleDateString()}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <>
            {/* Mark as Complete button - show when queue is empty for non-default project */}
            {activeProjectId !== DEFAULT_PROJECT_ID && 
             projectFilteredItems.filter(i => !i.isCompleted).length === 0 &&
             projectFilteredItems.length > 0 && (
              <div className="mark-complete-banner">
                <span>All items discussed! </span>
                <button
                  className="mark-complete-button"
                  onClick={() => markProjectComplete(activeProjectId)}
                >
                  Mark Project as Complete
                </button>
              </div>
            )}
            <QueueItemList
              items={filteredItems}
              dictionary={dictionaryTokens}
              hasUnfilteredItems={projectFilteredItems.length > 0}
              hasActiveSearch={hasActiveSearch}
              activeProjectId={activeProjectId}
              onTabChange={handleTabChange}
              onToggleComplete={toggleComplete}
              onDelete={deleteItem}
              onAddFollowUp={addFollowUp}
              onUpdateItem={updateItem}
              onReorderItems={reorderItems}
              onMoveItemToProject={moveItemToProject}
              isLoading={isLoading}
            />
          </>
        )}
      </main>
      
      {/* Keyboard shortcuts hint */}
      <div className="app-shortcuts-hint" aria-hidden="true">
        <kbd>{window.electronAPI?.platform === 'darwin' ? 'Cmd' : 'Ctrl'}</kbd>+<kbd>Z</kbd> Undo &nbsp;|&nbsp;
        <kbd>{window.electronAPI?.platform === 'darwin' ? 'Cmd' : 'Ctrl'}</kbd>+<kbd>N</kbd> New item &nbsp;|&nbsp;
        <kbd>{window.electronAPI?.platform === 'darwin' ? 'Cmd' : 'Ctrl'}</kbd>+<kbd>F</kbd> Search &nbsp;|&nbsp;
        <kbd>{window.electronAPI?.platform === 'darwin' ? 'Cmd' : 'Ctrl'}</kbd>+<kbd>Shift</kbd>+<kbd>Q</kbd> Toggle window
      </div>
    </div>
  );
};

export default App;
