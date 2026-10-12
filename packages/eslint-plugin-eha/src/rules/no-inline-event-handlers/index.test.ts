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

/**
 * A `.tsx` case.
 * @param code - the code
 * @returns the case
 */
const tsx = (code: string) => ({ code, filename: 'file.tsx' })

/**
 * An inline handler the component can declare, under the proposed name.
 * @param code - the code
 * @param attribute - the event attribute
 * @param component - the component
 * @param name - the proposed name
 * @returns the case
 */
const movable = (code: string, attribute: string, component: string, name: string) => ({
  ...tsx(code),
  errors: [
    {
      message:
        `Declare this \`${attribute}\` handler in \`${component}\` as \`${name}\`, with the other handlers, and pass ` +
        'it by name.\nThe reader finds every handler under `// Handlers`, not inside the markup.',
    },
  ],
})

describe('eha/no-inline-event-handlers', () => {
  describe('happy path', () => {
    ruleTester.run('handlers passed by name', rule, {
      valid: [
        tsx('function Panel() { const handleClick = () => 1; return <b onClick={handleClick} /> }'),
      ],
      invalid: [
        movable(
          'function Panel() { return <b onClick={() => 1} /> }',
          'onClick',
          'Panel',
          'handleClick'
        ),
      ],
    })
  })

  describe('variants', () => {
    ruleTester.run('names and shapes', rule, {
      valid: [
        // An attribute that is not an event, and an event given a value that is not a function written there.
        tsx('function Panel() { return <b ref={(el) => el} title="x" /> }'),
        tsx('function Panel({ onPick }: { onPick: () => void }) { return <b onClick={onPick} /> }'),
      ],
      invalid: [
        // The short name is taken: the element joins it.
        movable(
          'function Panel() { const handleClick = 1; return <button onClick={() => handleClick} /> }',
          'onClick',
          'Panel',
          'handleButtonClick'
        ),
        movable(
          'function Panel() { return <b onKeyDown={function () { return 1 }} /> }',
          'onKeyDown',
          'Panel',
          'handleKeyDown'
        ),
        movable(
          'const Panel = () => <Menu.Item onSelect={() => 1} />',
          'onSelect',
          'Panel',
          'handleSelect'
        ),
        // Wrapped in `memo`, a component goes by the name of the variable that holds it.
        movable(
          'const Panel = memo(() => <b onClick={() => 1} />)',
          'onClick',
          'Panel',
          'handleClick'
        ),
        // A handler in a `.map` that reads nothing of the row can move up like any other.
        movable(
          'function List({ ids }: { ids: string[] }) { return <ul>{ids.map(() => <li onClick={() => 1} />)}</ul> }',
          'onClick',
          'List',
          'handleClick'
        ),
        // A local of a render helper nested in the component exists only there, like a row.
        {
          ...tsx(
            'function Panel() { const row = () => { const id = 1; return <li onClick={() => id} /> }; return <ul>{row()}</ul> }'
          ),
          errors: [
            {
              messageId: 'inlineInRow',
              data: { attribute: 'onClick', reads: '`id`', component: 'Panel' },
            },
          ],
        },
        // Reading the row and the component: only the row is named, since only it blocks the move.
        {
          ...tsx(
            'function List({ ids }: { ids: string[] }) { const total = ids.length; return <ul>{ids.map((id) => <li onClick={() => id + total} />)}</ul> }'
          ),
          errors: [
            {
              messageId: 'inlineInRow',
              data: { attribute: 'onClick', reads: '`id`', component: 'List' },
            },
          ],
        },
        // An element with no plain name gives none to the proposal: the number tells the names apart.
        {
          ...tsx(
            'function Panel() { return <><svg:rect onClick={() => 1} /><svg:rect onClick={() => 2} /></> }'
          ),
          errors: [{ message: /as `handleClick`/ }, { message: /as `handleClick2`/ }],
        },
        // A function reading a `.map` row cannot move up: the row becomes a component.
        {
          ...tsx(
            'function List({ ids }: { ids: string[] }) { return <ul>{ids.map((id) => <li onClick={() => id} />)}</ul> }'
          ),
          errors: [{ messageId: 'inlineInRow' }],
        },
      ],
    })
  })

  // L3: N/A — the rule takes no option.

  describe('unmanaged errors', () => {
    ruleTester.run('JSX no component renders', rule, {
      valid: [
        // A test renders inline: its callback is not a component's body.
        tsx("it('clicks', () => { render(<Panel onPick={() => 1} />) })"),
        tsx('function helper() { return <b onClick={() => 1} /> }'),
      ],
      invalid: [],
    })
  })

  describe('edge cases', () => {
    ruleTester.run('two handlers, one name', rule, {
      valid: [],
      invalid: [
        // Two `onClick` in one component: the second takes the element, the third a number.
        {
          ...tsx(
            'function Panel() { return <><b onClick={() => 1} /><b onClick={() => 2} /><b onClick={() => 3} /></> }'
          ),
          errors: [
            { message: /as `handleClick`/ },
            { message: /as `handleBClick`/ },
            { message: /as `handleBClick2`/ },
          ],
        },
      ],
    })
  })
})
