import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AiSidebar } from './AiSidebar';

describe('AiSidebar', () => {
  it('renders nothing when closed (never speaks first)', () => {
    const { container } = render(<AiSidebar open={false} onClose={vi.fn()} app="writer" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a docked, labelled complementary region when open', () => {
    render(<AiSidebar open onClose={vi.fn()} app="writer" />);
    const region = screen.getByRole('complementary', { name: 'AI assistant' });
    // Docked, not a floating overlay.
    expect(region.tagName).toBe('ASIDE');
    expect(getComputedStyle(region).position).not.toBe('fixed');
  });

  it('carries no AI content surface (no inputs) in the Phase 2 scaffold', () => {
    const { container } = render(<AiSidebar open onClose={vi.fn()} app="sheet" />);
    expect(container.querySelector('input')).toBeNull();
    expect(container.querySelector('textarea')).toBeNull();
  });

  it('collapses only when the user invokes close', () => {
    const onClose = vi.fn();
    render(<AiSidebar open onClose={onClose} app="slides" />);
    fireEvent.click(screen.getByRole('button', { name: 'Close AI assistant' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
