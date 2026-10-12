import { RuleTester } from 'eslint'
import tseslint from 'typescript-eslint'
import { describe, it } from 'vitest'

import rule from './index.js'

RuleTester.describe = describe
RuleTester.it = it
RuleTester.itOnly = it.only

/** TypeScript's parser, for its scope analysis: a type parameter is a variable a function can read. */
const ruleTester = new RuleTester({ languageOptions: { parser: tseslint.parser } })

/**
 * An invalid case: one report, naming the function and where it lives.
 * @param code - the code
 * @param name - the function to move
 * @param owner - how the message names the function holding it
 * @returns the case
 */
const movable = (code: string, name: string, owner: string, output: string | null = null) => ({
  code,
  ...(output === null ? {} : { output }),
  errors: [
    {
      message:
        `Move \`${name}\` out of ${owner}, to the module: it reads nothing from it.\n` +
        'Inside, it is rebuilt on every call, and a reader looks for what it captures and finds nothing. At ' +
        'the module it can be tested alone.',
    },
  ],
})

describe('eha/hoist-independent-function', () => {
  describe('happy path', () => {
    ruleTester.run('functions that read their surroundings stay', rule, {
      valid: [
        'function outer(scale: number) { const grow = (x: number) => x * scale; return grow(2) }',
        'function outer() { const base = 3; function add(x: number) { return x + base } return add(1) }',
        'const top = (x: number) => x * 2',
      ],
      invalid: [
        movable(
          'function outer(scale: number) { const double = (x: number) => x * 2; return double(scale) }',
          'double',
          '`outer`'
        ),
      ],
    })
  })

  describe('variants', () => {
    ruleTester.run('what counts as reading, and how the owner is named', rule, {
      valid: [
        // The type parameter is read in the annotation, outside the function's body.
        'function deferred<T>() { const make: (value: T) => T[] = (value) => [value]; return make }',
        // An arrow has no `this` of its own: moved out, it would read another one.
        'function outer(this: { n: number }) { const read = () => this.n; return read() }',
      ],
      invalid: [
        movable(
          'function outer() { function helper() { return 1 } return helper() }',
          'helper',
          '`outer`'
        ),
        // Reading the module is reading nothing of the function: the module is where it would go.
        movable(
          'const limit = 4\nfunction outer() { const capped = (x: number) => Math.min(x, limit); return capped(9) }',
          'capped',
          '`outer`'
        ),
        movable(
          "describe('a suite', () => { const fixture = () => [1, 2]; it('runs', () => fixture()) })",
          'fixture',
          'the callback of `describe(…)`'
        ),
      ],
    })
  })

  describe('variants — the fix', () => {
    ruleTester.run('moves the function and its comments to the module', rule, {
      valid: [],
      invalid: [
        movable(
          `const limit = 4

/** Caps a value. */
export function outer(value: number) {
  /**
   * The value, capped.
   * @param x - the value
   */
  const capped = (x: number) =>
    Math.min(x, limit)

  return capped(value)
}
`,
          'capped',
          '`outer`',
          `const limit = 4

/**
 * The value, capped.
 * @param x - the value
 */
const capped = (x: number) =>
  Math.min(x, limit)

/** Caps a value. */
export function outer(value: number) {
  return capped(value)
}
`
        ),
        movable(
          `describe('a suite', () => {
  it('runs', () => {
    const fixture = () => [1, 2]
    expect(fixture()).toHaveLength(2)
  })
})
`,
          'fixture',
          'the callback of `it(…)`',
          `const fixture = () => [1, 2]

describe('a suite', () => {
  it('runs', () => {
    expect(fixture()).toHaveLength(2)
  })
})
`
        ),
      ],
    })
  })

  describe('variants — what the fix refuses or keeps', () => {
    ruleTester.run('the fix keeps content, and refuses to collide', rule, {
      valid: [
        // Vitest lifts a mock factory above the module: a helper inside it must stay inside it.
        "vi.mock('./x', () => { const make = () => 1; return { make } })",
        'class A extends B { m() { const up = () => super.m(); return up() } }',
        'function outer() { const all = () => arguments.length; return all() }',
        'function outer() { const a = 1, b = () => 2; return a + b() }',
      ],
      invalid: [
        // The spaces of a template spanning lines are its content, kept byte for byte.
        movable(
          `describe('a suite', () => {
  const source = () => \`
    line one
      line two\`
  it('reads', () => source())
})
`,
          'source',
          'the callback of `describe(…)`',
          `const source = () => \`
    line one
      line two\`

describe('a suite', () => {
  it('reads', () => source())
})
`
        ),
        // A comment set apart by a blank line is the section's, not the function's: it stays.
        movable(
          `function outer() {
  // Helpers

  /** One. */
  const one = () => 1
  return one()
}
`,
          'one',
          '`outer`',
          `/** One. */
const one = () => 1

function outer() {
  // Helpers

  return one()
}
`
        ),
        // Two functions would bring two \`make\` to the module: reported, never rewritten.
        {
          code: `function a() {
  const make = () => 1
  return make()
}
function b() {
  const make = () => 2
  return make()
}
`,
          errors: 2,
        },
        {
          code: `const make = 0
function a() {
  const make = () => 1
  return make()
}
`,
          errors: 1,
        },
      ],
    })
  })

  // L3: N/A — the rule takes no option and reads no file; there is nothing it can be handed wrong.

  describe('unmanaged errors', () => {
    ruleTester.run('shapes that declare no function', rule, {
      valid: [
        // A `let` holding a function may be reassigned: it is state, not a declaration.
        'function outer() { let fire = () => undefined; fire = () => 1; return fire }',
        'function outer() { const value = 1; return value }',
        'const arrow = () => 1',
      ],
      invalid: [
        movable(
          '(function () { const inner = () => 1; return inner() })()',
          'inner',
          'its function'
        ),
      ],
    })
  })

  describe('edge cases', () => {
    ruleTester.run('recursion and nesting', rule, {
      valid: [
        // Two declarations, the second reading the first: the second stays with it.
        'function outer() { const a = 1; const b = () => a; return b }',
      ],
      invalid: [
        // Calling itself is not reading the function around it.
        movable(
          'function outer() { function count(n: number): number { return n === 0 ? 0 : count(n - 1) } return count(3) }',
          'count',
          '`outer`'
        ),
        // A component declared inside another, reading nothing of it.
        {
          code: 'function Outer() { function Inner() { return null } return Inner }',
          errors: 1,
        },
      ],
    })
  })
})
