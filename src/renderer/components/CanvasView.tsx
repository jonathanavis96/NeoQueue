import React, {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { CanvasNodePosition, QueueItem } from '../../shared/types';
import { extractLearnedTokens } from '../../shared/dictionary';
import { useExperimentalFlags, useAutocomplete } from '../hooks';
import { AutocompletePopover } from './AutocompletePopover';
import './CanvasView.css';

export interface CanvasViewRef {
  openNewItemAtCenter: () => void;
}

interface Draft {
  x: number;
  y: number;
  text: string;
}

interface CanvasViewProps {
  items: QueueItem[];
  /** Optional persisted positions keyed by item id. */
  positions: Record<string, CanvasNodePosition>;
  onMoveItem: (id: string, position: CanvasNodePosition) => Promise<void>;
  onAddItem: (text: string) => Promise<void>;
  isLoading: boolean;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const hashToUnit = (input: string): number => {
  // A tiny deterministic hash -> [0,1).
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  // unsigned
  return (hash >>> 0) / 2 ** 32;
};

export const CanvasView = forwardRef<CanvasViewRef, CanvasViewProps>(
  ({ items, positions, onMoveItem, onAddItem, isLoading }, ref) => {

  const containerRef = useRef<HTMLDivElement>(null);
  const [dragPositions, setDragPositions] = useState<Record<string, CanvasNodePosition>>({});
  const dragRef = useRef<{
    id: string;
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startLeftPct: number;
    startTopPct: number;
    didDrag: boolean;
    rafId: number | null;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [cursor, setCursor] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dictionary = useMemo(() => extractLearnedTokens(items), [items]);
  const popoverId = useId();

  const { flags: experimentalFlags } = useExperimentalFlags();

  const { state: acState, handleKeyDown: handleAutocompleteKeyDown } = useAutocomplete({
    value: draft?.text ?? '',
    cursor,
    dictionary,
    enabled: experimentalFlags.autocomplete,
  });

  const activeDescendantId = acState.isOpen
    ? `${popoverId}-opt-${Math.max(0, Math.min(acState.selectedIndex, acState.suggestions.length - 1))}`
    : undefined;

  const syncCursorFromDom = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const next = el.selectionStart ?? el.value.length;
    setCursor(next);
  }, []);

  const openAt = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = clamp(clientX - rect.left, 12, rect.width - 220);
    const y = clamp(clientY - rect.top, 12, rect.height - 40);

    setDraft({ x, y, text: '' });
    setCursor(0);
  }, []);

  const openAtCenter = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 3;
    openAt(centerX, centerY);
  }, [openAt]);

  useImperativeHandle(ref, () => ({
    openNewItemAtCenter: openAtCenter,
  }), [openAtCenter]);

  useEffect(() => {
    if (!draft) return;
    // Let the input mount before focusing.
    const id = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(id);
  }, [draft]);

  useEffect(() => {
    // Keep cursor state in sync when opening a fresh draft.
    if (!draft) return;
    window.requestAnimationFrame(() => syncCursorFromDom());
  }, [draft, syncCursorFromDom]);


  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    if (isLoading) return;

    // Ignore clicks that originate from the draft UI itself.
    const target = e.target as HTMLElement | null;
    if (target?.closest('.canvas-draft')) return;

    openAt(e.clientX, e.clientY);
  }, [isLoading, openAt]);

  const handleKeyDown = useCallback(async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!draft) return;

    const result = handleAutocompleteKeyDown(e);
    if (result.handled) {
      if (result.accept) {
        const accept = result.accept;
        setDraft({ ...draft, text: accept.nextValue });
        window.requestAnimationFrame(() => {
          if (!inputRef.current) return;
          inputRef.current.setSelectionRange(accept.nextCursor, accept.nextCursor);
          setCursor(accept.nextCursor);
        });
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setDraft(null);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = draft.text.trim();
      if (!trimmed || isSubmitting || isLoading) return;

      setIsSubmitting(true);
      try {
        await onAddItem(trimmed);
        setDraft(null);
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [draft, handleAutocompleteKeyDown, isSubmitting, isLoading, onAddItem]);

  const effectivePositions = useMemo(
    () => ({ ...positions, ...dragPositions }),
    [dragPositions, positions]
  );

  const layout = useMemo(() => {
    return items.map((item) => {
      const persisted = effectivePositions[item.id];
      if (persisted) {
        return { item, leftPct: persisted.leftPct, topPct: persisted.topPct };
      }

      // No persisted layout yet. Scatter deterministically based on id.
      const u1 = hashToUnit(item.id);
      const u2 = hashToUnit(`${item.id}:y`);
      return {
        item,
        leftPct: 8 + u1 * 84,
        topPct: 12 + u2 * 78,
      };
    });
  }, [effectivePositions, items]);

  const scheduleDragUpdate = useCallback((id: string, next: CanvasNodePosition) => {
    const current = dragRef.current;
    if (!current || current.id !== id) return;

    if (current.rafId != null) cancelAnimationFrame(current.rafId);
    current.rafId = window.requestAnimationFrame(() => {
      setDragPositions((prev) => ({ ...prev, [id]: next }));
    });
  }, []);

  const finalizeDrag = useCallback(async () => {
    const current = dragRef.current;
    if (!current) return;

    const id = current.id;
    const pos = dragPositions[id];

    dragRef.current = null;

    if (!pos || !current.didDrag) {
      setDragPositions((prev) => {
        // Remove the temporary drag position for this item.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [id]: _removed, ...rest } = prev;
        return rest;
      });
      return;
    }

    try {
      await onMoveItem(id, pos);
    } finally {
      setDragPositions((prev) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [id]: _removed, ...rest } = prev;
        return rest;
      });
    }
  }, [dragPositions, onMoveItem]);

  useEffect(() => {
    const handlePointerMove = (event: Event) => {
      if (!(event instanceof PointerEvent)) return;

      const current = dragRef.current;
      if (!current || event.pointerId !== current.pointerId) return;
      const surface = containerRef.current;
      if (!surface) return;

      // Avoid scrolling/selection during drag on touch/trackpads.
      event.preventDefault();

      const rect = surface.getBoundingClientRect();
      const dx = event.clientX - current.startClientX;
      const dy = event.clientY - current.startClientY;

      if (!current.didDrag && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        current.didDrag = true;
      }

      const nextLeftPct = clamp(current.startLeftPct + (dx / rect.width) * 100, 0, 100);
      const nextTopPct = clamp(current.startTopPct + (dy / rect.height) * 100, 0, 100);

      scheduleDragUpdate(current.id, { leftPct: nextLeftPct, topPct: nextTopPct });
    };

    const handlePointerUp = (event: Event) => {
      if (!(event instanceof PointerEvent)) return;

      const current = dragRef.current;
      if (!current || event.pointerId !== current.pointerId) return;
      void finalizeDrag();
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [finalizeDrag, scheduleDragUpdate]);

  return (
    <div className="canvas-root">
      <div className="canvas-hint" aria-hidden="true">
        Click to add • Enter to save • Esc to cancel
      </div>
      <div
        ref={containerRef}
        className={`canvas-surface ${isLoading ? 'is-loading' : ''}`}
        role="region"
        aria-label="Canvas view"
        onClick={(e) => {
          // If a drag just happened, ignore the click.
          if (dragRef.current?.didDrag) {
            e.preventDefault();
            return;
          }
          handleContainerClick(e);
        }}
      >
        {layout.map(({ item, leftPct, topPct }) => (
          <div
            key={item.id}
            className={`canvas-node ${item.isCompleted ? 'completed' : ''}`}
            style={{ left: `${leftPct}%`, top: `${topPct}%` }}
            title={item.text}
            role="button"
            tabIndex={0}
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              e.stopPropagation();

              const surface = containerRef.current;
              if (!surface) return;
              const start = effectivePositions[item.id] ?? { leftPct, topPct };

              dragRef.current = {
                id: item.id,
                pointerId: e.pointerId,
                startClientX: e.clientX,
                startClientY: e.clientY,
                startLeftPct: start.leftPct,
                startTopPct: start.topPct,
                didDrag: false,
                rafId: null,
              };

              // Make sure we have a local position entry during drag.
              setDragPositions((prev) => ({ ...prev, [item.id]: start }));

              // Capture pointer so we continue getting events.
              surface.setPointerCapture(e.pointerId);

              // Prevent text selection.
              window.getSelection?.()?.removeAllRanges();

            }}
          >
            {item.text}
          </div>
        ))}

        {draft && (
          <div className="canvas-draft" style={{ left: draft.x, top: draft.y }}>
            <span className="canvas-draft-prompt" aria-hidden="true">&gt;</span>
            <div className="canvas-draft-input-wrap">
              <input
                ref={inputRef}
                className="canvas-draft-input"
                type="text"
                value={draft.text}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={acState.isOpen}
                onChange={(e) => {
                  setDraft({ ...draft, text: e.target.value });
                  syncCursorFromDom();
                }}
                onKeyDown={handleKeyDown}
                onSelect={syncCursorFromDom}
                onKeyUp={syncCursorFromDom}
                placeholder="Type and press Enter..."
                disabled={isSubmitting || isLoading}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
                aria-label="New discussion item"
                aria-controls={acState.isOpen ? popoverId : undefined}
                aria-activedescendant={activeDescendantId}
              />
              <AutocompletePopover
                id={popoverId}
                suggestions={acState.suggestions}
                selectedIndex={acState.selectedIndex}
                isOpen={acState.isOpen}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

CanvasView.displayName = 'CanvasView';
