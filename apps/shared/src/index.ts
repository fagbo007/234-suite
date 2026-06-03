// @234/shared — design system entry point.
//
// Importing this module (or the package root) pulls in the design tokens for
// both themes as a side effect, then exposes the base components, the command
// palette, and theme helpers. See apps/shared/CLAUDE.md.

export { applyTheme, getTheme, toggleTheme, type ThemeName } from '../design-tokens';

export {
  MOD,
  OFFICE_SHORTCUTS,
  matchShortcut,
  parseShortcut,
  toProseMirrorKey,
  useShortcuts,
  type ParsedShortcut,
  type ShortcutBindings,
} from './shortcuts';

export {
  Button,
  type ButtonProps,
  type ButtonVariant,
  type ButtonSize,
} from '../components/Button';
export { Input, type InputProps } from '../components/Input';
export { Icon, type IconProps, type IconSize } from '../components/Icon';
export {
  ImportReportPanel,
  type ImportReportPanelProps,
  type ImportReportLike,
} from '../components/ImportReportPanel';
export {
  CommandPalette,
  type CommandPaletteProps,
  useCommandPalette,
  useCommands,
  type UseCommandPalette,
  registerCommand,
  unregisterCommand,
  getCommands,
  fuzzyMatch,
  rankCommands,
  type FuzzyMatch,
  type Command,
  type SelectionContext,
} from '../components/CommandPalette';
