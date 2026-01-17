/**
 * Custom hook for managing queue data with persistence
 * Provides load/save functionality via Electron IPC
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  QueueItem,
  AppState,
  AppSettings,
  CanvasNodePosition,
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
  /** Canvas layout positions keyed by item id (empty if unset). */
  canvasPositions: Record<string, CanvasNodePosition>;
  setCanvasPosition: (id: string, position: CanvasNodePosition) => Promise<void>;
  addItem: (text: string) => Promise<void>;
  updateItem: (id: string, updates: Partial<QueueItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
  addFollowUp: (itemId: string, text: string) => Promise<void>;
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
        const response = await window.electronAPI.loadData();
        if (response.success && response.data) {
          setSettings(response.data.settings);

          // Convert date strings back to Date objects
          const itemsWithDates = response.data.items.map((item) => ({
            ...item,
            createdAt: new Date(item.createdAt),
            completedAt: item.completedAt ? new Date(item.completedAt) : undefined,
            followUps: (item.followUps ?? []).map((fu) => ({
              ...fu,
              createdAt: new Date(fu.createdAt),
            })),
          }));
          setItems(itemsWithDates);
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
    (newItems: QueueItem[], nextSettings: AppSettings | undefined): AppState => {
      return {
        items: newItems,
        dictionary: { tokens: extractLearnedTokens(newItems) },
        settings: nextSettings,
        version: CURRENT_APP_STATE_VERSION,
      };
    },
    []
  );

  // Save data helper
  const saveData = useCallback(
    async (newItems: QueueItem[], nextSettings: AppSettings | undefined) => {
      const appState = buildAppState(newItems, nextSettings);
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
      await saveData(newItems, settings);
      setUndoSnapshot({ items: prevItems, label: 'add' });
    } catch (err) {
      // Rollback on error
      setItems(prevItems);
      setError(String(err));
    }
  }, [items, saveData, settings]);

  // Update an existing item
  const updateItem = useCallback(async (id: string, updates: Partial<QueueItem>) => {
    const prevItems = items;
    const newItems = prevItems.map((item) =>
      item.id === id ? { ...item, ...updates } : item
    );

    setItems(newItems);

    try {
      await saveData(newItems, settings);
    } catch (err) {
      setItems(prevItems);
      setError(String(err));
    }
  }, [items, saveData, settings]);

  // Delete an item
  const deleteItem = useCallback(async (id: string) => {
    const prevItems = items;
    const newItems = prevItems.filter((item) => item.id !== id);

    // No-op if not found.
    if (newItems.length === prevItems.length) return;

    setItems(newItems);

    try {
      await saveData(newItems, settings);
      setUndoSnapshot({ items: prevItems, label: 'delete' });
    } catch (err) {
      setItems(prevItems);
      setError(String(err));
    }
  }, [items, saveData, settings]);

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
      await saveData(newItems, settings);
      setUndoSnapshot({ items: prevItems, label: 'toggleComplete' });
    } catch (err) {
      setItems(prevItems);
      setError(String(err));
    }
  }, [items, saveData, settings]);

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
      await saveData(newItems, settings);
    } catch (err) {
      setItems(prevItems);
      setError(String(err));
    }
  }, [items, saveData, settings]);

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

    return buildAppState(finalItems, settings);
  }, [applyDateRange, buildAppState, items, settings]);

  const exportJsonScopedDateRange = useCallback(
    async (scope: ExportScope, dateRange: ExportDateRange) => {
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
      await saveData(undoItems, settings);
      setUndoSnapshot(null);
    } catch (err) {
      // Roll back the undo attempt and keep the snapshot (so the user can retry).
      setItems(beforeUndoItems);
      setError(String(err));
    }
  }, [items, saveData, settings, undoSnapshot]);

  const exportMarkdownScopedDateRange = useCallback(
    async (scope: ExportScope, dateRange: ExportDateRange) => {
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
    try {
      const response = await window.electronAPI.importJson();
      if (!response.success) {
        throw new Error(response.error || 'Failed to import JSON');
      }

      if (response.canceled || !response.data) return;

      const importedItems = response.data.items.map((item) => ({
        ...item,
        createdAt: new Date(item.createdAt),
        completedAt: item.completedAt ? new Date(item.completedAt) : undefined,
        followUps: item.followUps.map((fu) => ({
          ...fu,
          createdAt: new Date(fu.createdAt),
        })),
      }));

      setItems(importedItems);
      setSettings(response.data.settings);
      setUndoSnapshot(null);
      setError(null);
    } catch (err) {
      setError(String(err));
      throw err;
    }
  }, []);

  const canvasPositions = useMemo(() => settings?.canvasLayout?.positions ?? {}, [settings]);

  const setCanvasPosition = useCallback(
    async (id: string, position: CanvasNodePosition) => {
      const safeId = id.trim();
      if (!safeId) return;

      const nextSettings: AppSettings = {
        ...(settings ?? {}),
        canvasLayout: {
          positions: {
            ...(settings?.canvasLayout?.positions ?? {}),
            [safeId]: {
              leftPct: position.leftPct,
              topPct: position.topPct,
            },
          },
        },
      };

      // Optimistic: update local settings state immediately.
      setSettings(nextSettings);

      try {
        await saveData(items, nextSettings);
      } catch (err) {
        // Revert on save failure.
        setSettings(settings);
        setError(String(err));
      }
    },
    [items, saveData, settings]
  );

  const dictionaryTokens = useMemo(() => extractLearnedTokens(items), [items]);

  return {
    items,
    dictionaryTokens,
    isLoading,
    error,
    settings,
    canvasPositions,
    setCanvasPosition,
    addItem,
    updateItem,
    deleteItem,
    toggleComplete,
    addFollowUp,
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
  };
};
