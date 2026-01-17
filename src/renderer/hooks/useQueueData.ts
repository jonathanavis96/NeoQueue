/**
 * Custom hook for managing queue data with persistence
 * Provides load/save functionality via Electron IPC
 */

import { useState, useEffect, useCallback } from 'react';
import { QueueItem, AppState } from '../../shared/types';

type UndoSnapshot = {
  items: QueueItem[];
  label: string;
};

interface UseQueueDataResult {
  items: QueueItem[];
  isLoading: boolean;
  error: string | null;
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

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await window.electronAPI.loadData();
        if (response.success && response.data) {
          // Convert date strings back to Date objects
          const itemsWithDates = response.data.items.map((item) => ({
            ...item,
            createdAt: new Date(item.createdAt),
            completedAt: item.completedAt ? new Date(item.completedAt) : undefined,
            followUps: item.followUps.map((fu) => ({
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
  const buildAppState = useCallback((newItems: QueueItem[]): AppState => {
    return {
      items: newItems,
      version: 1,
    };
  }, []);

  // Save data helper
  const saveData = useCallback(async (newItems: QueueItem[]) => {
    const appState = buildAppState(newItems);
    const response = await window.electronAPI.saveData(appState);
    if (!response.success) {
      throw new Error(response.error || 'Failed to save data');
    }
  }, [buildAppState]);

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
      await saveData(newItems);
      setUndoSnapshot({ items: prevItems, label: 'add' });
    } catch (err) {
      // Rollback on error
      setItems(prevItems);
      setError(String(err));
    }
  }, [items, saveData]);

  // Update an existing item
  const updateItem = useCallback(async (id: string, updates: Partial<QueueItem>) => {
    const prevItems = items;
    const newItems = prevItems.map((item) =>
      item.id === id ? { ...item, ...updates } : item
    );

    setItems(newItems);

    try {
      await saveData(newItems);
    } catch (err) {
      setItems(prevItems);
      setError(String(err));
    }
  }, [items, saveData]);

  // Delete an item
  const deleteItem = useCallback(async (id: string) => {
    const prevItems = items;
    const newItems = prevItems.filter((item) => item.id !== id);

    // No-op if not found.
    if (newItems.length === prevItems.length) return;

    setItems(newItems);

    try {
      await saveData(newItems);
      setUndoSnapshot({ items: prevItems, label: 'delete' });
    } catch (err) {
      setItems(prevItems);
      setError(String(err));
    }
  }, [items, saveData]);

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
      await saveData(newItems);
      setUndoSnapshot({ items: prevItems, label: 'toggleComplete' });
    } catch (err) {
      setItems(prevItems);
      setError(String(err));
    }
  }, [items, saveData]);

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
      await saveData(newItems);
    } catch (err) {
      setItems(prevItems);
      setError(String(err));
    }
  }, [items, saveData]);

  const exportJson = useCallback(async () => {
    try {
      const response = await window.electronAPI.exportJson(buildAppState(items));
      if (!response.success) {
        throw new Error(response.error || 'Failed to export JSON');
      }
    } catch (err) {
      setError(String(err));
      throw err;
    }
  }, [buildAppState, items]);

  const canUndo = undoSnapshot !== null;

  const undo = useCallback(async () => {
    if (!undoSnapshot) return;

    const beforeUndoItems = items;
    const undoItems = undoSnapshot.items;

    setItems(undoItems);

    try {
      await saveData(undoItems);
      setUndoSnapshot(null);
    } catch (err) {
      // Roll back the undo attempt and keep the snapshot (so the user can retry).
      setItems(beforeUndoItems);
      setError(String(err));
    }
  }, [items, saveData, undoSnapshot]);

  const exportMarkdown = useCallback(async () => {
    try {
      const response = await window.electronAPI.exportMarkdown(buildAppState(items));
      if (!response.success) {
        throw new Error(response.error || 'Failed to export Markdown');
      }
    } catch (err) {
      setError(String(err));
      throw err;
    }
  }, [buildAppState, items]);

  return {
    items,
    isLoading,
    error,
    addItem,
    updateItem,
    deleteItem,
    toggleComplete,
    addFollowUp,
    canUndo,
    undo,
    exportJson,
    exportMarkdown,
  };
};
