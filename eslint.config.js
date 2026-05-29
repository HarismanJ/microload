import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import reactPlugin from 'eslint-plugin-react'
import importPlugin from 'eslint-plugin-import'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist',
    'dist-debug',
    'coverage',
    'playwright-report',
    'test-results',
    'android/app/build',
    'android/app/src/main/assets',
    'ios/App/App/public',
  ]),
  {
    files: ['*.config.js', 'vite.config.js', 'vitest.config.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['src/**/*.test.{js,jsx}', 'src/__tests__/**/*.{js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        afterAll: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        beforeEach: 'readonly',
        describe: 'readonly',
        expect: 'readonly',
        it: 'readonly',
        vi: 'readonly',
      },
    },
  },
  {
    files: ['e2e/**/*.{js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        afterAll: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        beforeEach: 'readonly',
        describe: 'readonly',
        expect: 'readonly',
        it: 'readonly',
        test: 'readonly',
        vi: 'readonly',
      },
    },
  },
  {
    files: ['public/sw.js'],
    languageOptions: {
      globals: globals.serviceworker,
    },
  },
  {
    files: ['**/*.{js,jsx}'],
    plugins: {
      react: reactPlugin,
      import: importPlugin,
    },
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'valid-typeof': ['error', { requireStringLiterals: true }],
      'use-isnan': 'error',
      'no-fallthrough': 'error',
      'no-empty': ['error', { allowEmptyCatch: false }],
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      'react/jsx-key': ['error', { checkFragmentShorthand: true }],
      'react/no-array-index-key': 'warn',
      'import/no-cycle': 'error',
    },
  },
  {
    files: ['src/context/**/*.jsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
