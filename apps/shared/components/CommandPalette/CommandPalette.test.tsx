import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CommandPalette } from './CommandPalette';
import { getCommands, registerCommand, unregisterCommand } from './registry';

afterEach(() => {
  // Unmount before clearing the registry so unregistering does not re-render a
  // still-mounted palette outside act().
  cleanup();
  for (const command of getCommands()) unregisterCommand(command.id);
});

describe('CommandPalette', () => {
  it('filters by query and runs the active command on Enter', () => {
    const run = vi.fn();
    registerCommand({ id: 'toggle', title: 'Toggle theme', run });
    registerCommand({ id: 'new', title: 'New document', run: vi.fn() });
    const onClose = vi.fn();

    render(<CommandPalette isOpen onClose={onClose} />);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'toggle' } });

    expect(screen.getAllByRole('option')).toHaveLength(1);
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(run).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('navigates with arrow keys', () => {
    const runApple = vi.fn();
    const runApricot = vi.fn();
    registerCommand({ id: 'apple', title: 'Apple', run: runApple });
    registerCommand({ id: 'apricot', title: 'Apricot', run: runApricot });

    render(<CommandPalette isOpen onClose={vi.fn()} />);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'ap' } });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(runApricot).toHaveBeenCalledTimes(1);
    expect(runApple).not.toHaveBeenCalled();
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(<CommandPalette isOpen onClose={onClose} />);
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('hides commands that are unavailable for the context', () => {
    registerCommand({
      id: 'sheet-only',
      title: 'Sheet only command',
      isAvailable: (ctx) => ctx.app === 'sheet',
      run: vi.fn(),
    });
    registerCommand({ id: 'always', title: 'Always available', run: vi.fn() });

    render(<CommandPalette isOpen onClose={vi.fn()} context={{ app: 'writer' }} />);
    const titles = screen.getAllByRole('option').map((option) => option.textContent);
    expect(titles.some((text) => text?.includes('Always available'))).toBe(true);
    expect(titles.some((text) => text?.includes('Sheet only'))).toBe(false);
  });
});
