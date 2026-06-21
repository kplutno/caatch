import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Extend the official Next.js recommended rule sets:
  //   - eslint-config-next/core-web-vitals  → React, hooks, a11y, import hygiene
  //   - eslint-config-next                  → Next.js specific rules
  ...compat.extends('next/core-web-vitals'),

  // Global ignores – never lint generated or vendored output
  {
    ignores: [
      '.next/**',
      'out/**',
      'node_modules/**',
      'public/**',
    ],
  },

  // Project-wide rule overrides
  {
    rules: {
      // ── Possible errors ──────────────────────────────────────────────────
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      'no-debugger': 'error',
      'no-duplicate-imports': 'error',

      // ── Best practices ────────────────────────────────────────────────────
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      'no-unused-vars': ['error', { vars: 'all', args: 'after-used', ignoreRestSiblings: true, varsIgnorePattern: '^_' }],
      'no-var': 'error',
      'prefer-const': ['error', { destructuring: 'all' }],

      // ── React ─────────────────────────────────────────────────────────────
      // next/core-web-vitals already sets up eslint-plugin-react and
      // eslint-plugin-react-hooks; these just tighten a few rules.
      'react/self-closing-comp': ['warn', { component: true, html: false }],
      'react/jsx-no-useless-fragment': 'warn',
      'react-hooks/exhaustive-deps': 'warn',

      // ── Next.js ───────────────────────────────────────────────────────────
      // Already handled by next/core-web-vitals; listed here for visibility.
      '@next/next/no-html-link-for-pages': 'error',
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'no-unused-vars': 'off',
    },
  },
];

export default eslintConfig;
