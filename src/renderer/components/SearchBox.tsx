/**
 * SearchBox - Small search input used to filter queue items.
 */

import { forwardRef, useImperativeHandle, useRef } from 'react';
import './SearchBox.css';

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  disabled?: boolean;
}

export interface SearchBoxRef {
  focus: () => void;
}

export const SearchBox = forwardRef<SearchBoxRef, SearchBoxProps>(
  ({ value, onChange, onClear, disabled = false }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          inputRef.current?.focus();
          inputRef.current?.select();
        },
      }),
      []
    );

    const hasValue = value.trim().length > 0;

    return (
      <div className="search-box" role="search" aria-label="Search queue">
        <input
          ref={inputRef}
          type="search"
          className="search-box-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search (Ctrl+F)…"
          disabled={disabled}
          aria-label="Search items"
        />
        {hasValue && (
          <button
            type="button"
            className="search-box-clear"
            onClick={onClear}
            aria-label="Clear search"
            disabled={disabled}
          >
            ×
          </button>
        )}
      </div>
    );
  }
);

SearchBox.displayName = 'SearchBox';
