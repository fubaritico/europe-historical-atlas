/**
 * What every rule of the plugin asks of the tree: which function a node is, what a statement declares,
 * and what it reads. Adapted from `eslint-plugin-fluid-react`'s `utils.mjs`.
 */

/**
 * A function node, whichever way it is written.
 * @typedef {import('estree').FunctionDeclaration | import('estree').FunctionExpression | import('estree').ArrowFunctionExpression} FunctionNode
 */

/**
 * Tells whether a name is a component's: it starts with an uppercase letter.
 * @param {string | undefined} name - the name of the function
 * @returns {boolean} `true` for a component name
 */
export const isComponentName = (name) => name !== undefined && /^[A-Z]/.test(name)

/**
 * Tells whether a name is a hook's: `use`, or `use` followed by an uppercase letter or a digit. It is the
 * test `eslint-plugin-react-hooks` makes, so both plugins agree on what a hook is.
 * @param {string | undefined} name - the name
 * @returns {boolean} `true` for a hook name
 */
export const isHookName = (name) =>
  name !== undefined && (name === 'use' || /^use[A-Z0-9]/.test(name))

/**
 * Tells whether an expression renders something: JSX, or a condition with JSX in one of its branches.
 * A `null` alone renders nothing: a helper may return it as a value that means "none".
 * @param {import('estree').Node | null | undefined} expression - the returned expression
 * @returns {boolean} `true` when the expression holds JSX
 */
export const isRender = (expression) => {
  if (!expression) return false
  /** @type {string} */
  const type = expression.type
  if (type === 'JSXElement' || type === 'JSXFragment') return true
  if (expression.type === 'ConditionalExpression') {
    return isRender(expression.consequent) || isRender(expression.alternate)
  }
  if (expression.type === 'LogicalExpression')
    return isRender(expression.left) || isRender(expression.right)
  return false
}

/**
 * The node holding another one. ESLint sets `parent` on every node it walks; reading it through this
 * typed door lets the caller narrow it on `type`.
 * @param {import('estree').Node} node - the node
 * @returns {import('estree').Node | null} its parent, or `null` at the top of the tree
 */
export const parentOf = (node) => /** @type {import('eslint').Rule.Node} */ (node).parent ?? null

/**
 * Finds the name of a function, from its own declaration or from the `const` it is assigned to.
 * @param {FunctionNode} node - the function
 * @returns {string | undefined} its name, or `undefined` when it has none
 */
export const functionName = (node) => {
  if (node.type !== 'ArrowFunctionExpression' && node.id) return node.id.name
  const parent = parentOf(node)
  if (parent?.type === 'VariableDeclarator' && parent.id.type === 'Identifier')
    return parent.id.name
  return undefined
}

/**
 * Lists every reference of a scope and of the scopes inside it.
 * @param {import('eslint').Scope.Scope} scope - the scope
 * @returns {import('eslint').Scope.Reference[]} its references, nested ones included
 */
export const referencesWithin = (scope) => [
  ...scope.references,
  ...scope.childScopes.flatMap(referencesWithin),
]

/**
 * Tells whether a node sits inside another one, by their ranges.
 * @param {import('estree').Node} inner - the node to place
 * @param {import('estree').Node} outer - the node that may hold it
 * @returns {boolean} `true` when `inner` sits within `outer`
 */
const isInside = (inner, outer) => {
  const [from, to] = /** @type {[number, number]} */ (inner.range)
  const [start, end] = /** @type {[number, number]} */ (outer.range)
  return from >= start && to <= end
}

/**
 * Lists the variables a statement reads, closures included, from the references of its function.
 * @param {import('estree').Node} statement - the statement
 * @param {import('eslint').Scope.Reference[]} references - the references of the function holding it
 * @returns {Set<import('eslint').Scope.Variable>} the variables read inside the statement
 */
export const variablesReadBy = (statement, references) => {
  /** @type {Set<import('eslint').Scope.Variable>} */
  const read = new Set()
  for (const { identifier, resolved } of references) {
    if (resolved !== null && isInside(identifier, statement)) read.add(resolved)
  }
  return read
}

/** How a statement that declares nothing is named: by its keyword. */
const KEYWORD_NAMES = /** @type {Readonly<Record<string, string>>} */ ({
  ReturnStatement: 'return',
  ThrowStatement: 'throw',
})

/**
 * Names a statement in a message: the variable it declares, the function, or the call it makes.
 * @param {import('estree').Statement} statement - the statement
 * @param {import('eslint').SourceCode} sourceCode - the file, to read the statement
 * @returns {string} a short name for the statement
 */
export const statementName = (statement, sourceCode) => {
  const declarator =
    statement.type === 'VariableDeclaration' ? statement.declarations[0] : undefined
  if (declarator !== undefined) return sourceCode.getText(declarator.id)
  if (statement.type === 'FunctionDeclaration') return statement.id.name
  if (statement.type === 'ExpressionStatement' && statement.expression.type === 'CallExpression') {
    return `${sourceCode.getText(statement.expression.callee)}()`
  }
  if (statement.type === 'IfStatement') return `if (${sourceCode.getText(statement.test)})`
  return KEYWORD_NAMES[statement.type] ?? sourceCode.getText(statement).split('\n')[0] ?? ''
}

/**
 * The length of the line break at an offset: two for CRLF, one for LF, none at the end of the file.
 * @param {string} text - the file's text
 * @param {number} at - the offset
 * @returns {number} the length of the break
 */
const lineBreakAt = (text, at) => {
  if (text.startsWith('\r\n', at)) return 2
  return text[at] === '\n' ? 1 : 0
}

/**
 * The range of the whole lines a node stands on, indentation and line break included — and the blank line
 * below it when asked, so a removal leaves no gap where the node was.
 * @param {import('estree').Node | import('estree').Comment} node - the node, alone on its lines
 * @param {string} text - the file's text
 * @param {boolean} withBlankBelow - whether to take a blank line that follows too
 * @returns {[number, number]} the range
 */
export const wholeLines = (node, text, withBlankBelow) => {
  const [start, end] = /** @type {[number, number]} */ (node.range)
  const from = start - (node.loc?.start.column ?? 0)
  const to = end + lineBreakAt(text, end)
  const next = text.indexOf('\n', to)
  const blankBelow = withBlankBelow && next !== -1 && text.slice(to, next).trim() === ''
  return [from, blankBelow ? next + 1 : to]
}

/**
 * The name a component goes by: its own, or — wrapped as `const Panel = memo(() => …)` — the name of the
 * variable that receives the wrapper's call.
 * @param {FunctionNode} fn - the function
 * @returns {string | undefined} its name, or `undefined` when it has none
 */
export const componentNameOf = (fn) => {
  const own = functionName(fn)
  if (own !== undefined) return own
  const call = parentOf(fn)
  const holder = call?.type === 'CallExpression' ? parentOf(call) : null
  return holder?.type === 'VariableDeclarator' && holder.id.type === 'Identifier'
    ? holder.id.name
    : undefined
}

/**
 * Tells whether a function is a component: an uppercase name, and JSX among what it returns.
 * @param {FunctionNode} fn - the function
 * @returns {boolean} `true` for a component
 */
export const isComponent = (fn) => {
  const name = componentNameOf(fn)
  if (name === undefined || !isComponentName(name)) return false
  if (fn.body.type !== 'BlockStatement') return isRender(fn.body)
  return fn.body.body.some(
    (statement) => statement.type === 'ReturnStatement' && isRender(statement.argument)
  )
}
