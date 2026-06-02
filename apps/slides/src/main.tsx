import { applyTheme } from '@234/shared';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Dark mode is the suite default (root CLAUDE.md Section 5).
applyTheme('dark');

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
