import { type Command } from './types';

// Module-level command registry. Each app registers its own commands; the
// shared palette renders them. See apps/shared/CLAUDE.md Section 6.
const commands = new Map<string, Command>();
const listeners = new Set<() => void>();

// Cached snapshot so useSyncExternalStore sees a stable reference between
// changes (a fresh array each read would loop).
let snapshot: Command[] = [];

function rebuild(): void {
  snapshot = [...commands.values()];
}

function emit(): void {
  rebuild();
  for (const listener of listeners) listener();
}

/** Register a command. Returns an unregister function. */
export function registerCommand(command: Command): () => void {
  commands.set(command.id, command);
  emit();
  return () => unregisterCommand(command.id);
}

export function unregisterCommand(id: string): void {
  if (commands.delete(id)) emit();
}

export function getCommands(): Command[] {
  return snapshot;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
