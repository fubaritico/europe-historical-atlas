import globals from 'globals'
import tseslint from 'typescript-eslint'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

import rootEslintConfig, { layerBoundary } from '../../eslint.config.js'

/**
 * The whole-package ban, composed into every boundary row below rather than declared once.
 *
 * `no-restricted-imports` is a **single rule**, so a later config object replaces its options wholesale
 * for the files it matches — which is why this cannot be a standalone block: it would erase the layer
 * directions under it, silently. Measured, not feared: a package-wide block carrying only this ban is
 * exactly what used to make `--print-config` report no `patterns` at all on a `view/` file.
 */
const CARTOGRAPHER_IS_2D = [
  {
    name: 'three',
    message:
      'Package boundary: the Cartographer paints on a 2D canvas. If something here seems to need three.js, it belongs in the atlas.',
  },
]

/**
 * This package's layer directions, with **package-relative** globs.
 *
 * They live here and not in the root table for a measured reason (see `layerBoundary`'s header): ESLint
 * resolves a `files` pattern against the directory of the config it loaded, and this package's `lint` runs
 * from this directory — so a root-authored `packages/cartographer/src/view/**` row matches nothing. Every
 * row was proved by breaking it.
 *
 * Order matters: the package-wide row comes first so the directory rows, which carry the same ban *plus* a
 * direction, win for the files they match.
 */
const CARTOGRAPHER_BOUNDARIES = [
  layerBoundary({ files: ['**/*.{ts,tsx}'], paths: CARTOGRAPHER_IS_2D }),
  layerBoundary({
    files: ['src/view/**/*.{ts,tsx}'],
    forbid: ['state', 'geometry', 'canvas', 'main'],
    paths: CARTOGRAPHER_IS_2D,
    why: 'view/ is the screen↔backdrop arithmetic, and a viewport is data. It may read core’s geo/ for projection maths and nothing else: a pure layer reaching into the store would be the global singleton rules/modular-architecture.md forbids, and it could no longer be exercised with literals.',
  }),
  layerBoundary({
    files: ['src/geometry/**/*.{ts,tsx}'],
    forbid: ['state', 'canvas', 'main'],
    paths: CARTOGRAPHER_IS_2D,
    why: 'geometry/ is the arithmetic of the gestures — nearest anchor, marquee, ring closure, snapping to a polyline. It works in screen pixels on flat arrays and answers questions; it never edits a document and never reads a store. It may read `view/`, which is the leaf that defines screen space, and core’s geo/ and utils/.',
  }),
  layerBoundary({
    files: ['src/canvas/**/*.{ts,tsx}'],
    forbid: ['main'],
    paths: CARTOGRAPHER_IS_2D,
    why: 'canvas/ is the painter, and it decides nothing: positions arrive already in screen pixels and colours arrive in a style object. It may read view/ and geometry/ for their types, and the store for what to draw — but never the composition root, which is what keeps it mountable in a harness. It takes a structural 2D context rather than CanvasRenderingContext2D, because jsdom has no 2D context and the alternative is not testing the painter at all.',
  }),
  layerBoundary({
    files: ['src/components/**/*.{ts,tsx}'],
    forbid: ['main'],
    paths: CARTOGRAPHER_IS_2D,
    why: 'components/ is the React chrome — it owns DOM elements and wires the layers together, so it may read all of them. It must not reach back into the composition root: a component that imports the entry would run the application to render itself.',
  }),
  layerBoundary({
    files: ['src/backdropSource.ts', 'src/vectorLayers.ts'],
    forbid: ['state', 'canvas', 'components', 'main'],
    paths: CARTOGRAPHER_IS_2D,
    why: 'The root-level loaders fetch, bake and project what the editor draws on. They sit beside the composition root rather than in a layer because they are what it wires together — but they are not it: they hold real logic and real tests, so they must not reach into the store, the painter, a component, or the entry. Found in review on 2026-10-07, when they had no row at all and only the package-wide three.js ban covered them; the atlas gets away with the same shape because nothing there interrogates its config, while this package has boundaries.test.ts precisely so a missing row cannot go quiet.',
  }),
  layerBoundary({
    files: ['src/state/**/*.{ts,tsx}'],
    forbid: ['geometry', 'canvas', 'main'],
    paths: CARTOGRAPHER_IS_2D,
    why: 'state/ owns what is being edited and must not know how it is *drawn*: the canvas and the tools read the store, never the reverse, which is what keeps the store exercisable without a canvas. `view/` is deliberately NOT on this list — it is a leaf of pure arithmetic, read from above exactly as core’s geo/ and utils/ are read by its data/, and step 4d puts the settled viewport in a slice. Forbidding it would have been a symmetry where the principle is a direction, and it would have blocked the case we want. What keeps per-frame pan and zoom out of the store is a rule about when `set` is called (rules/troubleshooting.md), not an import ban — a ban would equally block the committed value the static canvas reads.',
  }),
]

/**
 * The Cartographer's ESLint config — the root config, plus React.
 *
 * It re-imports the root rather than relying on inheritance because flat config has none: ESLint resolves
 * **one** config file and nothing cascades from a parent directory. So the root is pulled in explicitly and
 * this package's own rules are stacked on top.
 *
 * It lives here rather than in the root file because React belongs to this package alone — the atlas is
 * vanilla three.js and must never see one of these rules — and because the four plugins are this package's
 * own devDependencies.
 *
 * Two plugin shapes worth knowing, both read off the installed packages rather than assumed:
 *   · in eslint-plugin-react-hooks@7, **both** `configs.recommended` and `configs['recommended-latest']` are
 *     still eslintrc format (`plugins` is an array of strings, which flat config rejects outright). The flat
 *     ones live one level down, under `configs.flat`. `flat.recommended` is pinned for the major where
 *     `flat['recommended-latest']` tracks the newest set, so the pinned one is what a gate wants: a patch bump
 *     should not be able to turn the tree red on its own.
 *   · `reactRefresh.configs.vite` is the Vite-aware variant, which allows the constant and compound-component
 *     exports Fast Refresh can actually cope with.
 */
export default tseslint.config(
  rootEslintConfig,

  { ignores: ['dist'] },

  // React. Placed after the root, which is what lets it win where the two disagree — and the root's Prettier
  // config has already switched off every formatting rule these plugins might otherwise argue with.
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      react.configs.flat.recommended,
      // Turns off `react-in-jsx-scope` and `jsx-uses-react`, required by `"jsx": "react-jsx"`: the runtime
      // injects the import, so demanding `import React` would be demanding dead code.
      react.configs.flat['jsx-runtime'],
      reactHooks.configs.flat.recommended,
      jsxA11y.flatConfigs.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        // Only the root directory is overridden, not the discovery mechanism: the root config turns on
        // `projectService`, which finds the nearest `tsconfig.json` by itself and refuses an explicit
        // `project` alongside it. Anchoring it here is what points that search at this package.
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      // Prop types are the types. The rule exists for JavaScript React and only ever fires here as noise.
      'react/prop-types': 'off',
    },
  },

  // Architecture boundaries, last so nothing can replace the single `no-restricted-imports` rule after
  // them. The 2D-canvas decision is composed into each one: a 2D context gives the compositing mode the
  // atlas's bake already uses (`overlay`) for free, where WebGL would need a shader, and three.js in here
  // would be a second renderer in the repository. See memory [[editor-canvas-is-2d]].
  ...CARTOGRAPHER_BOUNDARIES
)
