/**
 * useKeyboardShortcuts - Hook for handling keyboard shortcuts in the renderer
 * Listens for both global shortcuts from main process and local keyboard events
 */

import { useEffect, useCallback } from 'react';

interface UseKeyboardShortcutsOptions {
  onNewItem?: () => void;
  onEscape?: () => void;
}

export const useKeyboardShortcuts = ({
  onNewItem,
  onEscape,
}: UseKeyboardShortcutsOptions): void => {
  // Handle global shortcuts from main process (via IPC)
  useEffect(() => {
    if (!window.electronAPI?.onNewItemShortcut) return;
    
    const cleanup = window.electronAPI.onNewItemShortcut(() => {
      onNewItem?.();
    });
    
    return cleanup;
  }, [onNewItem]);

  // Handle local keyboard shortcuts within the app
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ctrl/Cmd + N: Focus new item input (local shortcut)
    if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !e.shiftKey) {
      e.preventDefault();
      onNewItem?.();
    }
    
    // Escape: Clear focus / close modals
    if (e.key === 'Escape') {
      onEscape?.();
    }
  }, [onNewItem, onEscape]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};
