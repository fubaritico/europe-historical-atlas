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
