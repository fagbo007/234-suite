import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const invoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => invoke(...args),
}));

type Win = Record<string, unknown>;

describe('234 Launcher app', () => {
  beforeEach(() => {
    invoke.mockReset();
    invoke.mockResolvedValue(undefined);
  });

  afterEach(() => {
    delete (window as unknown as Win).__TAURI_INTERNALS__;
  });

  it('renders a card with an open control for each suite app', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: '234 suite' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open 234 Writer' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open 234 Sheet' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open 234 Slides' })).toBeTruthy();
  });

  it('invokes launch_app with the app id when running in the desktop shell', async () => {
    (window as unknown as Win).__TAURI_INTERNALS__ = {};
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Open 234 Sheet' }));
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('launch_app', { app: 'sheet' }));
  });

  it('shows a friendly note instead of invoking in the plain web build', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Open 234 Writer' }));
    expect(invoke).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toContain('desktop suite');
  });
});
