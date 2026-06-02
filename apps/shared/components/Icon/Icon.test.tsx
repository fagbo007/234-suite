import { IconSearch } from '@tabler/icons-react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Icon } from './Icon';

describe('Icon', () => {
  it('is decorative (aria-hidden) without a label', () => {
    const { container } = render(<Icon icon={IconSearch} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
  });

  it('exposes an accessible name when labelled', () => {
    const { getByRole } = render(<Icon icon={IconSearch} label="Search" />);
    expect(getByRole('img', { name: 'Search' })).toBeTruthy();
  });
});
