// Design tokens entry point. Importing this (or the package root) pulls in the
// CSS custom properties for both themes.
import './tokens.css';

export { applyTheme, getTheme, toggleTheme, type ThemeName } from './theme';
