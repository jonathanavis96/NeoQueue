/**
 * QueueItemList - Container component for displaying queue items
 */

import React from 'react';
import { QueueItem } from '../../shared/types';
import { QueueItemCard } from './QueueItemCard';
import './QueueItemList.css';

interface QueueItemListProps {
  items: QueueItem[];
  onToggleComplete: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddFollowUp: (itemId: string, text: string) => Promise<void>;
  isLoading?: boolean;
}

export const QueueItemList: React.FC<QueueItemListProps> = ({
  items,
  onToggleComplete,
  onDelete,
  onAddFollowUp,
  isLoading = false,
}) => {
  // Separate active and completed items
  const activeItems = items.filter((item) => !item.isCompleted);
  const completedItems = items.filter((item) => item.isCompleted);

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
    return (
      <div className="queue-item-list">
        <div className="queue-list-empty">
          <p className="empty-title">[ Queue Empty ]</p>
          <p className="empty-hint">Type above to add your first discussion point</p>
        </div>
      </div>
    );
  }

  return (
    <div className="queue-item-list">
      {activeItems.length > 0 && (
        <section className="queue-section">
          <h2 className="queue-section-title">
            Active ({activeItems.length})
          </h2>
          <div className="queue-section-items">
            {activeItems.map((item) => (
              <QueueItemCard
                key={item.id}
                item={item}
                onToggleComplete={onToggleComplete}
                onDelete={onDelete}
                onAddFollowUp={onAddFollowUp}
              />
            ))}
          </div>
        </section>
      )}

      {completedItems.length > 0 && (
        <section className="queue-section completed">
          <h2 className="queue-section-title">
            Discussed ({completedItems.length})
          </h2>
          <div className="queue-section-items">
            {completedItems.map((item) => (
              <QueueItemCard
                key={item.id}
                item={item}
                onToggleComplete={onToggleComplete}
                onDelete={onDelete}
                onAddFollowUp={onAddFollowUp}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
