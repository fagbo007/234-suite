import type { Icon as TablerIcon } from '@tabler/icons-react';

// Size keys map to the type scale (root CLAUDE.md Section 5).
const SIZE = { meta: 14, body: 16, emphasis: 20 } as const;
export type IconSize = keyof typeof SIZE | number;

export interface IconProps {
  /** A Tabler **outline** icon component, e.g. `IconSearch`. */
  icon: TablerIcon;
  size?: IconSize;
  /** Accessible name. When omitted the icon is treated as decorative. */
  label?: string;
  className?: string;
}

/**
 * Wrapper for Tabler outline icons. Filled variants and hand-drawn paths are
 * forbidden (root CLAUDE.md Section 5). Pass `label` for icon-only controls so
 * they expose an accessible name (Section 12).
 */
export function Icon({ icon: Glyph, size = 'body', label, className }: IconProps) {
  const px = typeof size === 'number' ? size : SIZE[size];
  const a11y = label
    ? ({ role: 'img', 'aria-label': label } as const)
    : ({ 'aria-hidden': true } as const);
  return <Glyph size={px} stroke={1.75} className={className} {...a11y} />;
}
