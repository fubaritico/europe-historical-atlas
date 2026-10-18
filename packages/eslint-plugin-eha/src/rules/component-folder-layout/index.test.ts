import { RuleTester } from 'eslint'
import tseslint from 'typescript-eslint'
import { describe, it } from 'vitest'

import rule from './index.js'

RuleTester.describe = describe
RuleTester.it = it
RuleTester.itOnly = it.only

/** TypeScript's parser with JSX; the rule reads no type. */
const ruleTester = new RuleTester({
  languageOptions: { parser: tseslint.parser, parserOptions: { ecmaFeatures: { jsx: true } } },
})

/** The components' folder, as an absolute path a real file would have. */
const ROOT = '/repo/packages/cartographer/src/components'

/**
 * A case: some code, at a path under the components' folder.
 * @param path - the path under `src/components/`
 * @param code - the code
 * @returns the case
 */
const at = (path: string, code: string) => ({ code, filename: `${ROOT}/${path}` })

const HOOK = 'export function useForm() { return 1 }'
const CHILD = 'export function Foot() { return <b /> }'
const MAIN = 'export function Panel() { return <b /> }'

describe('eha/component-folder-layout', () => {
  describe('happy path', () => {
    ruleTester.run('each entity where it belongs', rule, {
      valid: [
        at('Panel/Panel.tsx', MAIN),
        at('Panel/hooks/useForm.ts', HOOK),
        at('Panel/internal/Foot.tsx', CHILD),
      ],
      invalid: [
        {
          ...at('Panel/useForm.ts', HOOK),
          errors: [
            {
              message:
                'Move `useForm` to `Panel/hooks/useForm.ts`.\nA hook only `Panel` uses lives in its `hooks/` folder.',
            },
          ],
        },
        {
          ...at('Panel/Foot.tsx', CHILD),
          errors: [
            {
              message:
                'Move `Foot` to `Panel/internal/Foot.tsx`.\nA component only `Panel` uses lives in its `internal/` folder.',
            },
          ],
        },
      ],
    })
  })

  describe('variants', () => {
    ruleTester.run('the wrong subfolder, and the main component out of the root', rule, {
      valid: [],
      invalid: [
        { ...at('Panel/internal/useForm.ts', HOOK), errors: 1 },
        { ...at('Panel/hooks/Foot.tsx', CHILD), errors: 1 },
        {
          ...at('Panel/internal/Panel.tsx', MAIN),
          errors: [
            {
              message:
                'Move `Panel` to `Panel/Panel.tsx`.\nThe component a folder is named after sits at its root, beside its barrel.',
            },
          ],
        },
      ],
    })
  })

  describe('managed errors', () => {
    ruleTester.run('files the rule leaves alone', rule, {
      valid: [
        // The barrel and the tests may hold anything.
        at('Panel/index.ts', "export { Panel } from './Panel'"),
        at('Panel/Panel.test.tsx', `${MAIN}\n${CHILD}\n${HOOK}`),
        // A flat file at the components' root has no folder yet: not held until it moves.
        at('PolityList.tsx', `${CHILD}\n${HOOK}`),
        // Outside the components entirely.
        { code: HOOK, filename: '/repo/packages/cartographer/src/state/useForm.ts' },
      ],
      invalid: [],
    })
  })

  describe('unmanaged errors', () => {
    ruleTester.run('a module declaring nothing', rule, {
      valid: [at('Panel/internal/labels.ts', 'export const LABEL = "x"')],
      invalid: [],
    })
  })

  describe('edge cases', () => {
    ruleTester.run('another components folder, given as an option', rule, {
      valid: [
        {
          code: HOOK,
          filename: '/repo/src/ui/Panel/hooks/useForm.ts',
          options: [{ componentsDir: 'src/ui' }],
        },
      ],
      invalid: [
        {
          code: HOOK,
          filename: '/repo/src/ui/Panel/useForm.ts',
          options: [{ componentsDir: 'src/ui' }],
          errors: 1,
        },
      ],
    })
  })
})
