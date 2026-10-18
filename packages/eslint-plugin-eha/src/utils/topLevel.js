import { functionName, isComponent, isHookName } from './ast.js'

/*
 * What a module declares at its top — its hooks and its components — read once for every rule that cares:
 * `one-hook-per-file` counts them, `component-folder-layout` checks where they sit.
 */

/**
 * What a module declares at its top: hooks and components, each with the node a report points at.
 * @typedef {{ hooks: { name: string, node: import('estree').Node }[], components: { name: string, node: import('estree').Node }[] }} Found
 */

/**
 * A top-level declaration, unwrapped from its `export`.
 * @param {import('estree').Program['body'][number]} statement - a statement of the module
 * @returns {import('estree').Node | null | undefined} the declaration it holds
 */
const declarationOf = (statement) =>
  statement.type === 'ExportNamedDeclaration' || statement.type === 'ExportDefaultDeclaration'
    ? /** @type {import('estree').Node | null | undefined} */ (statement.declaration)
    : statement

/**
 * Whether a node is a function expression of either kind.
 * @param {import('estree').Node | null | undefined} node - the node
 * @returns {node is import('estree').ArrowFunctionExpression | import('estree').FunctionExpression} `true` for one
 */
const isFunctionExpression = (node) =>
  node?.type === 'ArrowFunctionExpression' || node?.type === 'FunctionExpression'

/**
 * The function a variable is initialised with: a function itself, or the first argument of a wrapper call.
 * @param {import('estree').Expression | null | undefined} init - the initialiser
 * @returns {import('./ast.js').FunctionNode | null} the function, or `null`
 */
const functionOf = (init) => {
  if (isFunctionExpression(init)) return init
  const first = init?.type === 'CallExpression' ? init.arguments[0] : undefined
  return isFunctionExpression(first) ? first : null
}

/**
 * Note a named function, as a hook or a component.
 * @param {Found} found - what the module declares so far
 * @param {string | undefined} name - the function's name
 * @param {import('./ast.js').FunctionNode} fn - the function
 * @param {import('estree').Node} node - where a report would point
 */
const note = (found, name, fn, node) => {
  if (name === undefined) return
  if (isHookName(name)) found.hooks.push({ name, node })
  else if (isComponent(fn)) found.components.push({ name, node })
}

/**
 * The module's top-level hooks and components.
 * @param {import('estree').Program} program - the module
 * @returns {Found} what it declares
 */
export const topLevel = (program) => {
  /** @type {Found} */
  const found = { hooks: [], components: [] }
  for (const statement of program.body) {
    const declaration = declarationOf(statement)
    if (declaration?.type === 'FunctionDeclaration')
      note(found, functionName(declaration), declaration, declaration)
    if (declaration?.type !== 'VariableDeclaration') continue
    for (const declarator of declaration.declarations) {
      const fn = functionOf(declarator.init)
      if (declarator.id.type === 'Identifier' && fn !== null)
        note(found, declarator.id.name, fn, declarator.id)
    }
  }
  return found
}
