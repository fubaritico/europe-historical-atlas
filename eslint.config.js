import eslint from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import importPlugin from 'eslint-plugin-import'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'

/**
 * Import patterns that name a layer, whatever the specifier looks like. Matching is on the import
 * source string, so one entry covers a relative path inside a package (`../data/x`) and a cross-package
 * subpath export (`@europe-atlas/core/data/x`) alike — no resolver needed.
 */
const LAYER = {
  scene: ['**/scene', '**/scene/**'],
  camera: ['**/camera', '**/camera/**'],
  controls: ['**/controls', '**/controls/**'],
  picking: ['**/picking', '**/picking/**'],
  ui: ['**/ui', '**/ui/**'],
  data: ['**/data', '**/data/**'],
  pipeline: ['**/pipeline', '**/pipeline/**'],
  geo: ['**/geo', '**/geo/**'],
  main: ['**/main', '**/main.ts'],
}

/**
 * The layer dependency direction, as one table rather than nine near-identical blocks.
 *
 * Written this way for a reason that bit once: `no-restricted-imports` is a **single rule**, so a later
 * config object replaces its options wholesale for the files it matches. Adding a package-wide "no
 * three.js" block after these would have silently erased every layer boundary under it. Composing the
 * two constraints here makes that impossible.
 */
const BOUNDARIES = [
  {
    dir: 'packages/core/src/geo',
    forbid: ['scene', 'camera', 'controls', 'ui', 'data', 'pipeline', 'main'],
    why: 'geo/ is pure projection maths — it must not import from any other layer.',
  },
  {
    dir: 'packages/core/src/utils',
    forbid: ['scene', 'camera', 'controls', 'ui', 'data', 'pipeline', 'geo', 'main'],
    why: 'utils/ is a leaf — small pure helpers, depending on nothing. Anything it would need to import belongs on the other side of the call.',
  },
  {
    dir: 'packages/core/src/data',
    forbid: ['scene', 'camera', 'controls', 'ui', 'pipeline', 'main'],
    why: 'data/ is the domain and ports layer — it may read geo/ and utils/, and must know nothing of the renderer, the camera, the DOM or what is being computed.',
  },
  {
    dir: 'packages/core/src/pipeline',
    forbid: ['scene', 'camera', 'controls', 'ui', 'main'],
    why: 'pipeline/ is the CPU work the map costs — it may read data/, geo/ and utils/, and must know nothing of the renderer, the camera or the DOM.',
  },
  {
    dir: 'packages/atlas/src/scene',
    forbid: ['camera', 'controls', 'main'],
    why: 'scene/ may depend on the core package but not on camera/, controls/, or main.',
  },
  {
    dir: 'packages/atlas/src/camera',
    forbid: ['scene', 'controls', 'data', 'pipeline', 'main'],
    why: 'camera/ is independent — it must not import from scene/, controls/, the data layer, or main.',
  },
  {
    dir: 'packages/atlas/src/controls',
    forbid: ['scene', 'pipeline', 'main'],
    why: 'controls/ may depend on camera/ (the CameraControls contract) but not on scene/ or main.',
  },
  {
    dir: 'packages/atlas/src/picking',
    forbid: ['scene', 'camera', 'controls', 'ui', 'pipeline', 'main'],
    why: 'picking/ answers WHERE, never WHAT. It takes a camera and an object to cast against, and must know nothing of the scene that built them, of what is being computed, or of the DOM around it.',
  },
  {
    dir: 'packages/atlas/src/ui',
    forbid: ['scene', 'camera', 'controls', 'data', 'pipeline', 'main'],
    why: 'ui/ is plain DOM over the canvas — it must know nothing of the scene, the data or what is being computed. The composition root drives it.',
  },
]

/**
 * Turn one row of the table into a flat-config object.
 * @param {{dir: string, forbid: string[], why: string}} boundary - the layer and what it may not reach
 * @returns {object} an ESLint flat-config entry restricting that layer's imports
 */
const boundaryConfig = ({ dir, forbid, why }) => {
  const isCore = dir.startsWith('packages/core/')
  return {
    files: [`${dir}/**/*.ts`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          // The core package is pure TypeScript by contract: no renderer, anywhere in it. That is what
          // lets the worker chunk ship without three.js, measured at 12.6 kB, and what would let core
          // run under Node or in a future editor that has no canvas at all.
          ...(isCore
            ? {
                paths: [
                  {
                    name: 'three',
                    message:
                      'Package boundary: @europe-atlas/core is three-free by contract. Return plain buffers and numbers; let the atlas wrap them.',
                  },
                ],
              }
            : {}),
          patterns: [
            {
              group: forbid.flatMap((name) => LAYER[name]),
              message: `Architecture boundary: ${why}`,
            },
          ],
        },
      ],
    },
  }
}

export default tseslint.config(
  // Plugins
  {
    plugins: {
      ['@typescript-eslint']: tseslint.plugin,
      ['import']: importPlugin,
    },
  },

  // Ignores — config files, build output, and non-source areas (plans/spikes live in files/).
  {
    ignores: [
      '**/eslint.config.js',
      '**/commitlint.config.js',
      '**/prettier.config.js',
      '**/vite.config.ts',
      '**/vitest.config.ts',
      '**/*.cjs',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/files/**',
      '**/opensrc/**',
      'pnpm-lock.yaml',
      'pnpm-workspace.yaml',
    ],
  },

  // Extends
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  eslintPluginPrettierRecommended,

  // Base config (TypeScript, browser globals, typed linting via the project service).
  {
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['error', { allow: ['error', 'warn'] }],
      'import/prefer-default-export': 'off',
      'import/no-extraneous-dependencies': 'off',
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
            'type',
          ],
          'newlines-between': 'always',
          // Workspace packages sort before relative imports.
          pathGroups: [
            {
              pattern: '@europe-atlas/**',
              group: 'internal',
              position: 'before',
            },
          ],
          pathGroupsExcludedImportTypes: ['builtin', 'type'],
          alphabetize: {
            order: 'asc',
            orderImportKind: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      'sort-imports': [
        'error',
        {
          ignoreDeclarationSort: true,
          ignoreMemberSort: false,
          memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
        },
      ],
    },
  },

  // Readability budgets — size and complexity ceilings, so that "I cannot re-read this" is caught by
  // the gate instead of by a human months later. The layer boundaries below police *where* code lives;
  // these police *how much of it* may sit in one place. Thresholds were measured against this codebase
  // before being chosen (see files/plans/atlas/readability-budgets.md), not taken from a style guide.
  {
    rules: {
      // Counts CODE only. This project mandates JSDoc everywhere and comments the *why* densely: if
      // comments counted, deleting one would be the cheapest way to pass the gate, and the rule would
      // destroy the readability it exists to protect. 400 lines of pure code is already a lot.
      'max-lines': ['error', { max: 400, skipBlankLines: true, skipComments: true }],
      // The ESLint default. Note it counts NESTED functions, so a `createX` factory is measured with
      // its methods — which is the point: pure logic trapped in a closure is a module not yet written
      // (ARCH-012). Where a factory genuinely cannot comply, disable it by name with a reason.
      'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
      // Nesting depth of blocks (if/for/while/try) — the "too much indentation" rule. NOT `complexity`,
      // which counts execution paths and would leave a flat function with six sequential `if`s alone.
      'max-depth': ['error', { max: 4 }],
      // Cyclomatic complexity: half the ESLint default of 20. Deliberately not 5 — each `case`, `&&`
      // and `?:` counts, so the 16-case marching-squares switch in coastlineSource scores 25 while
      // being the clearest way to write that algorithm.
      complexity: ['error', { max: 10 }],
    },
  },
  {
    // Test suites are exempt from the two LINE budgets, for a mechanical reason rather than a lenient
    // one: `max-lines-per-function` counts nested functions, so the arrow passed to `describe()` is
    // measured as a single function (the suites here score 289 / 279 / 258). The 5-level policy in
    // rules/tests.md inflates suites by design. They remain subject to `complexity` and `max-depth`,
    // where they were measured at zero violations.
    files: ['**/*.test.ts'],
    rules: {
      'max-lines': 'off',
      'max-lines-per-function': 'off',
    },
  },

  // Architecture boundaries — the dependency direction, enforced rather than documented.
  // Direction: geo/ and utils/ are leaves <- data/ (domain and ports) <- pipeline/ (the CPU work) ;
  // all four form the three-free core package. In the atlas: camera/ is independent, controls/ depends
  // on camera/, scene/ renders, picking/ answers WHERE, ui/ is plain DOM, and main.ts is the
  // composition root that may be imported by nobody.
  ...BOUNDARIES.map(boundaryConfig)
)
