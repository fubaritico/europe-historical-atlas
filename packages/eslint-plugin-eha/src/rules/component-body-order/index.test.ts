import { Linter, RuleTester } from 'eslint'
import tseslint from 'typescript-eslint'
import { describe, expect, it } from 'vitest'

import rule from './index.js'

RuleTester.describe = describe
RuleTester.it = it
RuleTester.itOnly = it.only

/** Every case runs with type information: the store's actions are told from its values by their type. */
const ruleTester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: {
      ecmaFeatures: { jsx: true },
      projectService: { allowDefaultProject: ['*.tsx'] },
      tsconfigRootDir: import.meta.dirname,
    },
  },
})

/** A store selected the way the Cartographer does: a hook prop called with a selector. */
const preamble = `
type State = { tool: string; selectTool: (tool: string) => void }
type Props = { label: string; store: <T>(select: (state: State) => T) => T }
`

/** The options the Cartographer will give the rule. */
const options = [
  {
    stores: ['store'],
    hooks: {
      useHoldToOpen: 'handler' as const,
      useInsideWindow: 'ref' as const,
      useDismiss: 'effect' as const,
    },
  },
]

/**
 * A case of the rule, on a `.tsx` file, with the preamble and the options.
 * @param code - the component or hook
 * @returns the case
 */
const valid = (code: string) => ({ code: preamble + code, filename: 'file.tsx', options })

/**
 * An invalid case: its code, what the rule reports, and what its fixes write.
 * @param code - the component or hook
 * @param errors - the reports, by message id
 * @param output - the code once fixed, or `null` when nothing is fixed
 * @returns the case
 */
const invalid = (code: string, errors: string[], output: string | null = null) => ({
  ...valid(code),
  errors: errors.map((messageId) => ({ messageId })),
  output: output === null ? null : preamble + output,
})

/** A component in the order, with every group and its separator. */
const ordered = `
function Panel({ label, store }: Props) {
  // Store
  const tool = store((state) => state.tool)

  // Store actions
  const selectTool = store((state) => state.selectTool)

  // Ids
  const id = useId()

  // Refs
  const button = useRef(null)

  // State
  const [open, setOpen] = useState(false)

  // Derived
  const title = label + tool

  // Handlers
  const onClick = () => {
    setOpen(!open)
    selectTool('draw')
  }

  // Effects
  useEffect(() => {}, [open])

  // Render
  return <button id={id} ref={button} title={title} onClick={onClick} />
}
`

/**
 * Lints one component with the rule, through a parser given no type information.
 * @param ruleOptions - the options of the rule
 * @returns what the lint reports
 */
const lintUntyped = (ruleOptions: unknown) =>
  new Linter().verify(
    preamble + ordered,
    {
      files: ['**/*.tsx'],
      languageOptions: {
        parser: tseslint.parser,
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
      plugins: { eha: { rules: { 'component-body-order': rule } } },
      rules: { 'eha/component-body-order': ['error', ruleOptions] },
    },
    'file.tsx'
  )

describe('eha/component-body-order', () => {
  describe('happy path', () => {
    ruleTester.run('in order', rule, {
      valid: [
        valid(ordered),
        valid(`
function useCounter(start: number) {
  // State
  const [count, setCount] = useState(start)

  // Handlers
  const increment = () => setCount(count + 1)

  // Return
  return { count, increment }
}
`),
      ],
      invalid: [],
    })
  })

  describe('variants', () => {
    ruleTester.run('order and separators', rule, {
      valid: [
        // A declaration never goes above what it reads: the hook takes the handler, so it stays below it.
        valid(`
function Tool({ label }: Props) {
  // Handlers
  const open = () => label
  const hold = useHoldToOpen(open)

  // Render
  return <b onClick={hold}>{label}</b>
}
`),
        // A derived value that reads a handler stays below it: JavaScript cannot read it before it exists.
        valid(`
function Menu({ label }: Props) {
  // Handlers
  const open = () => label

  // Derived
  const opened = useMemo(() => open(), [open])

  // Render
  return <b>{opened}</b>
}
`),
        // An early return is a barrier: what follows it is another way to the render.
        valid(`
function Waiting({ label }: Props) {
  // Render
  if (label === '') return null

  // Derived
  const title = label.toUpperCase()

  // Render
  return <b>{title}</b>
}
`),
        // A statement the order says nothing of continues the group above it, and moves nothing across it.
        valid(`
function Logged({ label }: Props) {
  // Derived
  const title = label.trim()
  console.warn(title)

  // Refs
  const ref = useRef(null)

  // Render
  return <b ref={ref}>{title}</b>
}
`),
        // A guard opens the body; custom hooks take the group the `hooks` option gives them.
        valid(`
function Menu({ label }: Props) {
  // Guards
  if (label === '') throw new Error('Menu: no label')

  // Context
  const theme = useContext(Theme)

  // Refs
  const shell = useInsideWindow(label)

  // Effects
  useDismiss(shell)

  // Render
  return <b ref={shell}>{theme}</b>
}
`),
        // A hook ends with what it returns, and React's debug label belongs there.
        valid(`
function useLabel(label: string) {
  // Derived
  const trimmed = label.trim()

  // Return
  useDebugValue(trimmed)
  return trimmed
}
`),
        // Writing a field of the props is using them whole: the rule leaves them in place.
        valid(`
function Mutating(props: Props) {
  // Handlers
  const reset = () => {
    props.label = ''
  }

  // Render
  return <b onClick={reset} />
}
`),
        // Props used whole as well as field by field stay whole: the signature would change what is passed on.
        valid(`
function Forward(props: Props) {
  // Render
  return <Inner {...props} title={props.label} />
}
`),
      ],
      invalid: [
        invalid(
          `
function Panel({ label }: Props) {
  // Handlers
  const onClick = () => label

  // State
  const [open] = useState(false)

  // Render
  return <b onClick={onClick}>{open}</b>
}
`,
          ['outOfOrder']
        ),
        invalid(
          `
function Panel({ store }: Props) {
  // Store actions
  const selectTool = store((state) => state.selectTool)

  // Store
  const tool = store((state) => state.tool)

  // Render
  return <b onClick={() => selectTool(tool)} />
}
`,
          ['outOfOrder']
        ),
        invalid(
          `
function Panel({ label }: Props) {
  const title = label.trim()
  return <b>{title}</b>
}
`,
          ['missingSeparator', 'missingSeparator'],
          `
function Panel({ label }: Props) {
  // Derived
  const title = label.trim()

  // Render
  return <b>{title}</b>
}
`
        ),
        invalid(
          `
function Panel({ label }: Props) {
  // State
  const title = label.trim()

  // Render
  return <b>{title}</b>
}
`,
          ['wrongSeparator'],
          `
function Panel({ label }: Props) {
  // Derived
  const title = label.trim()

  // Render
  return <b>{title}</b>
}
`
        ),
        invalid(
          `
function Panel({ label }: Props) {
  // Derived
  const title = label.trim()
  // Derived
  const size = title.length

  // Render
  return <b>{size}</b>
}
`,
          ['misplacedSeparator'],
          `
function Panel({ label }: Props) {
  // Derived
  const title = label.trim()
  const size = title.length

  // Render
  return <b>{size}</b>
}
`
        ),
        invalid(
          `
function Panel({ label }: Props) {
  // Derived
  const title = label.trim()
  // Render
  return <b>{title}</b>
}
`,
          ['separatorSpacing'],
          `
function Panel({ label }: Props) {
  // Derived
  const title = label.trim()

  // Render
  return <b>{title}</b>
}
`
        ),
        invalid(
          `
function Panel({ label }: Props) {
  /** The trimmed label. */
  // Derived
  const title = label.trim()

  // Render
  return <b>{title}</b>
}
`,
          ['separatorFirst'],
          `
function Panel({ label }: Props) {
  // Derived
  /** The trimmed label. */
  const title = label.trim()

  // Render
  return <b>{title}</b>
}
`
        ),
        invalid(
          `
function Panel(props: Props) {
  const { label } = props

  // Render
  return <b>{label}</b>
}
`,
          ['propsInSignature', 'missingSeparator'],
          `
function Panel({ label }: Props) {
  // Render
  return <b>{label}</b>
}
`
        ),
        invalid(
          `
function Panel(props: Props) {
  // Render
  return <b>{props.label}</b>
}
`,
          ['propsInSignature']
        ),
        invalid(
          `
function Panel({ label }: Props) {
  // State
  const [open] = useState(false)

  // Guards
  if (label === '') throw new Error('Panel: no label')

  // Render
  return <b>{open}</b>
}
`,
          ['outOfOrder']
        ),
        invalid(
          `
function Menu({ label }: Props) {
  // Effects
  useDismiss(label)

  // Refs
  const shell = useInsideWindow(label)

  // Render
  return <b ref={shell} />
}
`,
          ['outOfOrder']
        ),
        // The fix keeps a default value: the pattern moves as it is written.
        invalid(
          `
function Panel(props: Props) {
  const { label = 'none' } = props

  // Render
  return <b>{label}</b>
}
`,
          ['propsInSignature', 'missingSeparator'],
          `
function Panel({ label = 'none' }: Props) {
  // Render
  return <b>{label}</b>
}
`
        ),
        // Two destructurings, or a pattern typed on its own: reported, never rewritten.
        invalid(
          `
function Panel(props: Props) {
  // Derived
  const { label } = props
  const { store } = props

  // Render
  return <b>{label}{store}</b>
}
`,
          ['propsInSignature']
        ),
        invalid(
          `
function Panel(props: Props) {
  // Derived
  const { label }: Props = props

  // Render
  return <b>{label}</b>
}
`,
          ['propsInSignature']
        ),
        invalid(
          `
function useLabel(label: string) {
  // Derived
  const trimmed = label.trim()

  return trimmed
}
`,
          ['missingSeparator'],
          `
function useLabel(label: string) {
  // Derived
  const trimmed = label.trim()

  // Return
  return trimmed
}
`
        ),
      ],
    })
  })

  describe('managed errors', () => {
    ruleTester.run('a hook it cannot place', rule, {
      valid: [],
      invalid: [
        invalid(
          `
function Panel({ label }: Props) {
  // Derived
  const thing = useThing(label)

  // Render
  return <b>{thing}</b>
}
`,
          ['unknownHook']
        ),
      ],
    })
  })

  describe('managed errors — the configuration', () => {
    it('stops the lint with what to set when a store selector has no type information', () => {
      expect(() => lintUntyped(options[0])).toThrow(/parserOptions/)
    })

    it('refuses a hook given a group that does not exist', () => {
      expect(() => lintUntyped({ hooks: { useThing: 'render' } })).toThrow(
        /"render" should be equal to one of the allowed values/
      )
    })
  })

  describe('unmanaged errors', () => {
    // L4: what is not a component or a hook is left alone, whatever its body.
    ruleTester.run('not a component', rule, {
      valid: [
        valid(`
function Format(label: string) {
  const out = () => label
  const size = label.length
  return out() + size
}
`),
        valid(`
export default function ({ label }: Props) {
  const out = () => label
  const [open] = useState(false)
  return <b>{open}</b>
}
`),
      ],
      invalid: [],
    })
  })

  describe('edge cases', () => {
    ruleTester.run('small bodies and nesting', rule, {
      valid: [
        valid(`
const Inline = ({ label }: Props) => <b>{label}</b>
`),
      ],
      invalid: [
        // A system, not exceptions: a body of one return still opens with its separator.
        invalid(
          `
function Head({ label }: Props) {
  return <b>{label}</b>
}
`,
          ['missingSeparator'],
          `
function Head({ label }: Props) {
  // Render
  return <b>{label}</b>
}
`
        ),
        // A component declared inside another is checked on its own, and its separators are its own.
        invalid(
          `
function Outer({ label }: Props) {
  // Handlers
  function Inner() {
    return <i>{label}</i>
  }

  // Render
  return <Inner />
}
`,
          ['missingSeparator'],
          `
function Outer({ label }: Props) {
  // Handlers
  function Inner() {
    // Render
    return <i>{label}</i>
  }

  // Render
  return <Inner />
}
`
        ),
      ],
    })
  })
})
