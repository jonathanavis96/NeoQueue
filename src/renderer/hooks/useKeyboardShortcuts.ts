/**
 * useKeyboardShortcuts - Hook for handling keyboard shortcuts in the renderer
 * Listens for both global shortcuts from main process and local keyboard events
 */

import { useEffect, useCallback } from 'react';
import { hasEditableText } from './textEntryTarget';

interface UseKeyboardShortcutsOptions {
  onNewItem?: () => void;
  onFind?: () => void;
  onEscape?: () => void;
  onUndo?: () => void;
}

export const useKeyboardShortcuts = ({
  onNewItem,
  onFind,
  onEscape,
  onUndo,
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
      return;
    }

    // Ctrl/Cmd + F: Focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      onFind?.();
      return;
    }

    // Ctrl/Cmd + Z: Undo, unless a text field has its own typing to undo
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      if (hasEditableText(e.target)) return;
      e.preventDefault();
      onUndo?.();
      return;
    }

    // Escape: Clear focus / close modals
    if (e.key === 'Escape') {
      onEscape?.();
    }
  }, [onNewItem, onFind, onEscape, onUndo]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};
