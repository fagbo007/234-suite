// @234/desktop — native file I/O bridge (root CLAUDE.md §3.5). The JS twin of the
// app234_files Rust crate: OS open/save dialogs + text read/write on the desktop,
// with a browser fallback for the web dev build. See packages/file-io (Rust).
export {
  type FileFilter,
  type OpenResult,
  isDesktop,
  pickOpenPath,
  pickSavePath,
  readTextFile,
  writeTextFile,
  openTextFile,
  saveTextFile,
} from './files';
export {
  type RecentFile,
  addRecent,
  getRecent,
  clearRecent,
  subscribeRecent,
  baseName,
} from './recents';
export { useRecentFiles, type UseRecentFiles } from './useRecentFiles';
