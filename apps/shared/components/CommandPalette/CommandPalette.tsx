import { type KeyboardEvent as ReactKeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../Icon';
import { rankCommands } from './fuzzy';
import { type Command, type SelectionContext } from './types';
import { useCommands } from './useCommandPalette';
import styles from './CommandPalette.module.css';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  /** Current selection state used for context-adaptive filtering. */
  context?: SelectionContext;
}

/**
 * Accessible, context-adaptive command palette. Shows only commands available
 * for the current context, ranked by fuzzy search. Keyboard: ArrowUp/Down to
 * move, Enter to run, Esc to close (root CLAUDE.md Section 5).
 */
export function CommandPalette({ isOpen, onClose, context = {} }: CommandPaletteProps) {
  const commands = useCommands();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const available = useMemo(
    () => commands.filter((command) => (command.isAvailable ? command.isAvailable(context) : true)),
    [commands, context],
  );
  const results = useMemo(() => rankCommands(query, available), [query, available]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      inputRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const active: Command | undefined = results[activeIndex];

  const runCommand = (command: Command | undefined) => {
    if (!command) return;
    onClose();
    command.run(context);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, Math.max(results.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      runCommand(active);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <div
        className={styles.palette}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <input
          ref={inputRef}
          className={styles.input}
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls="command-palette-list"
          aria-activedescendant={active ? `cmd-${active.id}` : undefined}
          aria-label="Search commands"
          placeholder="Type a command…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={onKeyDown}
        />
        <ul
          className={styles.list}
          id="command-palette-list"
          role="listbox"
          aria-label="Commands"
        >
          {results.length === 0 ? (
            <li className={styles.empty}>No matching commands</li>
          ) : (
            results.map((command, index) => (
              <li
                key={command.id}
                id={`cmd-${command.id}`}
                role="option"
                aria-selected={index === activeIndex}
                className={[styles.option, index === activeIndex ? styles.active : '']
                  .filter(Boolean)
                  .join(' ')}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => {
                  event.preventDefault();
                  runCommand(command);
                }}
              >
                {command.icon ? <Icon icon={command.icon} size="body" /> : null}
                <span className={styles.title}>{command.title}</span>
                {command.group ? <span className={styles.group}>{command.group}</span> : null}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
