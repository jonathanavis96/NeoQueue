import type { QueueItem } from './types';

/**
 * Apply a drag-and-drop reorder of the visible items to the full item list.
 *
 * The list only ever sees one project, narrowed further by any search, so
 * `visibleInNewOrder` is a subset of `allItems`. The visible items trade places
 * among the slots they already hold, and every other item stays where it is.
 * The item objects come from `allItems`, so a reorder based on a slightly stale
 * render cannot bring back old field values.
 */
export const mergeReorderedItems = (
  allItems: QueueItem[],
  visibleInNewOrder: QueueItem[]
): QueueItem[] => {
  const current = new Map(allItems.map((item) => [item.id, item]));
  const queue = visibleInNewOrder.filter((item) => current.has(item.id));
  const moving = new Set(queue.map((item) => item.id));

  let next = 0;
  return allItems.map((item) => {
    if (!moving.has(item.id)) return item;
    return current.get(queue[next++].id) as QueueItem;
  });
};
