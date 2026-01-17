/**
 * QueueItemList - Container component for displaying queue items
 */

import React, { useEffect, useMemo, useState } from 'react';
import { QueueItem } from '../../shared/types';
import { QueueItemCard } from './QueueItemCard';
import './QueueItemList.css';

type QueueTab = 'queue' | 'discussed';

const SELECTED_TAB_KEY = 'neoqueue.ui.selectedTab';

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

  // Separate active and completed items
  const activeItems = useMemo(() => items.filter((item) => !item.isCompleted), [items]);
  const completedItems = useMemo(() => items.filter((item) => item.isCompleted), [items]);

  const tabItems = selectedTab === 'queue' ? activeItems : completedItems;

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

  return (
    <div className="queue-item-list">
      <div className="queue-tabs" role="tablist" aria-label="Queue tabs">
        <button
          type="button"
          className={`queue-tab ${selectedTab === 'queue' ? 'active' : ''}`}
          role="tab"
          aria-selected={selectedTab === 'queue'}
          aria-controls="queue-tabpanel"
          id="queue-tab"
          onClick={() => setSelectedTab('queue')}
        >
          Queue ({activeItems.length})
        </button>

        <button
          type="button"
          className={`queue-tab ${selectedTab === 'discussed' ? 'active' : ''}`}
          role="tab"
          aria-selected={selectedTab === 'discussed'}
          aria-controls="queue-tabpanel"
          id="discussed-tab"
          onClick={() => setSelectedTab('discussed')}
        >
          Discussed ({completedItems.length})
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
            {tabItems.map((item) => (
              <QueueItemCard
                key={item.id}
                item={item}
                dictionary={dictionary}
                onToggleComplete={onToggleComplete}
                onDelete={onDelete}
                onAddFollowUp={onAddFollowUp}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
