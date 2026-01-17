/**
 * Custom hook for managing queue data with persistence
 * Provides load/save functionality via Electron IPC
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  QueueItem,
  SavedCommand,
  AppState,
  AppSettings,
  ExportScope,
  ExportDateRange,
  ExportOptions,
} from '../../shared/types';
import { CURRENT_APP_STATE_VERSION } from '../../shared/migrations';
import { extractLearnedTokens } from '../../shared/dictionary';

type UndoSnapshot = {
  items: QueueItem[];
  label: string;
};

interface UseQueueDataResult {
  items: QueueItem[];
  /** Learned dictionary tokens derived from current items (case-preserving). */
  dictionaryTokens: string[];
  isLoading: boolean;
  error: string | null;
  /** Persisted app settings loaded from AppState (best-effort). */
  settings?: AppSettings;
  addItem: (text: string) => Promise<void>;
  updateItem: (id: string, updates: Partial<QueueItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
  addFollowUp: (itemId: string, text: string) => Promise<void>;
  /** Reorder queue items (for drag-and-drop). */
  reorderItems: (newItems: QueueItem[]) => Promise<void>;
  /** Single-step undo for the most recent destructive action (in-memory only). */
  canUndo: boolean;
  undo: () => Promise<void>;
  exportJson: () => Promise<void>;
  exportMarkdown: () => Promise<void>;
  exportJsonScoped: (scope: ExportScope) => Promise<void>;
  exportMarkdownScoped: (scope: ExportScope) => Promise<void>;
  exportJsonDateRange: (dateRange: ExportDateRange) => Promise<void>;
  exportMarkdownDateRange: (dateRange: ExportDateRange) => Promise<void>;
  exportJsonScopedDateRange: (scope: ExportScope, dateRange: ExportDateRange) => Promise<void>;
  exportMarkdownScopedDateRange: (scope: ExportScope, dateRange: ExportDateRange) => Promise<void>;
  importJson: () => Promise<void>;
  /** Saved commands for quick access. */
  commands: SavedCommand[];
  addCommand: (text: string) => Promise<void>;
  editCommand: (id: string, text: string) => Promise<void>;
  deleteCommand: (id: string) => Promise<void>;
  reorderCommands: (newCommands: SavedCommand[]) => Promise<void>;
}

// Generate a simple UUID (v4-like)
const generateId = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const useQueueData = (): UseQueueDataResult => {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [commands, setCommands] = useState<SavedCommand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [undoSnapshot, setUndoSnapshot] = useState<UndoSnapshot | null>(null);
  const [settings, setSettings] = useState<AppSettings | undefined>(undefined);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Guard against missing electronAPI (e.g., running outside Electron context)
        if (!window.electronAPI?.loadData) {
          setError('App not running in Electron context. Please launch via the desktop app.');
          setIsLoading(false);
          return;
        }

        const response = await window.electronAPI.loadData();
        if (response.success && response.data) {
          setSettings(response.data.settings);

          // Guard against undefined/null items array (corrupted or empty store)
          const rawItems = response.data.items ?? [];

          // Convert date strings back to Date objects
          const itemsWithDates = rawItems.map((item) => ({
            ...item,
            createdAt: new Date(item.createdAt),
            completedAt: item.completedAt ? new Date(item.completedAt) : undefined,
            followUps: (item.followUps ?? []).map((fu) => ({
              ...fu,
              createdAt: new Date(fu.createdAt),
            })),
          }));
          setItems(itemsWithDates);

          // Load saved commands
          const rawCommands = response.data.commands ?? [];
          const commandsWithDates = rawCommands.map((cmd) => ({
            ...cmd,
            createdAt: new Date(cmd.createdAt),
          }));
          setCommands(commandsWithDates);
        } else if (!response.success) {
          setError(response.error || 'Failed to load data');
        }
      } catch (err) {
        setError(String(err));
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Clear undo history on restart / reload (in-memory only)
  useEffect(() => {
    setUndoSnapshot(null);
  }, []);

  // Build AppState (used for save + export)
  const buildAppState = useCallback(
    (newItems: QueueItem[], nextSettings: AppSettings | undefined, newCommands?: SavedCommand[]): AppState => {
      return {
        items: newItems,
        commands: newCommands,
        dictionary: { tokens: extractLearnedTokens(newItems) },
        settings: nextSettings,
        version: CURRENT_APP_STATE_VERSION,
      };
    },
    []
  );

  // Save data helper
  const saveData = useCallback(
    async (newItems: QueueItem[], nextSettings: AppSettings | undefined, newCommands?: SavedCommand[]) => {
      // Guard against missing electronAPI
      if (!window.electronAPI?.saveData) {
        throw new Error('Cannot save: app not running in Electron context');
      }

      const appState = buildAppState(newItems, nextSettings, newCommands);
      const response = await window.electronAPI.saveData(appState);
      if (!response.success) {
        throw new Error(response.error || 'Failed to save data');
      }
    },
    [buildAppState]
  );

  // Add a new item
  const addItem = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const prevItems = items;
    const newItem: QueueItem = {
      id: generateId(),
      text: trimmed,
      createdAt: new Date(),
      isCompleted: false,
      followUps: [],
    };

    const newItems = [newItem, ...prevItems];
    setItems(newItems);

    try {
      await saveData(newItems, settings, commands);
      setUndoSnapshot({ items: prevItems, label: 'add' });
    } catch (err) {
      // Rollback on error
      setItems(prevItems);
      setError(String(err));
    }
  }, [commands, items, saveData, settings]);

  // Update an existing item
  const updateItem = useCallback(async (id: string, updates: Partial<QueueItem>) => {
    const prevItems = items;
    const newItems = prevItems.map((item) =>
      item.id === id ? { ...item, ...updates } : item
    );

    setItems(newItems);

    try {
      await saveData(newItems, settings, commands);
    } catch (err) {
      setItems(prevItems);
      setError(String(err));
    }
  }, [commands, items, saveData, settings]);

  // Delete an item
  const deleteItem = useCallback(async (id: string) => {
    const prevItems = items;
    const newItems = prevItems.filter((item) => item.id !== id);

    // No-op if not found.
    if (newItems.length === prevItems.length) return;

    setItems(newItems);

    try {
      await saveData(newItems, settings, commands);
      setUndoSnapshot({ items: prevItems, label: 'delete' });
    } catch (err) {
      setItems(prevItems);
      setError(String(err));
    }
  }, [commands, items, saveData, settings]);

  // Toggle item completion status
  const toggleComplete = useCallback(async (id: string) => {
    const prevItems = items;

    let changed = false;
    const newItems = prevItems.map((item) => {
      if (item.id !== id) return item;
      changed = true;
      return {
        ...item,
        isCompleted: !item.isCompleted,
        completedAt: !item.isCompleted ? new Date() : undefined,
      };
    });

    if (!changed) return;

    setItems(newItems);

    try {
      await saveData(newItems, settings, commands);
      setUndoSnapshot({ items: prevItems, label: 'toggleComplete' });
    } catch (err) {
      setItems(prevItems);
      setError(String(err));
    }
  }, [commands, items, saveData, settings]);

  // Add a follow-up to an item
  const addFollowUp = useCallback(async (itemId: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const prevItems = items;
    const newFollowUp = {
      id: generateId(),
      text: trimmed,
      createdAt: new Date(),
    };

    const newItems = prevItems.map((item) =>
      item.id === itemId
        ? { ...item, followUps: [...item.followUps, newFollowUp] }
        : item
    );

    setItems(newItems);

    try {
      await saveData(newItems, settings, commands);
    } catch (err) {
      setItems(prevItems);
      setError(String(err));
    }
  }, [commands, items, saveData, settings]);

  // Reorder queue items (for drag-and-drop)
  const reorderItems = useCallback(async (newItems: QueueItem[]) => {
    const prevItems = items;
    setItems(newItems);

    try {
      await saveData(newItems, settings, commands);
    } catch (err) {
      setItems(prevItems);
      setError(String(err));
    }
  }, [commands, items, saveData, settings]);

  const parseYyyyMmDd = useCallback((value: string): Date | null => {
    const match = /^\d{4}-\d{2}-\d{2}$/.exec(value.trim());
    if (!match) return null;

    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  }, []);

  const applyDateRange = useCallback((sourceItems: QueueItem[], dateRange: ExportDateRange): QueueItem[] => {
    const from = dateRange.from ? parseYyyyMmDd(dateRange.from) : null;
    const to = dateRange.to ? parseYyyyMmDd(dateRange.to) : null;

    if ((dateRange.from && !from) || (dateRange.to && !to)) {
      throw new Error('Invalid date range: use YYYY-MM-DD');
    }

    if (from && to && from.getTime() > to.getTime()) {
      throw new Error('Invalid date range: start date is after end date');
    }

    // Inclusive end date: treat as end-of-day.
    const toInclusive = to ? new Date(to.getTime() + 24 * 60 * 60 * 1000 - 1) : null;

    return sourceItems.filter((item) => {
      const raw = (dateRange.field === 'createdAt' ? item.createdAt : item.completedAt) as Date | undefined;
      if (!raw) return false;

      const ts = raw.getTime();
      if (from && ts < from.getTime()) return false;
      if (toInclusive && ts > toInclusive.getTime()) return false;
      return true;
    });
  }, [parseYyyyMmDd]);

  const buildScopedAppState = useCallback((scope: ExportScope, dateRange?: ExportDateRange): AppState => {
    const scopeItems =
      scope === 'active'
        ? items.filter((i) => !i.isCompleted)
        : scope === 'discussed'
          ? items.filter((i) => i.isCompleted)
          : items;

    const finalItems = dateRange ? applyDateRange(scopeItems, dateRange) : scopeItems;

    return buildAppState(finalItems, settings, commands);
  }, [applyDateRange, buildAppState, commands, items, settings]);

  const exportJsonScopedDateRange = useCallback(
    async (scope: ExportScope, dateRange: ExportDateRange) => {
      if (!window.electronAPI?.exportJson) {
        setError('Cannot export: app not running in Electron context');
        return;
      }
      try {
        const options: ExportOptions = { scope, dateRange };
        const response = await window.electronAPI.exportJson(buildScopedAppState(scope, dateRange), options);
        if (!response.success) {
          throw new Error(response.error || 'Failed to export JSON');
        }
      } catch (err) {
        setError(String(err));
        throw err;
      }
    },
    [buildScopedAppState]
  );

  const exportJsonDateRange = useCallback(
    async (dateRange: ExportDateRange) => exportJsonScopedDateRange('all', dateRange),
    [exportJsonScopedDateRange]
  );

  const exportJsonScoped = useCallback(
    async (scope: ExportScope) => {
      if (!window.electronAPI?.exportJson) {
        setError('Cannot export: app not running in Electron context');
        return;
      }
      try {
        const response = await window.electronAPI.exportJson(buildScopedAppState(scope), { scope });
        if (!response.success) {
          throw new Error(response.error || 'Failed to export JSON');
        }
      } catch (err) {
        setError(String(err));
        throw err;
      }
    },
    [buildScopedAppState]
  );

  const exportJson = useCallback(async () => {
    return exportJsonScoped('all');
  }, [exportJsonScoped]);

  const canUndo = undoSnapshot !== null;

  const undo = useCallback(async () => {
    if (!undoSnapshot) return;

    const beforeUndoItems = items;
    const undoItems = undoSnapshot.items;

    setItems(undoItems);

    try {
      await saveData(undoItems, settings, commands);
      setUndoSnapshot(null);
    } catch (err) {
      // Roll back the undo attempt and keep the snapshot (so the user can retry).
      setItems(beforeUndoItems);
      setError(String(err));
    }
  }, [commands, items, saveData, settings, undoSnapshot]);

  // Command management functions
  const addCommand = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const newCommand: SavedCommand = {
      id: generateId(),
      text: trimmed,
      createdAt: new Date(),
    };

    const newCommands = [...commands, newCommand];
    setCommands(newCommands);

    try {
      await saveData(items, settings, newCommands);
    } catch (err) {
      setCommands(commands);
      setError(String(err));
    }
  }, [commands, items, saveData, settings]);

  const editCommand = useCallback(async (id: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const prevCommands = commands;
    const newCommands = prevCommands.map((cmd) =>
      cmd.id === id ? { ...cmd, text: trimmed } : cmd
    );

    setCommands(newCommands);

    try {
      await saveData(items, settings, newCommands);
    } catch (err) {
      setCommands(prevCommands);
      setError(String(err));
    }
  }, [commands, items, saveData, settings]);

  const deleteCommand = useCallback(async (id: string) => {
    const prevCommands = commands;
    const newCommands = prevCommands.filter((cmd) => cmd.id !== id);

    if (newCommands.length === prevCommands.length) return;

    setCommands(newCommands);

    try {
      await saveData(items, settings, newCommands);
    } catch (err) {
      setCommands(prevCommands);
      setError(String(err));
    }
  }, [commands, items, saveData, settings]);

  const reorderCommands = useCallback(async (newCommands: SavedCommand[]) => {
    const prevCommands = commands;
    setCommands(newCommands);

    try {
      await saveData(items, settings, newCommands);
    } catch (err) {
      setCommands(prevCommands);
      setError(String(err));
    }
  }, [commands, items, saveData, settings]);

  const exportMarkdownScopedDateRange = useCallback(
    async (scope: ExportScope, dateRange: ExportDateRange) => {
      if (!window.electronAPI?.exportMarkdown) {
        setError('Cannot export: app not running in Electron context');
        return;
      }
      try {
        const options: ExportOptions = { scope, dateRange };
        const response = await window.electronAPI.exportMarkdown(buildScopedAppState(scope, dateRange), options);
        if (!response.success) {
          throw new Error(response.error || 'Failed to export Markdown');
        }
      } catch (err) {
        setError(String(err));
        throw err;
      }
    },
    [buildScopedAppState]
  );

  const exportMarkdownDateRange = useCallback(
    async (dateRange: ExportDateRange) => exportMarkdownScopedDateRange('all', dateRange),
    [exportMarkdownScopedDateRange]
  );

  const exportMarkdownScoped = useCallback(
    async (scope: ExportScope) => {
      if (!window.electronAPI?.exportMarkdown) {
        setError('Cannot export: app not running in Electron context');
        return;
      }
      try {
        const response = await window.electronAPI.exportMarkdown(buildScopedAppState(scope), { scope });
        if (!response.success) {
          throw new Error(response.error || 'Failed to export Markdown');
        }
      } catch (err) {
        setError(String(err));
        throw err;
      }
    },
    [buildScopedAppState]
  );

  const exportMarkdown = useCallback(async () => {
    return exportMarkdownScoped('all');
  }, [exportMarkdownScoped]);

  const importJson = useCallback(async () => {
    if (!window.electronAPI?.importJson) {
      setError('Cannot import: app not running in Electron context');
      return;
    }
    try {
      const response = await window.electronAPI.importJson();
      if (!response.success) {
        throw new Error(response.error || 'Failed to import JSON');
      }

      if (response.canceled || !response.data) return;

      // Guard against undefined/null items array (corrupted import file)
      const rawItems = response.data.items ?? [];

      const importedItems = rawItems.map((item) => ({
        ...item,
        createdAt: new Date(item.createdAt),
        completedAt: item.completedAt ? new Date(item.completedAt) : undefined,
        followUps: (item.followUps ?? []).map((fu) => ({
          ...fu,
          createdAt: new Date(fu.createdAt),
        })),
      }));

      // Import commands if present
      const rawCommands = response.data.commands ?? [];
      const importedCommands = rawCommands.map((cmd) => ({
        ...cmd,
        createdAt: new Date(cmd.createdAt),
      }));

      setItems(importedItems);
      setCommands(importedCommands);
      setSettings(response.data.settings);
      setUndoSnapshot(null);
      setError(null);
    } catch (err) {
      setError(String(err));
      throw err;
    }
  }, []);

  const dictionaryTokens = useMemo(() => extractLearnedTokens(items), [items]);

  return {
    items,
    dictionaryTokens,
    isLoading,
    error,
    settings,
    addItem,
    updateItem,
    deleteItem,
    toggleComplete,
    addFollowUp,
    reorderItems,
    canUndo,
    undo,
    exportJson,
    exportMarkdown,
    exportJsonScoped,
    exportMarkdownScoped,
    exportJsonDateRange,
    exportMarkdownDateRange,
    exportJsonScopedDateRange,
    exportMarkdownScopedDateRange,
    importJson,
    commands,
    addCommand,
    editCommand,
    deleteCommand,
    reorderCommands,
  };
};
