import { useEffect, useRef } from 'react';
import './search-bar.scss';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  /** Bind "/" as a global shortcut to focus this field. */
  slashShortcut?: boolean;
}

export function SearchBar({ value, onChange, placeholder, autoFocus, slashShortcut }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!slashShortcut) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === '/' && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement)) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [slashShortcut]);

  return (
    <div className="search-bar">
      <span className="search-bar__icon" aria-hidden="true">
        ⌕
      </span>
      <input
        ref={inputRef}
        className="search-bar__input"
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? 'Search cookies… (domain:foo name:bar)'}
        autoFocus={autoFocus}
        aria-label="Search cookies"
      />
      {value && (
        <button
          type="button"
          className="search-bar__clear"
          aria-label="Clear search"
          onClick={() => onChange('')}
        >
          ×
        </button>
      )}
    </div>
  );
}
