import globals from 'globals'
import tseslint from 'typescript-eslint'

import rootEslintConfig from '../../eslint.config.js'

/**
 * The contribution tool's ESLint config — the root config, re-imported because flat config has no cascade.
 *
 * Payload writes the files under `src/app/(payload)/` and `src/payload-types.ts` itself (*« do not modify it »*, they
 * say), so they are generated artefacts and left out, as CLAUDE.md exempts them. Everything else — the
 * collections, the export — is ours and held to the root's rules. Node globals, because the config and the export
 * run in Node.
 */
export default tseslint.config(
  rootEslintConfig,
  {
    ignores: [
      '.next',
      'next-env.d.ts',
      'src/app/(payload)/**',
      'src/payload-types.ts',
      'next.config.ts',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.node,
      parserOptions: { tsconfigRootDir: import.meta.dirname },
    },
  }
)
