import globals from 'globals'
import tseslint from 'typescript-eslint'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

import rootEslintConfig, { atlasBoundaries, atlasTestingRule } from '../../eslint.config.js'

/** Where the interface's components live, from this package's root — read by the `eha` rules that police their folders. */
const COMPONENTS_DIR = 'src/ui/components'

/**
 * The atlas's ESLint config — the root config, plus React (ATLAS-519, the dev, 2026-11-24: everything but the canvas is
 * React). The Cartographer's shape, for the same reasons, read there: flat config has no cascade, so the root is
 * re-imported and this package's rules stacked on top; the React plugins are this package's own devDependencies.
 *
 * **The atlas's layer boundaries come last, without a prefix.** A `files` glob resolves against the config ESLint
 * loaded — this one when `pnpm lint` runs from the package — so the root's `packages/atlas/…` rows match nothing here.
 * Both configs read one table, `ATLAS_LAYERS`, each with its own prefix.
 */
export default tseslint.config(
  rootEslintConfig,

  { ignores: ['dist'] },

  // React, after the root so it wins where the two disagree.
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      react.configs.flat.recommended,
      // `"jsx": "react-jsx"`: the runtime injects the import, so `import React` would be dead code.
      react.configs.flat['jsx-runtime'],
      reactHooks.configs.flat.recommended,
      jsxA11y.flatConfigs.recommended,
      reactRefresh.configs.vite,
    ],
    // The root's `tsconfigRootDir` is kept, unlike the Cartographer's: the build's files (`bake/`, typed by
    // `tsconfig.build.json`) are found by the project service only from the repository's root (measured, ATLAS-519).
    languageOptions: { globals: globals.browser },
    settings: { react: { version: 'detect' } },
    rules: {
      // Prop types are the types.
      'react/prop-types': 'off',
    },
  },

  // Where each declaration sits in a component or a hook, and no handler written in the markup — the Cartographer's
  // two rules. `hooks` gives every custom hook the group of what it returns; a new hook stops the lint until it has one.
  {
    files: ['src/ui/**/*.{ts,tsx}'],
    rules: {
      'eha/component-body-order': ['error', { stores: ['store'], hooks: { useStore: 'store' } }],
      'eha/no-inline-event-handlers': 'error',
    },
  },

  // One entity per file, in a folder per component behind its barrel (the dev, 2026-10-18).
  {
    files: ['src/ui/components/*/**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}'],
    rules: {
      'react/no-multi-comp': 'error',
      'eha/one-hook-per-file': 'error',
      'eha/component-folder-layout': ['error', { componentsDir: COMPONENTS_DIR }],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: { 'eha/no-reach-into-component': ['error', { componentsDir: COMPONENTS_DIR }] },
  },

  // Last, so nothing replaces the single `no-restricted-imports` rule after them.
  ...atlasBoundaries(''),
  atlasTestingRule('')
)
