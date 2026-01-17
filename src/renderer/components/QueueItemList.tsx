/**
 * QueueItemList - Container component for displaying queue items
 */

import React, { useEffect, useMemo, useState, useCallback, useRef, memo } from 'react';
import { QueueItem } from '../../shared/types';
import { QueueItemCard } from './QueueItemCard';
import './QueueItemList.css';

// Classic Matrix half-width katakana + numbers (as used in the movie)
const MATRIX_CHARS = 'ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789';

// Single column drop with trail
interface RainDrop {
  x: number; // column position (0-1)
  y: number; // current head position (0-100)
  speed: number;
  chars: string[]; // trail of characters
  trailLength: number;
}

// Generate a random character
const randomChar = () => MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];

// Matrix Rain Drop Indicator Component - shows between cards during drag
// 18px characters (same as background rain), appears from behind card edge
const MatrixRainIndicator = memo(({ id }: { id: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dropsRef = useRef<RainDrop[]>([]);
  const animationRef = useRef<number>(0);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const CHAR_SIZE = 18; // Same size as background rain
    const STREAM_LENGTH = 8; // Characters per stream

    // Set canvas size
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resizeCanvas();

    // Initialize drops - start with tail visible (emerging from behind top card)
    if (!isInitializedRef.current) {
      const charWidth = CHAR_SIZE;
      const numColumns = Math.floor(canvas.getBoundingClientRect().width / charWidth);
      const activeDrops = Math.max(3, Math.floor(numColumns * 0.25)); // 25% active
      
      dropsRef.current = [];
      for (let i = 0; i < activeDrops; i++) {
        // Start with tail visible at top (y=0 means tail is at top, head is above/hidden)
        // This creates the "emerging from behind" effect
        const startY = Math.random() * 30; // Start near top so tail shows first
        dropsRef.current.push({
          x: Math.random(),
          y: startY,
          speed: 1.2 + Math.random() * 1.5, // Moderate speed
          chars: Array.from({ length: STREAM_LENGTH }, randomChar),
          trailLength: STREAM_LENGTH,
        });
      }
      isInitializedRef.current = true;
    }

    const animate = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      ctx.font = `${CHAR_SIZE}px monospace`;
      ctx.textAlign = 'center';

      // Update and draw drops
      dropsRef.current.forEach((drop) => {
        // Move drop down
        drop.y += drop.speed;

        // Reset when stream has fully exited bottom
        const streamTop = drop.y - (STREAM_LENGTH - 1) * CHAR_SIZE * 1.2;
        if (streamTop > rect.height) {
          // Reset to start emerging from top again
          drop.y = -CHAR_SIZE * 2;
          drop.x = Math.random();
          drop.speed = 1.2 + Math.random() * 1.5;
          drop.chars = Array.from({ length: STREAM_LENGTH }, randomChar);
        }

        // Randomly mutate 1-2 characters (classic Matrix glitch effect)
        if (Math.random() < 0.08) {
          const idx = Math.floor(Math.random() * drop.chars.length);
          drop.chars[idx] = randomChar();
        }

        // Draw trail
        const x = drop.x * rect.width;
        const charHeight = CHAR_SIZE * 1.2;
        
        drop.chars.forEach((char, i) => {
          const charY = drop.y - i * charHeight;
          
          // Only draw if within visible canvas area
          if (charY < -CHAR_SIZE || charY > rect.height + CHAR_SIZE) return;

          // Head is bright white-green, trail fades progressively
          let r: number, g: number, b: number, alpha: number;
          
          if (i === 0) {
            // Head - almost white with green tint
            r = 180;
            g = 255;
            b = 180;
            alpha = 1.0;
          } else {
            // Trail - progressively fade
            const fadeRatio = i / (STREAM_LENGTH - 1);
            const brightness = Math.max(0.15, 1 - fadeRatio * 0.85);
            r = Math.floor(30 * brightness);
            g = Math.floor(255 * brightness);
            b = Math.floor(30 * brightness);
            alpha = Math.max(0.2, 1 - fadeRatio * 0.8);
          }

          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
          ctx.fillText(char, x, charY);
        });
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [id]);

  return (
    <canvas
      ref={canvasRef}
      className="matrix-rain-canvas"
      style={{ width: '100%', height: '100%' }}
    />
  );
});

type QueueTab = 'queue' | 'discussed';

const SELECTED_TAB_KEY = 'neoqueue.ui.selectedTab';

// Custom drag state
interface DragState {
  id: string;
  text: string;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

// Drop position: 'before' means insert above the target, 'after' means insert below
type DropPosition = 'before' | 'after';

interface DropTarget {
  id: string;
  position: DropPosition;
}

interface QueueItemListProps {
  items: QueueItem[];
  /** Learned dictionary tokens for autocomplete (case-preserving). */
  dictionary: readonly string[];
  hasUnfilteredItems?: boolean;
  hasActiveSearch?: boolean;
  /** Notifies the parent when the selected tab changes (including auto-switches). */
  onTabChange?: (tab: QueueTab) => void;
  onToggleComplete: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddFollowUp: (itemId: string, text: string) => Promise<void>;
  onUpdateItem: (id: string, updates: Partial<QueueItem>) => Promise<void>;
  /** Reorder items via drag-and-drop (receives the full reordered items array). */
  onReorderItems?: (items: QueueItem[]) => Promise<void>;
  isLoading?: boolean;
}

export const QueueItemList: React.FC<QueueItemListProps> = ({
  items,
  dictionary,
  hasUnfilteredItems = false,
  hasActiveSearch = false,
  onTabChange,
  onToggleComplete,
  onDelete,
  onAddFollowUp,
  onUpdateItem,
  onReorderItems,
  isLoading = false,
}) => {
  const [selectedTab, setSelectedTab] = useState<QueueTab>(() => {
    try {
      const saved = window.localStorage.getItem(SELECTED_TAB_KEY);
      return saved === 'discussed' ? 'discussed' : 'queue';
    } catch {
      return 'queue';
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(SELECTED_TAB_KEY, selectedTab);
    } catch {
      // ignore
    }

    onTabChange?.(selectedTab);
  }, [onTabChange, selectedTab]);

  // Custom drag state (mouse-based, not native HTML5)
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [tabDropHover, setTabDropHover] = useState<QueueTab | null>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const listRef = useRef<HTMLDivElement>(null);

  // Separate active and completed items
  const activeItems = useMemo(() => items.filter((item) => !item.isCompleted), [items]);
  const completedItems = useMemo(() => items.filter((item) => item.isCompleted), [items]);

  const tabItems = selectedTab === 'queue' ? activeItems : completedItems;

  // Calculate drop target based on mouse position
  const calculateDropTarget = useCallback((clientY: number): DropTarget | null => {
    if (!dragState) return null;

    // Find the index of the dragged item
    const draggedIndex = tabItems.findIndex((item) => item.id === dragState.id);

    for (let i = 0; i < tabItems.length; i++) {
      const item = tabItems[i];
      if (item.id === dragState.id) continue;
      
      const el = itemRefs.current.get(item.id);
      if (!el) continue;

      const rect = el.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;

      // Check if mouse is within this item's vertical bounds (with some padding)
      if (clientY >= rect.top - 10 && clientY <= rect.bottom + 10) {
        // Top half = drop before, bottom half = drop after
        const position: DropPosition = clientY < midY ? 'before' : 'after';

        // Skip if dropping would result in no change:
        // - "before" on the item directly after the dragged item = same position
        // - "after" on the item directly before the dragged item = same position
        if (position === 'before' && i === draggedIndex + 1) {
          return null;
        }
        if (position === 'after' && i === draggedIndex - 1) {
          return null;
        }

        return { id: item.id, position };
      }
    }
    return null;
  }, [dragState, tabItems]);

  // Mouse down - start drag
  const handleMouseDown = useCallback((e: React.MouseEvent, item: QueueItem) => {
    if (!onReorderItems) return;
    // Don't start drag if clicking on buttons or inputs
    const target = e.target as HTMLElement;
    if (target.closest('button, input, textarea, [contenteditable]')) return;

    e.preventDefault();
    setDragState({
      id: item.id,
      text: item.text,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
    });
  }, [onReorderItems]);

  // Mouse move - update drag position and drop target
  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      setDragState((prev) => prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null);
      
      // Check if hovering over tabs
      const queueTab = document.getElementById('queue-tab');
      const discussedTab = document.getElementById('discussed-tab');
      
      if (queueTab) {
        const rect = queueTab.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
          setTabDropHover('queue');
          setDropTarget(null);
          return;
        }
      }
      if (discussedTab) {
        const rect = discussedTab.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
          setTabDropHover('discussed');
          setDropTarget(null);
          return;
        }
      }
      
      setTabDropHover(null);
      setDropTarget(calculateDropTarget(e.clientY));
    };

    const handleMouseUp = () => {
      if (!dragState) return;

      // Handle tab drop
      if (tabDropHover) {
        const draggedItem = items.find((item) => item.id === dragState.id);
        if (draggedItem) {
          const isCurrentlyCompleted = draggedItem.isCompleted;
          const shouldBeCompleted = tabDropHover === 'discussed';

          if (isCurrentlyCompleted !== shouldBeCompleted) {
            void onToggleComplete(dragState.id);
          }
          setSelectedTab(tabDropHover);
        }
      }
      // Handle reorder drop
      else if (dropTarget && onReorderItems) {
        const currentTabItems = selectedTab === 'queue' ? activeItems : completedItems;
        const otherTabItems = selectedTab === 'queue' ? completedItems : activeItems;

        const draggedIndex = currentTabItems.findIndex((item) => item.id === dragState.id);
        let targetIndex = currentTabItems.findIndex((item) => item.id === dropTarget.id);

        if (draggedIndex !== -1 && targetIndex !== -1) {
          // Adjust target index based on drop position
          if (dropTarget.position === 'after') {
            targetIndex += 1;
          }
          // Adjust if dragging from above to below
          if (draggedIndex < targetIndex) {
            targetIndex -= 1;
          }

          const newTabItems = [...currentTabItems];
          const [removed] = newTabItems.splice(draggedIndex, 1);
          newTabItems.splice(targetIndex, 0, removed);

          const newItems = selectedTab === 'queue'
            ? [...newTabItems, ...otherTabItems]
            : [...otherTabItems, ...newTabItems];

          void onReorderItems(newItems);
        }
      }

      setDragState(null);
      setDropTarget(null);
      setTabDropHover(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeItems, calculateDropTarget, completedItems, dragState, dropTarget, items, onReorderItems, onToggleComplete, selectedTab, tabDropHover]);

  // If the user is on a tab with 0 items and the other tab has some, auto-switch.
  // This mostly matters when filtering/searching.
  useEffect(() => {
    if (selectedTab === 'queue' && activeItems.length === 0 && completedItems.length > 0) {
      setSelectedTab('discussed');
    }

    if (selectedTab === 'discussed' && completedItems.length === 0 && activeItems.length > 0) {
      setSelectedTab('queue');
    }
  }, [activeItems.length, completedItems.length, selectedTab]);

  if (isLoading) {
    return (
      <div className="queue-item-list">
        <div className="queue-list-loading">
          <span className="loading-text">Loading data</span>
          <span className="loading-dots">...</span>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    const isNoResults = hasUnfilteredItems && hasActiveSearch;

    const title = isNoResults ? '[ No Results ]' : '[ The Queue Is Clear ]';
    const hint = isNoResults
      ? 'Try a different search query (Esc clears)'
      : 'There is no spoon. Type above to add a discussion point.';

    return (
      <div className="queue-item-list">
        <div className="queue-list-empty">
          <p className="empty-title">{title}</p>
          <p className="empty-hint">{hint}</p>
        </div>
      </div>
    );
  }

  const tabEmptyTitle = (() => {
    if (hasActiveSearch) return selectedTab === 'queue' ? '[ No Results in Queue ]' : '[ No Results in Discussed ]';

    return selectedTab === 'queue' ? '[ The Queue Is Clear ]' : '[ Discussed: Empty ]';
  })();

  const tabEmptyHint = (() => {
    if (hasActiveSearch) return 'Try switching tabs or clearing search (Esc clears)';

    return selectedTab === 'queue'
      ? 'There is no spoon. Add a new point above, or mark items discussed to move them here.'
      : 'Items you mark discussed will show up here.';
  })();

  // Helper to determine if drop indicator should show before or after an item
  const getDropIndicatorPosition = (itemId: string): DropPosition | null => {
    if (!dropTarget || dropTarget.id !== itemId) return null;
    return dropTarget.position;
  };

  return (
    <div className="queue-item-list" ref={listRef}>
      {/* Custom drag ghost */}
      {dragState && (
        <div
          className="custom-drag-ghost"
          style={{
            left: dragState.currentX + 10,
            top: dragState.currentY + 10,
          }}
        >
          <span className="drag-ghost-text">{dragState.text}</span>
        </div>
      )}

      <div className="queue-tabs" role="tablist" aria-label="Queue tabs">
        <button
          type="button"
          className={`queue-tab ${selectedTab === 'queue' ? 'active' : ''} ${tabDropHover === 'queue' ? 'drop-target' : ''}`}
          role="tab"
          aria-selected={selectedTab === 'queue'}
          aria-controls="queue-tabpanel"
          id="queue-tab"
          onClick={() => !dragState && setSelectedTab('queue')}
        >
          Queue ({activeItems.length})
          {tabDropHover === 'queue' && dragState && <span className="drop-hint">Drop to mark active</span>}
        </button>

        <button
          type="button"
          className={`queue-tab ${selectedTab === 'discussed' ? 'active' : ''} ${tabDropHover === 'discussed' ? 'drop-target' : ''}`}
          role="tab"
          aria-selected={selectedTab === 'discussed'}
          aria-controls="queue-tabpanel"
          id="discussed-tab"
          onClick={() => !dragState && setSelectedTab('discussed')}
        >
          Discussed ({completedItems.length})
          {tabDropHover === 'discussed' && dragState && <span className="drop-hint">Drop to mark discussed</span>}
        </button>
      </div>

      <div
        className="queue-tab-panel"
        role="tabpanel"
        id="queue-tabpanel"
        aria-labelledby={selectedTab === 'queue' ? 'queue-tab' : 'discussed-tab'}
      >
        {tabItems.length === 0 ? (
          <div className="queue-list-empty">
            <p className="empty-title">{tabEmptyTitle}</p>
            <p className="empty-hint">{tabEmptyHint}</p>
          </div>
        ) : (
          <div className="queue-section-items">
            {tabItems.map((item) => {
              const dropPosition = getDropIndicatorPosition(item.id);
              const isDragging = dragState?.id === item.id;

              return (
                <div
                  key={item.id}
                  ref={(el) => {
                    if (el) itemRefs.current.set(item.id, el);
                    else itemRefs.current.delete(item.id);
                  }}
                  className={`queue-item-drag-wrapper ${isDragging ? 'dragging' : ''} ${dropPosition ? `drop-target-${dropPosition}` : ''}`}
                  onMouseDown={(e) => handleMouseDown(e, item)}
                  style={{ cursor: onReorderItems ? 'grab' : undefined }}
                >
                  {dropPosition === 'before' && (
                    <div className="drop-indicator drop-indicator-before">
                      <MatrixRainIndicator id={`rain-${item.id}-before`} />
                    </div>
                  )}
                  <QueueItemCard
                    item={item}
                    dictionary={dictionary}
                    onToggleComplete={onToggleComplete}
                    onDelete={onDelete}
                    onAddFollowUp={onAddFollowUp}
                    onUpdateItem={onUpdateItem}
                  />
                  {dropPosition === 'after' && (
                    <div className="drop-indicator drop-indicator-after">
                      <MatrixRainIndicator id={`rain-${item.id}-after`} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
