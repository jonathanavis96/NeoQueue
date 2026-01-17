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
import type { QueueItem } from '../../shared/types';
import { extractLearnedTokens } from '../../shared/dictionary';
import { experimentalFlags } from '../experimentalFlags';
import { useAutocomplete } from '../hooks';
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

export const CanvasView = forwardRef<CanvasViewRef, CanvasViewProps>(({ items, onAddItem, isLoading }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [cursor, setCursor] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dictionary = useMemo(() => extractLearnedTokens(items), [items]);
  const popoverId = useId();

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

  const layout = useMemo(() => {
    // No layout persistence in the prototype. We still want items visible on the canvas,
    // so we scatter them deterministically based on id.
    return items.map((item) => {
      const u1 = hashToUnit(item.id);
      const u2 = hashToUnit(`${item.id}:y`);
      return {
        item,
        leftPct: 8 + u1 * 84,
        topPct: 12 + u2 * 78,
      };
    });
  }, [items]);

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
        onClick={handleContainerClick}
      >
        {layout.map(({ item, leftPct, topPct }) => (
          <div
            key={item.id}
            className={`canvas-node ${item.isCompleted ? 'completed' : ''}`}
            style={{ left: `${leftPct}%`, top: `${topPct}%` }}
            title={item.text}
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
