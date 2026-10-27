import eslint from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import importPlugin from 'eslint-plugin-import'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'
import eha from 'eslint-plugin-eha'
import jsdoc from 'eslint-plugin-jsdoc'

/**
 * Import patterns that name a layer, whatever the specifier looks like. Matching is on the import
 * source string, so one entry covers a relative path inside a package (`../data/x`) and a cross-package
 * subpath export (`@europe-historical-atlas/core/data/x`) alike — no resolver needed.
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
  editor: ['**/editor', '**/editor/**'],
  time: ['**/time', '**/time/**'],
  i18n: ['**/i18n', '**/i18n/**'],
  // The Cartographer's own layers. `geo` above stays reachable from them on purpose: projection maths is
  // a leaf of `core`, and `viewport/` reads it. Note `**/geo` cannot match `**/geometry` — a pattern segment
  // is matched whole — so the two keys do not collide.
  viewport: ['**/viewport', '**/viewport/**'],
  geometry: ['**/geometry', '**/geometry/**'],
  canvas: ['**/canvas', '**/canvas/**'],
  components: ['**/components', '**/components/**'],
  state: ['**/state', '**/state/**'],
  workbench: ['**/workbench', '**/workbench/**'],
  persistence: ['**/persistence', '**/persistence/**'],
  devServer: ['**/devServer', '**/devServer/**'],
  // `{ts,tsx}` rather than `.ts`: the Cartographer's entry is `main.tsx`, so the narrow glob would have
  // let `./main.tsx` through a boundary that forbids the composition root. Fifth instance of the family
  // known-issues records, and the reason the rule there is to write `{ts,tsx}` unless there is a reason.
  main: ['**/main', '**/main.{ts,tsx}'],
  // The atlas's own layers (2026-10-27, ATLAS-291): the running map, what it is made from, what it has been
  // given so far, the settings it reads, and the panel that shows them. **Atlas-only names**: generic words,
  // matched at any depth like `**/controls` (see known-issues/atlas.md) — the Cartographer has a `ui/i18n/app`
  // and the CMS a `src/app`, so never list these keys in another package's rows.
  app: ['**/app', '**/app/**'],
  loading: ['**/loading', '**/loading/**'],
  sources: ['**/sources', '**/sources/**'],
  tunables: ['**/tunables', '**/tunables/**'],
  devPanel: ['**/devPanel', '**/devPanel/**'],
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
    forbid: [
      'scene',
      'camera',
      'controls',
      'ui',
      'data',
      'pipeline',
      'editor',
      'time',
      'i18n',
      'main',
    ],
    why: 'geo/ is pure projection maths — it must not import from any other layer.',
  },
  {
    dir: 'packages/core/src/utils',
    forbid: [
      'scene',
      'camera',
      'controls',
      'ui',
      'data',
      'pipeline',
      'editor',
      'geo',
      'time',
      'i18n',
      'main',
    ],
    why: 'utils/ is a leaf — small pure helpers, depending on nothing. Anything it would need to import belongs on the other side of the call.',
  },
  {
    dir: 'packages/core/src/time',
    forbid: ['scene', 'camera', 'controls', 'ui', 'data', 'pipeline', 'editor', 'geo', 'main'],
    why: 'time/ is the historical date — a leaf like geo/. It may read utils/ and i18n/ (its words); everything dated (data/, editor/, the apps) reads it, never the other way.',
  },
  {
    dir: 'packages/core/src/i18n',
    forbid: [
      'scene',
      'camera',
      'controls',
      'ui',
      'data',
      'pipeline',
      'editor',
      'geo',
      'time',
      'main',
    ],
    why: 'i18n/ is the message engine — a leaf. It may read utils/; whatever shows text reads it, and a catalogue lives with the code that shows it, never in here.',
  },
  {
    dir: 'packages/core/src/data',
    forbid: ['scene', 'camera', 'controls', 'ui', 'pipeline', 'editor', 'main'],
    why: 'data/ is the domain and ports layer — it may read geo/ and utils/, and must know nothing of the renderer, the camera, the DOM, what is being computed, or the editor that writes what it reads.',
  },
  {
    dir: 'packages/core/src/pipeline',
    forbid: ['scene', 'camera', 'controls', 'ui', 'editor', 'main'],
    why: 'pipeline/ is the CPU work the map costs — it may read data/, geo/ and utils/, and must know nothing of the renderer, the camera, the DOM or the editor. The worker computes a finished year; it never edits one.',
  },
  {
    dir: 'packages/core/src/editor',
    forbid: ['scene', 'camera', 'controls', 'ui', 'pipeline', 'main'],
    why: 'editor/ is the Cartographer\u2019s document model \u2014 mutable state and the operations on it. It may read data/, geo/ and utils/, and must know nothing of the renderer, the DOM, or the compute the atlas pays for. Nothing below it may reach back up: the map renders a finished year, it never edits one.',
  },
  // No row points inside `packages/cartographer`, and that is not an omission: a row here would never
  // fire, its glob being resolved against whichever config ESLint loaded. The Cartographer's layers are
  // policed by its own config, composed from LAYER through `layerBoundary`. See that function's header.
  {
    dir: 'packages/atlas/src/scene',
    forbid: ['camera', 'controls', 'app', 'loading', 'devPanel', 'main'],
    why: 'scene/ draws what it is handed: it may read what the map has been given (sources/) and the settings (tunables/), but not the camera, the controls, the running map (app/), the loading that fills it, the dev panel or main.',
  },
  {
    dir: 'packages/atlas/src/camera',
    forbid: [
      'scene',
      'controls',
      'data',
      'pipeline',
      'app',
      'loading',
      'sources',
      'tunables',
      'devPanel',
      'main',
    ],
    why: 'camera/ is independent — it must not import from scene/, controls/, the data layer, or main.',
  },
  {
    dir: 'packages/atlas/src/controls',
    forbid: ['scene', 'pipeline', 'app', 'loading', 'sources', 'devPanel', 'main'],
    why: 'controls/ may depend on camera/ (the CameraControls contract) but not on scene/ or main.',
  },
  {
    dir: 'packages/atlas/src/picking',
    forbid: [
      'scene',
      'camera',
      'controls',
      'ui',
      'pipeline',
      'app',
      'loading',
      'sources',
      'tunables',
      'devPanel',
      'main',
    ],
    why: 'picking/ answers WHERE, never WHAT. It takes a camera and an object to cast against, and must know nothing of the scene that built them, of what is being computed, or of the DOM around it.',
  },
  {
    dir: 'packages/atlas/src/ui',
    forbid: [
      'scene',
      'camera',
      'controls',
      'data',
      'pipeline',
      'app',
      'loading',
      'sources',
      'tunables',
      'devPanel',
      'main',
    ],
    why: 'ui/ is plain DOM over the canvas — it must know nothing of the scene, the data or what is being computed. The composition root drives it.',
  },
  {
    dir: 'packages/atlas/src/tunables',
    forbid: ['scene', 'picking', 'ui', 'app', 'loading', 'sources', 'devPanel', 'main'],
    why: 'tunables/ is the settings the whole map reads, with their defaults and ranges — a leaf but for one type of the controls\u2019 (the camera\u2019s rectangle): it must know nothing of what reads it.',
  },
  {
    dir: 'packages/atlas/src/sources',
    forbid: [
      'scene',
      'camera',
      'controls',
      'picking',
      'ui',
      'app',
      'loading',
      'tunables',
      'devPanel',
      'main',
    ],
    why: 'sources/ is what the map has been given so far — a leaf the loading fills and the layers read: it knows only core.',
  },
  {
    dir: 'packages/atlas/src/app',
    forbid: ['loading', 'devPanel', 'main'],
    why: 'app/ is the running map — the viewport, the loop, the pointer, the screens over the canvas. It is handed what it shows; it never loads it, and never knows the dev panel.',
  },
  {
    dir: 'packages/atlas/src/loading',
    forbid: ['camera', 'controls', 'picking', 'devPanel', 'main'],
    why: 'loading/ is what the map is made from and the order it is paid in. It tells the screens (app/) and fills the layers (scene/), and knows nothing of the camera, the pointer or the dev panel.',
  },
  {
    dir: 'packages/atlas/src/devPanel',
    forbid: ['main'],
    why: 'devPanel/ shows the settings and wires each control to the map: it may reach every layer below, but not the composition root.',
  },
]

/**
 * Packages `core` may not import, with the reason each ban exists.
 *
 * `core` is read by three callers that have nothing in common — a web worker, the three.js atlas, and the
 * Cartographer's React chrome — so anything it pulls in is paid for by all three. That is what keeps the
 * worker chunk at 13.5 kB with no renderer in it, and what would let `core` run under Node with no canvas.
 */
const CORE_IS_PURE = [
  {
    name: 'three',
    message:
      'Package boundary: @europe-historical-atlas/core is three-free by contract. Return plain buffers and numbers; let the atlas wrap them.',
  },
  {
    name: 'react',
    message:
      'Package boundary: core holds no UI framework. A document model that imports React cannot be exercised in a worker or a Node script — put the hook in the Cartographer and let it call core.',
  },
  {
    name: 'react-dom',
    message:
      'Package boundary: core holds no UI framework, and react-dom additionally assumes a DOM that core compiles without.',
  },
  {
    name: 'zustand',
    message:
      'Package boundary: core holds no store. Its modules take data and return data; who keeps the result is the application’s business, and a store imported by a pure module is the global singleton rules/modular-architecture.md forbids.',
  },
]

/**
 * Build a flat-config entry restricting one layer's imports.
 *
 * **It takes `files` rather than deriving it from a directory, and that is load-bearing.** ESLint resolves
 * these patterns against the directory of the config file it **loaded**, not against the file they were
 * written in — measured on 2026-10-05 with `--print-config`, after a boundary row authored here for
 * `packages/cartographer/src/view` (now `viewport`) failed to fire. It matches when `eslint` runs from the repository root
 * and matches **nothing** when it runs from inside the Cartographer, which is exactly how that package's
 * `lint` script runs. This is the sister of "flat config has no cascade", one step further: a row cannot be
 * shared with a package that owns its own config.
 *
 * **A dead row is worse than no row**, because it reads as a guard. So a package owning a config composes
 * its own rows from {@link LAYER} with package-relative globs, which is what this signature is for. Prove
 * every one of them by breaking it: the mechanism is invisible otherwise.
 *
 * `patterns` is omitted when nothing is forbidden, because `no-restricted-imports` rejects an empty group —
 * which is how a paths-only row (a package-wide ban with no layer direction) is expressed.
 * @param {{files: string[], forbid?: string[], why?: string, paths?: object[]}} boundary - the glob to
 *   apply to, the layers it may not reach, why, and any whole-package bans to compose in
 * @returns {object} an ESLint flat-config entry
 */
export const layerBoundary = ({ files, forbid = [], why = '', paths }) => ({
  files,
  rules: {
    'no-restricted-imports': [
      'error',
      {
        ...(paths === undefined ? {} : { paths }),
        ...(forbid.length === 0
          ? {}
          : {
              patterns: [
                {
                  group: forbid.flatMap((name) => LAYER[name]),
                  message: `Architecture boundary: ${why}`,
                },
              ],
            }),
      },
    ],
  },
})

/**
 * Turn one row of this file's own table into a flat-config object.
 *
 * Matches `.tsx` as well as `.ts`, so a component under an existing row cannot slip past in silence.
 * @param {{dir: string, forbid: string[], why: string}} boundary - the layer and what it may not reach
 * @returns {object} an ESLint flat-config entry restricting that layer's imports
 */
const boundaryConfig = ({ dir, forbid, why }) =>
  layerBoundary({
    files: [`${dir}/**/*.{ts,tsx}`],
    forbid,
    why,
    // Gated on the package rather than applied to every row: the atlas may one day want React in its
    // own DOM overlay, and forbidding it there would be a boundary nobody decided.
    ...(dir.startsWith('packages/core/') ? { paths: CORE_IS_PURE } : {}),
  })

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
      // Written by Payload itself (« do not modify it »): the CMS's admin routes and its generated types. Said here as
      // well as in the CMS's own config, because lint-staged runs ESLint from the root.
      'packages/cms/src/app/(payload)/**',
      'packages/cms/src/payload-types.ts',
      '**/next-env.d.ts',
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
              pattern: '@europe-historical-atlas/**',
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

  // Where declarations sit — the repository's own lint plugin (packages/eslint-plugin-eha). Here, the rules
  // that hold for every function of every package; the component order is the Cartographer's, in its own
  // config. An error, not a warning: one author, nothing to count down.
  {
    plugins: { eha },
    rules: {
      // A function declared inside another that reads nothing of it belongs to the module: rebuilt on every
      // call otherwise, and untestable alone. Tests included — a helper inside a `describe` is the same case.
      'eha/hoist-independent-function': 'error',
      // No import cycle, type-only imports included — `import/no-cycle` skips those, and all thirteen cycles
      // found on 2026-10-18 were closed by one. The dev's rule: dependencies run parent → child only, so the
      // child declares its type and the parent's extends it.
      'eha/no-import-cycle': 'error',
    },
  },

  // Every exported function carries its JSDoc, with a @param per parameter and its @returns — CLAUDE.md's rule,
  // held by the gate since 2026-10-18 rather than by review (an extracted hook shipped without them). Tests
  // are exempt, as CLAUDE.md says.
  {
    files: ['**/*.{ts,tsx,js}'],
    ignores: ['**/*.test.{ts,tsx}', '**/vitest.setup.ts', '**/*.config.{ts,js}'],
    plugins: { jsdoc },
    rules: {
      'jsdoc/require-jsdoc': [
        'error',
        {
          publicOnly: { esm: true },
          require: {
            FunctionDeclaration: true,
            ArrowFunctionExpression: true,
            FunctionExpression: true,
          },
        },
      ],
      'jsdoc/require-param': 'error',
      'jsdoc/require-returns': 'error',
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
    files: ['**/*.test.{ts,tsx}'],
    rules: {
      'max-lines': 'off',
      'max-lines-per-function': 'off',
    },
  },

  // Architecture boundaries — the dependency direction, enforced rather than documented.
  // Direction: geo/ and utils/ are leaves <- data/ (domain and ports) <- pipeline/ (the CPU work) ;
  // all four form the three-free core package. In the atlas: camera/ is independent, controls/ depends
  // on camera/, scene/ renders, picking/ answers WHERE, ui/ is plain DOM, tunables/ is the settings (a
  // leaf), app/ the running map, loading/ what the map is made from, devPanel/ the panel over the settings,
  // and main.ts is the composition root that may be imported by nobody.
  ...BOUNDARIES.map(boundaryConfig),

  // The atlas's testing/ folders hold what its tests share (ATLAS-293): test code, kept out of coverage and of
  // Sonar. Product code reaching into one would ship fixtures in the bundle with nothing to say so. Its own rule,
  // not a pattern in the rows above: `no-restricted-imports` is one rule, and a second entry for it would erase
  // every boundary under it.
  {
    files: ['packages/atlas/src/**/*.ts'],
    ignores: ['**/*.test.ts', '**/testing/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ImportDeclaration[source.value=/(^|\\/)testing\\//]',
          message:
            'testing/ is test code: only a test or another testing/ module may import it — never the product.',
        },
      ],
    },
  }
)
