/**
 * CommandsDropdown - Dropdown for saved commands with add/edit/delete/reorder
 */

import React, { useState, useRef, useEffect } from 'react';
import './CommandsDropdown.css';

export interface Command {
  id: string;
  text: string;
}

interface CommandsDropdownProps {
  commands: Command[];
  onAddCommand: (text: string) => void;
  onEditCommand: (id: string, text: string) => void;
  onDeleteCommand: (id: string) => void;
  onReorderCommands: (commands: Command[]) => void;
}

export const CommandsDropdown: React.FC<CommandsDropdownProps> = ({
  commands,
  onAddCommand,
  onEditCommand,
  onDeleteCommand,
  onReorderCommands,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newCommandText, setNewCommandText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const addInputRef = useRef<HTMLTextAreaElement>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsAdding(false);
        setEditingId(null);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Focus input when adding
  useEffect(() => {
    if (isAdding) {
      addInputRef.current?.focus();
    }
  }, [isAdding]);

  // Focus input when editing
  useEffect(() => {
    if (editingId) {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }
  }, [editingId]);

  const handleButtonClick = () => {
    if (isOpen && !isAdding) {
      // If open and not adding, switch to add mode
      setIsAdding(true);
      setNewCommandText('');
    } else if (isOpen && isAdding) {
      // If adding, submit if there's text
      handleAddSubmit();
    } else {
      // If closed, open
      setIsOpen(true);
      setIsAdding(false);
    }
  };

  const handleAddSubmit = () => {
    const trimmed = newCommandText.trim();
    if (trimmed) {
      onAddCommand(trimmed);
      setNewCommandText('');
    }
    setIsAdding(false);
  };

  const handleAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleAddSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsAdding(false);
      setNewCommandText('');
    }
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleStartEdit = (id: string, text: string) => {
    setEditingId(id);
    setEditingText(text);
  };

  const handleEditSubmit = () => {
    if (editingId) {
      const trimmed = editingText.trim();
      if (trimmed) {
        onEditCommand(editingId, trimmed);
      }
      setEditingId(null);
      setEditingText('');
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleEditSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditingId(null);
      setEditingText('');
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    const draggedIndex = commands.findIndex(c => c.id === draggedId);
    const targetIndex = commands.findIndex(c => c.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedId(null);
      return;
    }

    const newCommands = [...commands];
    const [removed] = newCommands.splice(draggedIndex, 1);
    newCommands.splice(targetIndex, 0, removed);

    onReorderCommands(newCommands);
    setDraggedId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  return (
    <div className="commands-dropdown" ref={dropdownRef}>
      <button
        type="button"
        className={`commands-button ${isOpen ? 'is-open' : ''}`}
        onClick={handleButtonClick}
      >
        {isOpen ? 'ADD' : 'CMDs'}
      </button>

      {isOpen && (
        <div className="commands-panel">
          {isAdding && (
            <div className="commands-add-form">
              <textarea
                ref={addInputRef}
                className="commands-add-input"
                value={newCommandText}
                onChange={(e) => setNewCommandText(e.target.value)}
                onKeyDown={handleAddKeyDown}
                placeholder="Enter command... (Ctrl+Enter to save)"
                rows={2}
              />
              <div className="commands-add-actions">
                <button
                  type="button"
                  className="commands-add-save"
                  onClick={handleAddSubmit}
                  disabled={!newCommandText.trim()}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="commands-add-cancel"
                  onClick={() => {
                    setIsAdding(false);
                    setNewCommandText('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {commands.length === 0 && !isAdding ? (
            <div className="commands-empty">
              No commands saved yet.
              <br />
              Click ADD to create one.
            </div>
          ) : (
            <div className="commands-list">
              {commands.map((cmd) => (
                <div
                  key={cmd.id}
                  className={`commands-item ${copiedId === cmd.id ? 'copied' : ''} ${draggedId === cmd.id ? 'dragging' : ''}`}
                  draggable={editingId !== cmd.id}
                  onDragStart={(e) => handleDragStart(e, cmd.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, cmd.id)}
                  onDragEnd={handleDragEnd}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleCopy(cmd.id, cmd.text);
                  }}
                  title="Right-click to copy, drag to reorder"
                >
                  {editingId === cmd.id ? (
                    <textarea
                      ref={editInputRef}
                      className="commands-edit-input"
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onKeyDown={handleEditKeyDown}
                      onBlur={handleEditSubmit}
                      rows={2}
                    />
                  ) : (
                    <>
                      <span className="commands-item-grip" aria-hidden="true">⋮⋮</span>
                      <span className="commands-item-text">{cmd.text}</span>
                      <div className="commands-item-actions">
                        <button
                          type="button"
                          className="commands-item-btn edit"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(cmd.id, cmd.text);
                          }}
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          className="commands-item-btn delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteCommand(cmd.id);
                          }}
                          title="Delete"
                        >
                          ✕
                        </button>
                      </div>
                      {copiedId === cmd.id && (
                        <span className="commands-item-copied">Copied!</span>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
