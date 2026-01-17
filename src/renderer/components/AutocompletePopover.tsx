/**
 * AutocompletePopover
 *
 * Minimal suggestion UI for tab-autocomplete. It does not take focus; the input
 * remains focused and uses aria-activedescendant to expose the active option.
 */

import React from 'react';
import './AutocompletePopover.css';

export interface AutocompletePopoverProps {
  id: string;
  suggestions: readonly string[];
  selectedIndex: number;
  isOpen: boolean;
}

export const AutocompletePopover: React.FC<AutocompletePopoverProps> = ({
  id,
  suggestions,
  selectedIndex,
  isOpen,
}) => {
  if (!isOpen || suggestions.length === 0) return null;

  return (
    <div className="autocomplete-popover" role="presentation">
      <div className="autocomplete-popover-inner" role="listbox" id={id} aria-label="Autocomplete suggestions">
        {suggestions.map((value, i) => {
          const optionId = `${id}-opt-${i}`;
          const isSelected = i === selectedIndex;

          return (
            <div
              key={`${value}-${optionId}`}
              id={optionId}
              role="option"
              aria-selected={isSelected}
              className={`autocomplete-option ${isSelected ? 'selected' : ''}`}
            >
              {value}
            </div>
          );
        })}
      </div>
      <div className="autocomplete-hint" aria-hidden="true">
        Tab to accept
      </div>
    </div>
  );
};

