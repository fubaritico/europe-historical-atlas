import globals from 'globals'
import tseslint from 'typescript-eslint'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

import rootEslintConfig from '../../eslint.config.js'

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
      // The Cartographer paints on a 2D canvas, by decision: a 2D context gives the compositing mode the
      // atlas's bake already uses (`overlay`) for free, where WebGL would need a shader. three.js in here
      // would be a second renderer in the repository. See memory [[editor-canvas-is-2d]].
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'three',
              message:
                'Package boundary: the Cartographer paints on a 2D canvas. If something here seems to need three.js, it belongs in the atlas.',
            },
          ],
        },
      ],
    },
  }
)
