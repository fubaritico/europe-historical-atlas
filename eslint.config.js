import eslint from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import importPlugin from 'eslint-plugin-import'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'

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
          // Future monorepo: internal workspace packages sort before relative imports.
          pathGroups: [
            {
              pattern: '@europe-map/**',
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
  // before being chosen (see files/plans/readability-budgets.md), not taken from a style guide.
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

  // ⚠ LEGACY EXEMPTIONS — opened 2026-09-17, and they must shrink to nothing.
  // The budgets above are switched on before the codebase complies, so that they guide the work rather
  // than rubber-stamp it afterwards. Each file listed here is debt with a name. Removing a line is the
  // definition of done for one step of files/plans/readability-budgets.md; this whole section
  // disappearing is the definition of done for the plan.
  // Known and accepted risk: `off` is not a ratchet — an exempted file could grow while it waits.
  {
    // 658 and 558 code lines. `bootstrap()` alone is 584 of main.ts's 658.
    files: ['src/main.ts', 'src/devParams.ts'],
    rules: { 'max-lines': 'off' },
  },
  {
    // 16 functions over 50 code lines. Nine of them are `createX` factories whose length is nested
    // methods — precisely the pure logic modular-architecture.md wants lifted out of the closure.
    files: [
      'src/main.ts',
      'src/devPanel.ts',
      'src/controls/mapControls.ts',
      'src/data/coastlineSource.ts',
      'src/data/regionRaster.ts',
      'src/data/riverSource.ts',
      'src/pipeline/inlineCompute.ts',
      'src/pipeline/terrainCompose.ts',
      'src/pipeline/workerCompute.ts',
      'src/scene/composedLineLayer.ts',
      'src/scene/lineLayer.ts',
      'src/ui/notice.ts',
      'src/ui/progressOverlay.ts',
      'src/ui/splash.ts',
    ],
    rules: { 'max-lines-per-function': 'off' },
  },
  {
    // 15 functions over a cyclomatic complexity of 10; the worst are the genuinely dense algorithms
    // (marching squares 25, region rasterising 25, colour assignment 23, polyline offsetting 22).
    files: [
      'src/devPanel.ts',
      'src/controls/mapControls.ts',
      'src/data/coastlineSource.ts',
      'src/data/heightmap.ts',
      'src/data/regionRaster.ts',
      'src/data/riverSource.ts',
      'src/pipeline/terrainCompose.ts',
      'src/scene/compassRoseSvg.ts',
      'src/scene/composedLineLayer.ts',
      'src/scene/lineLayer.ts',
      'src/scene/rhumbNetwork.ts',
    ],
    rules: { complexity: 'off' },
  },
  {
    // 6 spots: the scanline fill and the BFS in regionRaster (one at depth 6), edge-scroll in
    // mapControls (depth 5).
    files: ['src/controls/mapControls.ts', 'src/data/regionRaster.ts'],
    rules: { 'max-depth': 'off' },
  },

  // Architecture boundaries — enforce the layer dependency direction inside src/ without
  // splitting into packages. Matching is on the import source string (no resolver needed).
  // Direction: geo/ (pure projection maths) and data/ (domain/ports) are leaves <- pipeline/ (the CPU
  // work, three-free so a worker can run it) <- scene/ (rendering) ; camera/ is independent ;
  // ui/ is plain DOM ; main.ts is the composition root and may be imported by nobody.
  {
    files: ['src/geo/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/scene',
                '**/scene/**',
                '**/camera',
                '**/camera/**',
                '**/controls',
                '**/controls/**',
                '**/data',
                '**/data/**',
                '**/pipeline',
                '**/pipeline/**',
                '**/main',
                '**/main.ts',
              ],
              message:
                'Architecture boundary: geo/ is pure projection maths — it must not import from any other layer.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/ui/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/scene',
                '**/scene/**',
                '**/camera',
                '**/camera/**',
                '**/controls',
                '**/controls/**',
                '**/data',
                '**/data/**',
                '**/pipeline',
                '**/pipeline/**',
                '**/main',
                '**/main.ts',
              ],
              message:
                'Architecture boundary: ui/ is plain DOM over the canvas — it must know nothing of the scene, the data or what is being computed. The composition root drives it.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/pipeline/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'three',
              message:
                'Architecture boundary: pipeline/ runs inside a Web Worker, where three.js and the DOM do not exist. Return plain buffers; let scene/ wrap them.',
            },
          ],
          patterns: [
            {
              group: [
                '**/scene',
                '**/scene/**',
                '**/camera',
                '**/camera/**',
                '**/controls',
                '**/controls/**',
                '**/ui',
                '**/ui/**',
                '**/main',
                '**/main.ts',
              ],
              message:
                'Architecture boundary: pipeline/ is the CPU work the map costs — it may read data/, geo/ and utils/, and must know nothing of the renderer, the camera or the DOM.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/data/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/scene',
                '**/scene/**',
                '**/camera',
                '**/camera/**',
                '**/controls',
                '**/controls/**',
                '**/pipeline',
                '**/pipeline/**',
                '**/main',
                '**/main.ts',
              ],
              message:
                'Architecture boundary: data/ is the leaf domain/ports layer — it must not import from scene/, camera/, controls/, or main.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/scene/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/camera',
                '**/camera/**',
                '**/controls',
                '**/controls/**',
                '**/main',
                '**/main.ts',
              ],
              message:
                'Architecture boundary: scene/ may depend on data/ but not on camera/, controls/, or main.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/camera/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/scene',
                '**/scene/**',
                '**/data',
                '**/data/**',
                '**/controls',
                '**/controls/**',
                '**/pipeline',
                '**/pipeline/**',
                '**/main',
                '**/main.ts',
              ],
              message:
                'Architecture boundary: camera/ is independent — it must not import from scene/, data/, controls/, or main.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/controls/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/scene',
                '**/scene/**',
                '**/pipeline',
                '**/pipeline/**',
                '**/main',
                '**/main.ts',
              ],
              message:
                'Architecture boundary: controls/ may depend on camera/ (the CameraControls contract) but not on scene/ or main.',
            },
          ],
        },
      ],
    },
  }
)
