import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { Person } from '../api/people';
import { usePeopleSearch } from '../hooks/usePeopleSearch';
import { Avatar } from './Avatar';
import { Highlight } from './Highlight';

interface PeoplePickerProps {
  label: string;
  value: Person[];
  onChange: (people: Person[]) => void;
  max?: number;
  placeholder?: string;
}

export function PeoplePicker({ label, value, onChange, max = 5, placeholder = 'Search by name or email' }: PeoplePickerProps) {
  const id = useId();
  const inputId = `${id}-input`;
  const listboxId = `${id}-listbox`;
  const hintId = `${id}-hint`;
  const optionId = (index: number) => `${id}-option-${index}`;

  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  // Store the active *person*, not the index, so it survives results being re-ordered or filtered.
  const [activeId, setActiveId] = useState<string | null>(null);

  const isFull = value.length >= max;
  const { state, isPending, retry } = usePeopleSearch(isFull ? '' : inputValue);

  // The server doesn't know what's selected, so filter on the client.
  // Trade-off: this can show fewer than `limit` results. Fine here; with pagination I'd fetch more.
  const options = useMemo(() => {
    if (state.status === 'idle') return [];
    const selected = new Set(value.map((p) => p.id));
    return state.items.filter((p) => !selected.has(p.id));
  }, [state, value]);

  const hasQuery = inputValue.trim() !== '';
  const showPopup = isOpen && hasQuery && !isFull;
  const showListbox = showPopup && options.length > 0;

  // Derived, not synced: if the active person isn't in the current results, fall back to the
  // first option so Enter always picks the top match.
  const foundIndex = options.findIndex((p) => p.id === activeId);
  const activeIndex = foundIndex >= 0 ? foundIndex : options.length > 0 ? 0 : -1;
  const setActiveIndex = (index: number) => setActiveId(options[index]?.id ?? null);

  useEffect(() => {
    if (!showListbox || activeIndex < 0) return;
    document.getElementById(`${id}-option-${activeIndex}`)?.scrollIntoView({ block: 'nearest' });
  }, [id, activeIndex, showListbox]);

  function select(person: Person) {
    if (isFull) return;
    onChange([...value, person]);
    setInputValue('');
    setIsOpen(false);
    inputRef.current?.focus();
  }

  function remove(person: Person) {
    onChange(value.filter((p) => p.id !== person.id));
    inputRef.current?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          return;
        }
        if (options.length === 0) return;
        const delta = e.key === 'ArrowDown' ? 1 : -1;
        setActiveIndex((activeIndex + delta + options.length) % options.length); // wrap around
        return;
      }
      case 'Enter': {
        if (showListbox && activeIndex >= 0) {
          e.preventDefault();
          select(options[activeIndex]);
        }
        return;
      }
      case 'Escape': {
        if (showPopup) {
          e.preventDefault();
          setIsOpen(false);
        } else if (inputValue) {
          setInputValue('');
        }
        return;
      }
      case 'Backspace': {
        if (inputValue === '' && value.length > 0) {
          e.preventDefault();
          onChange(value.slice(0, -1));
        }
        return;
      }
    }
  }

  const statusMessage = (() => {
    if (!showPopup) return '';
    if (state.status === 'error') return 'Error loading results.';
    if (isPending && options.length === 0) return 'Searching…';
    if (state.status === 'success' && options.length === 0) return `No people match "${inputValue.trim()}".`;
    if (options.length > 0) return `${options.length} result${options.length === 1 ? '' : 's'} available.`;
    return '';
  })();

  return (
    <div
      className="picker"
      onBlur={(e) => {
        // Close only when focus leaves the whole component (e.g. not when tabbing to a chip button).
        if (!e.currentTarget.contains(e.relatedTarget)) setIsOpen(false);
      }}
    >
      <label htmlFor={inputId} className="picker-label">
        {label}
      </label>

      {/* The popup is positioned relative to this wrapper so it sits directly under the field. */}
      <div className="picker-anchor">
        {/* Clicking the empty area of the field focuses the input, like a native text field. */}
        <div className="picker-field" onMouseDown={(e) => {
          if (e.target === e.currentTarget) {
            e.preventDefault();
            inputRef.current?.focus();
          }
        }}>
          <ul className="chips" aria-label={`Selected people, ${value.length} of ${max}`}>
            {value.map((person) => (
              <li key={person.id} className="chip">
                <Avatar name={person.name} color={person.avatarColor} size={20} />
                <span className="chip-name" title={`${person.name} <${person.email}>`}>
                  {person.name}
                </span>
                <button type="button" className="chip-remove" aria-label={`Remove ${person.name}`} onClick={() => remove(person)}>
                  ×
                </button>
              </li>
            ))}
          </ul>
  
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showListbox}
            aria-controls={listboxId}
            aria-activedescendant={showListbox && activeIndex >= 0 ? optionId(activeIndex) : undefined}
            aria-describedby={hintId}
            autoComplete="off"
            spellCheck={false}
            className="picker-input"
            placeholder={isFull ? '' : value.length === 0 ? placeholder : ''}
            readOnly={isFull}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={onKeyDown}
          />
        </div>
  
        {/* Always rendered (just hidden) so aria-controls always points at an element that exists. */}
        <div className="popup" hidden={!showPopup}>
          {state.status === 'error' ? (
            <div className="popup-message popup-message--error">
              Couldn't load results.{' '}
              <button type="button" className="link-button" onMouseDown={(e) => e.preventDefault()} onClick={retry}>
                Try again
              </button>
            </div>
          ) : options.length === 0 ? (
            <div className="popup-message">
              {state.status === 'success' && !isPending ? `No people match "${inputValue.trim()}"` : 'Searching…'}
            </div>
          ) : null}
  
          <ul id={listboxId} role="listbox" aria-label="Suggestions" className={`listbox ${isPending ? 'listbox--stale' : ''}`} hidden={!showListbox}>
            {options.map((person, index) => (
              <li
                key={person.id}
                id={optionId(index)}
                role="option"
                aria-selected={index === activeIndex}
                className={`option ${index === activeIndex ? 'option--active' : ''}`}
                // mousedown + preventDefault keeps focus in the input. Otherwise the blur fires first and closes the list before the click lands.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(person)}
                onMouseMove={() => index !== activeIndex && setActiveIndex(index)}
              >
                <Avatar name={person.name} color={person.avatarColor} />
                <span className="option-text">
                  <span className="option-name">
                    <Highlight text={person.name} query={inputValue} />
                  </span>
                  <span className="option-meta">
                    <Highlight text={person.email} query={inputValue} /> · {person.title}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p id={hintId} className={`picker-hint ${isFull ? 'picker-hint--warn' : ''}`}>
        {isFull ? `You've reached the limit of ${max} people. Remove someone to add another.` : `Up to ${max} people.`}
      </p>

      {/* Screen readers announce changes here without moving focus. */}
      <div className="sr-only" role="status" aria-live="polite">
        {statusMessage}
      </div>
    </div>
  );
}
