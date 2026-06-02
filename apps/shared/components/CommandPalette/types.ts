import { type IconProps } from '../Icon';

/**
 * Describes the current selection state. The palette uses this to show only
 * commands relevant to the context — the context-adaptive surface that replaces
 * a ribbon (root CLAUDE.md Section 5).
 */
export interface SelectionContext {
  /** App identifier, e.g. 'writer' | 'sheet' | 'slides'. */
  app?: string;
  /** Coarse description of the current selection. */
  selection?: string;
  [key: string]: unknown;
}

export interface Command {
  id: string;
  /** Sentence case (root CLAUDE.md Section 5). */
  title: string;
  icon?: IconProps['icon'];
  group?: string;
  /** Return false to hide the command for the current context. */
  isAvailable?(ctx: SelectionContext): boolean;
  run(ctx: SelectionContext): void;
}
