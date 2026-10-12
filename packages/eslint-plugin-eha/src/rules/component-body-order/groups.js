import { isHookName } from '../../utils/ast.js'

/**
 * The groups of a component or hook body.
 * @typedef {'guard' | 'store' | 'storeAction' | 'context' | 'id' | 'ref' | 'state' | 'derived' | 'handler' | 'effect' | 'render'} Group
 */

/**
 * What the rule knows of one statement at the top of a body.
 * @typedef {object} Entry
 * @property {Group | undefined} group - its group; `undefined` when the order says nothing of it
 * @property {boolean} earlyReturn - `true` for an `if` that returns: nothing moves across it
 * @property {import('estree').Identifier | undefined} unknownHook - a hook the rule cannot place
 */

/**
 * What classifying a statement needs besides the statement.
 * @typedef {object} Settings
 * @property {Record<string, Group>} hooks - the group of every custom hook, from the `hooks` option
 * @property {string[]} stores - the names a store is selected through, from the `stores` option
 * @property {(declared: import('estree').Pattern) => boolean} isAction - whether a selected value is a function
 */

/**
 * The order of a body, from its first line to its last. A store is injected like the props, so it is
 * read first. A declaration never goes above what it reads: a selector that reads a state stays below it.
 * @type {readonly Group[]}
 */
export const GROUP_ORDER = [
  'guard',
  'store',
  'storeAction',
  'context',
  'id',
  'ref',
  'state',
  'derived',
  'handler',
  'effect',
  'render',
]

/** The groups a custom hook can be given in the `hooks` option: what it returns decides. */
export const HOOK_GROUPS = [
  'store',
  'context',
  'id',
  'ref',
  'state',
  'derived',
  'handler',
  'effect',
]

/**
 * The separator comment that opens each group. The last group renders in a component and returns in a hook,
 * so its label follows the owner.
 * @type {Record<Group, string>}
 */
const LABELS = {
  guard: 'Guards',
  store: 'Store',
  storeAction: 'Store actions',
  context: 'Context',
  id: 'Ids',
  ref: 'Refs',
  state: 'State',
  derived: 'Derived',
  handler: 'Handlers',
  effect: 'Effects',
  render: 'Render',
}

/** Every text a separator comment may hold, to tell a separator from an ordinary comment. */
export const SEPARATOR_LABELS = new Set([...Object.values(LABELS), 'Return'])

/**
 * The separator of a group, in a component or a hook.
 * @param {Group} group - the group
 * @param {'component' | 'hook'} kind - what holds the body
 * @returns {string} the text of its separator comment
 */
export const labelOf = (group, kind) =>
  group === 'render' && kind === 'hook' ? 'Return' : LABELS[group]

/**
 * Where React's own hooks go.
 * @type {Readonly<Record<string, Group>>}
 */
const REACT_HOOKS = {
  use: 'context',
  useContext: 'context',
  useId: 'id',
  useRef: 'ref',
  useState: 'state',
  useReducer: 'state',
  useTransition: 'state',
  useActionState: 'state',
  useOptimistic: 'state',
  useSyncExternalStore: 'state',
  useMemo: 'derived',
  useDeferredValue: 'derived',
  useCallback: 'handler',
  useImperativeHandle: 'handler',
  useEffectEvent: 'effect',
  useInsertionEffect: 'effect',
  useLayoutEffect: 'effect',
  useEffect: 'effect',
  useDebugValue: 'render',
}

/** An entry for a statement the order says nothing of. */
const NONE = /** @type {Entry} */ ({ group: undefined, earlyReturn: false, unknownHook: undefined })

/**
 * An entry for a statement of a known group.
 * @param {Group} group - the group
 * @returns {Entry} the entry
 */
const entry = (group) => ({ group, earlyReturn: false, unknownHook: undefined })

/**
 * Tells whether a branch always ends with the given statement type.
 * @param {import('estree').Statement} statement - the branch
 * @param {'ReturnStatement' | 'ThrowStatement'} type - the statement it ends with
 * @returns {boolean} `true` when the branch ends with it
 */
const endsWith = (statement, type) => {
  if (statement.type === type) return true
  if (statement.type !== 'BlockStatement') return false
  const last = statement.body.at(-1)
  return last !== undefined && endsWith(last, type)
}

/**
 * Classifies an `if`: an early return renders, a check that throws guards, anything else is unplaced.
 * @param {import('estree').IfStatement} statement - the `if`
 * @returns {Entry} its entry
 */
const classifyIf = (statement) => {
  if (endsWith(statement.consequent, 'ReturnStatement'))
    return { ...entry('render'), earlyReturn: true }
  if (endsWith(statement.consequent, 'ThrowStatement')) return entry('guard')
  return NONE
}

/**
 * Classifies a call to a hook or to a store, and what it declares.
 * @param {import('estree').Node | null | undefined} expression - the expression
 * @param {import('estree').Pattern | undefined} declared - what the statement declares with it, if anything
 * @param {Settings} settings - the options and the type information
 * @returns {Entry | undefined} its entry, or `undefined` when it calls neither
 */
const classifyCall = (expression, declared, settings) => {
  if (expression?.type !== 'CallExpression' || expression.callee.type !== 'Identifier')
    return undefined
  const { name } = expression.callee
  if (settings.stores.includes(name)) {
    return entry(declared !== undefined && settings.isAction(declared) ? 'storeAction' : 'store')
  }
  if (!isHookName(name)) return undefined
  const group = REACT_HOOKS[name] ?? settings.hooks[name]
  return group === undefined ? { ...NONE, unknownHook: expression.callee } : entry(group)
}

/**
 * Classifies a `const` or a `let`: a hook or a store by its call, a function as a handler, anything else
 * as a derived value.
 * @param {import('estree').VariableDeclaration} statement - the declaration
 * @param {Settings} settings - the options and the type information
 * @returns {Entry} its entry
 */
const classifyDeclaration = (statement, settings) => {
  const [declarator] = statement.declarations
  const call = classifyCall(declarator?.init, declarator?.id, settings)
  if (call !== undefined) return call
  const type = declarator?.init?.type
  return entry(
    type === 'ArrowFunctionExpression' || type === 'FunctionExpression' ? 'handler' : 'derived'
  )
}

/**
 * Finds the group of a statement at the top of a body.
 * @param {import('estree').Statement} statement - the statement
 * @param {Settings} settings - the options and the type information
 * @returns {Entry} its entry
 */
export const classify = (statement, settings) => {
  switch (statement.type) {
    case 'ReturnStatement':
      return entry('render')
    case 'ThrowStatement':
      return entry('guard')
    case 'FunctionDeclaration':
      return entry('handler')
    case 'IfStatement':
      return classifyIf(statement)
    case 'ExpressionStatement':
      return classifyCall(statement.expression, undefined, settings) ?? NONE
    case 'VariableDeclaration':
      return classifyDeclaration(statement, settings)
    default:
      return NONE
  }
}
