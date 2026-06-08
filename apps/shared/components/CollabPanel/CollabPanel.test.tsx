import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CollabPanel } from './CollabPanel';

describe('CollabPanel', () => {
  it('starts a session from the idle state', () => {
    const onStart = vi.fn();
    render(
      <CollabPanel active={false} code={null} onStart={onStart} onJoin={vi.fn()} onLeave={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Start session' }));
    expect(onStart).toHaveBeenCalledOnce();
  });

  it('joins with an entered code', () => {
    const onJoin = vi.fn().mockReturnValue(null);
    render(
      <CollabPanel active={false} code={null} onStart={vi.fn()} onJoin={onJoin} onLeave={vi.fn()} />,
    );
    fireEvent.change(screen.getByLabelText('Session code'), { target: { value: '234-K7Q2-9FMR' } });
    fireEvent.click(screen.getByRole('button', { name: 'Join' }));
    expect(onJoin).toHaveBeenCalledWith('234-K7Q2-9FMR', undefined);
  });

  it('surfaces a join error', () => {
    const onJoin = vi.fn().mockReturnValue('Enter a valid session code.');
    render(
      <CollabPanel active={false} code={null} onStart={vi.fn()} onJoin={onJoin} onLeave={vi.fn()} />,
    );
    fireEvent.change(screen.getByLabelText('Session code'), { target: { value: 'bad' } });
    fireEvent.click(screen.getByRole('button', { name: 'Join' }));
    expect(screen.getByRole('alert').textContent).toContain('valid session code');
  });

  it('shows the code and a leave control when active', () => {
    const onLeave = vi.fn();
    render(
      <CollabPanel
        active
        code="234-K7Q2-9FMR"
        onStart={vi.fn()}
        onJoin={vi.fn()}
        onLeave={onLeave}
      />,
    );
    expect(screen.getByLabelText('Session code').textContent).toBe('234-K7Q2-9FMR');
    fireEvent.click(screen.getByRole('button', { name: 'Leave session' }));
    expect(onLeave).toHaveBeenCalledOnce();
  });

  it('renders a roster of collaborators when active', () => {
    render(
      <CollabPanel
        active
        code="234-K7Q2-9FMR"
        onStart={vi.fn()}
        onJoin={vi.fn()}
        onLeave={vi.fn()}
        peers={[
          { clientId: 1, user: { name: 'Ada', color: '#1971c2' } },
          { clientId: 2, user: { name: 'Linus', color: '#2f9e44' } },
        ]}
      />,
    );
    const roster = screen.getByLabelText('Collaborators');
    expect(roster.textContent).toContain('Ada');
    expect(roster.textContent).toContain('Linus');
  });
});
