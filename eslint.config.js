import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      // Tauri/Rust build output (generated JS/assets — never our source).
      '**/src-tauri/target/**',
      '**/src-tauri/gen/**',
      // Author tooling — plain Node ESM, run manually to generate templates.
      'apps/slides/templates/scaffold.mjs',
      // Docs-site generator — plain Node ESM author tooling.
      'packages/docs-site/build.mjs',
      // Collaboration relay — standalone Node server, run manually.
      'packages/collab/relay/**',
      // Repo tooling scripts (checks, session-start) — plain Node ESM.
      'scripts/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Allow intentionally-unused identifiers via a leading underscore.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
);
