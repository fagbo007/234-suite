import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PluginManager } from './PluginManager';

describe('PluginManager', () => {
  it('lists plugins and toggles them via the checkbox', () => {
    const onToggle = vi.fn();
    render(
      <PluginManager
        items={[
          { id: 'a', name: 'Sample echo provider', enabled: true },
          { id: 'b', name: 'Other plugin', enabled: false },
        ]}
        onToggle={onToggle}
      />,
    );

    const enabled = screen.getByLabelText('Sample echo provider') as HTMLInputElement;
    expect(enabled.checked).toBe(true);
    expect((screen.getByLabelText('Other plugin') as HTMLInputElement).checked).toBe(false);

    fireEvent.click(enabled); // turn it off
    expect(onToggle).toHaveBeenCalledWith('a', false);
  });

  it('renders nothing when there are no plugins', () => {
    const { container } = render(<PluginManager items={[]} onToggle={vi.fn()} />);
    expect(container.querySelector('section')).toBeNull();
  });
});
