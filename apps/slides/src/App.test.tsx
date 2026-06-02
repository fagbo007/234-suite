import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('234 Slides scaffold', () => {
  it('renders the scaffold heading', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /scaffold/i })).toBeTruthy();
  });
});
