import { RuleTester } from 'eslint'
import tseslint from 'typescript-eslint'
import { describe } from 'vitest'
import { it } from 'vitest'

import rule from './index.js'

RuleTester.describe = describe
RuleTester.it = it
RuleTester.itOnly = it.only

/** TypeScript's parser with JSX; the rule reads no type. */
const ruleTester = new RuleTester({
  languageOptions: { parser: tseslint.parser, parserOptions: { ecmaFeatures: { jsx: true } } },
})

/**
 * A `.tsx` case.
 * @param code - the code
 * @returns the case
 */
const tsx = (code: string) => ({ code, filename: 'file.tsx' })

/**
 * The message for a hook declared beside a component.
 * @param hook - the hook
 * @returns the expected error
 */
const besideComponent = (hook: string) => ({
  message:
    `Move \`${hook}\` to its own file, \`${hook}.ts\`, beside this one.\n` +
    'A component’s file holds the component; its hooks sit next to it, one per file.',
})

/**
 * The message for a second hook in one file.
 * @param hook - the hook
 * @returns the expected error
 */
const secondHook = (hook: string) => ({
  message:
    `Move \`${hook}\` to its own file, \`${hook}.ts\`, beside this one.\n` +
    'One hook per file, named after it, so the reader opens the file that bears its name.',
})

describe('eha/one-hook-per-file', () => {
  describe('happy path', () => {
    ruleTester.run('one hook alone, one component alone', rule, {
      valid: [
        tsx('export function useArrangeMenu() { return 1 }'),
        tsx('export function Panel() { return <b /> }'),
      ],
      invalid: [
        {
          ...tsx('function useForm() { return 1 }\nexport function Panel() { return <b /> }'),
          errors: [besideComponent('useForm')],
        },
      ],
    })
  })

  describe('variants', () => {
    ruleTester.run('every way of declaring a hook or a component', rule, {
      valid: [
        tsx('export const useMenu = () => 1'),
        tsx('const Panel = memo(() => <b />)\nexport { Panel }'),
        // A helper that is neither a hook nor a component may sit anywhere.
        tsx('const label = () => "x"\nexport function Panel() { return <b>{label()}</b> }'),
      ],
      invalid: [
        {
          ...tsx('export const useA = () => 1\nexport const useB = function () { return 2 }'),
          errors: [secondHook('useB')],
        },
        {
          ...tsx('export const useMenu = () => 1\nexport const Panel = memo(() => <b />)'),
          errors: [besideComponent('useMenu')],
        },
        {
          ...tsx(
            'export default function Panel() { return <b /> }\nexport function useX() { return 1 }'
          ),
          errors: [besideComponent('useX')],
        },
      ],
    })
  })

  describe('managed errors', () => {
    ruleTester.run('every extra hook is named, not only the second', rule, {
      valid: [],
      invalid: [
        {
          ...tsx('function useA() {}\nfunction useB() {}\nfunction useC() {}'),
          errors: [secondHook('useB'), secondHook('useC')],
        },
      ],
    })
  })

  describe('unmanaged errors', () => {
    ruleTester.run('a module with nothing to say', rule, {
      valid: [tsx(''), tsx('export {}')],
      invalid: [],
    })
  })

  describe('edge cases', () => {
    ruleTester.run('what is not a top-level hook or component', rule, {
      valid: [
        // A hook called, not declared, in a component's file.
        tsx('export function Panel() { const x = useMenu(); return <b>{x}</b> }'),
        // A function inside a component is the component's own.
        tsx('export function Panel() { function useInner() { return 1 } return <b /> }'),
        // `user` is no hook: the `use` must be followed by a capital.
        tsx('export function user() { return 1 }\nexport function Panel() { return <b /> }'),
        // An uppercase function that renders nothing is no component.
        tsx('export function Make() { return 1 }\nexport function useX() { return 1 }'),
      ],
      invalid: [],
    })
  })
})
