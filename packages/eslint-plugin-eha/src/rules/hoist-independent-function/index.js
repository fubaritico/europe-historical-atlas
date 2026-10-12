import {
  functionName,
  parentOf,
  referencesWithin,
  statementName,
  variablesReadBy,
} from '../../utils/ast.js'

import { moveToModule } from './move.js'

/**
 * Finds the function a statement declares: `function x() {}` or `const x = () => {}`.
 * @param {import('estree').Statement} statement - a statement at the top of a body
 * @returns {import('../../utils/ast.js').FunctionNode | undefined} the function, or `undefined`
 */
const declaredFunction = (statement) => {
  if (statement.type === 'FunctionDeclaration') return statement
  // A `let` holding a function may be reassigned: it is state that happens to hold a function.
  if (statement.type !== 'VariableDeclaration' || statement.kind !== 'const') return undefined
  if (statement.declarations.length !== 1) return undefined
  const init = statement.declarations[0]?.init
  return init?.type === 'ArrowFunctionExpression' || init?.type === 'FunctionExpression'
    ? init
    : undefined
}

/**
 * Tells whether a variable lives in a function — the enclosing one or any above it — rather than in the
 * module or among the globals, where a function moved out would still see it.
 * @param {import('eslint').Scope.Variable} variable - the variable read
 * @returns {boolean} `true` when moving out of the function would lose it
 */
const livesInAFunction = (variable) =>
  variable.scope.type !== 'module' && variable.scope.type !== 'global'

/**
 * Tells whether an arrow reads what it inherits from the function holding it — `this`, `arguments`,
 * `super`, `new.target` — since an arrow has none of its own. Read on the text, so a word in a string or a
 * comment keeps the function where it is: the cautious side.
 * @param {import('../../utils/ast.js').FunctionNode} fn - the function
 * @param {import('eslint').SourceCode} sourceCode - the file
 * @returns {boolean} `true` when moving it out would change what those mean
 */
const readsOuterThis = (fn, sourceCode) =>
  fn.type === 'ArrowFunctionExpression' &&
  /\bthis\b|\barguments\b|\bsuper\b|\bnew\.target\b/.test(sourceCode.getText(fn))

/** The calls Vitest lifts above the module: a factory given to them must read nothing outside itself. */
const HOISTED_CALLS = new Set(['vi.mock', 'vi.hoisted'])

/**
 * Tells whether a function is the factory of a call Vitest lifts above every other statement of the file.
 * A helper inside it reads nothing because it must not: moved out, it would be read before it exists.
 * @param {import('../../utils/ast.js').FunctionNode} owner - the function
 * @param {import('eslint').SourceCode} sourceCode - the file
 * @returns {boolean} `true` for a `vi.mock` or `vi.hoisted` factory
 */
const isHoistedFactory = (owner, sourceCode) => {
  const call = parentOf(owner)
  return call?.type === 'CallExpression' && HOISTED_CALLS.has(sourceCode.getText(call.callee))
}

/**
 * Tells whether moving a function to the module would give the module two bindings of one name: the
 * module has it already, or another function of the file declares the same name and would move too.
 * @param {import('estree').Statement} statement - the statement declaring the function
 * @param {import('eslint').SourceCode} sourceCode - the file
 * @returns {boolean} `true` when the name is taken
 */
const nameTaken = (statement, sourceCode) => {
  const own = new Set(sourceCode.getDeclaredVariables(statement))
  const names = new Set([...own].map((variable) => variable.name))
  return sourceCode.scopeManager.scopes.some((scope) =>
    scope.variables.some((variable) => names.has(variable.name) && !own.has(variable))
  )
}

/**
 * Tells whether a variable is declared inside a node — the function's own parameters and locals.
 * @param {import('eslint').Scope.Variable} variable - the variable
 * @param {import('estree').Node} node - the node
 * @returns {boolean} `true` when every definition of it sits within the node
 */
const declaredWithin = (variable, node) => {
  const [start, end] = /** @type {[number, number]} */ (node.range)
  return variable.defs.every(({ name }) => {
    const [from, to] = /** @type {[number, number]} */ (name.range)
    return from >= start && to <= end
  })
}

/**
 * Lists what a declared function reads from the functions around it — their parameters, variables and
 * type parameters — anywhere in its statement, its type annotation included. Its own name does not
 * count: a function may call itself wherever it lives.
 * @param {import('estree').Statement} statement - the statement declaring it
 * @param {import('../../utils/ast.js').FunctionNode} owner - the function holding it
 * @param {import('eslint').SourceCode} sourceCode - the file
 * @returns {import('eslint').Scope.Variable[]} the variables it reads from outside itself
 */
const outerReads = (statement, owner, sourceCode) => {
  const references = referencesWithin(sourceCode.getScope(owner))
  return [...variablesReadBy(statement, references)].filter(
    (variable) => livesInAFunction(variable) && !declaredWithin(variable, statement)
  )
}

/**
 * Names the function holding another in a message: its own name, or the call it is the callback of.
 * @param {import('../../utils/ast.js').FunctionNode} owner - the function
 * @param {import('eslint').SourceCode} sourceCode - the file
 * @returns {string} how the message names it
 */
const ownerLabel = (owner, sourceCode) => {
  const name = functionName(owner)
  if (name !== undefined) return `\`${name}\``
  const call = parentOf(owner)
  const isCallback =
    call?.type === 'CallExpression' && call.arguments.some((argument) => argument === owner)
  return isCallback ? `the callback of \`${sourceCode.getText(call.callee)}(…)\`` : 'its function'
}

/**
 * Reports, in any function, a function declared at the top of its body that reads nothing from it — no
 * parameter, no variable, no type parameter, no `this`. It is a module-level function that was written in
 * the wrong place: inside, it is rebuilt on every call, a reader looks for what it captures and finds
 * nothing, and it cannot be tested alone.
 * @type {import('eslint').Rule.RuleModule}
 */
const rule = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    docs: {
      description: 'Move a function that reads nothing from the function holding it to the module.',
    },
    schema: [],
    messages: {
      independent:
        'Move `{{name}}` out of {{owner}}, to the module: it reads nothing from it.\n' +
        'Inside, it is rebuilt on every call, and a reader looks for what it captures and finds nothing. At ' +
        'the module it can be tested alone.',
    },
  },
  create(context) {
    /** @param {import('../../utils/ast.js').FunctionNode} owner - a function whose body is checked */
    const check = (owner) => {
      if (owner.body.type !== 'BlockStatement' || isHoistedFactory(owner, context.sourceCode))
        return
      for (const statement of owner.body.body) {
        const fn = declaredFunction(statement)
        if (fn === undefined || readsOuterThis(fn, context.sourceCode)) continue
        if (outerReads(statement, owner, context.sourceCode).length > 0) continue
        context.report({
          node: statement,
          messageId: 'independent',
          data: {
            name: statementName(statement, context.sourceCode),
            owner: ownerLabel(owner, context.sourceCode),
          },
          // Two bindings of one name would be a broken file: reported, and left for the author to name.
          fix: nameTaken(statement, context.sourceCode)
            ? null
            : moveToModule(statement, context.sourceCode),
        })
      }
    }
    return { FunctionDeclaration: check, FunctionExpression: check, ArrowFunctionExpression: check }
  },
}

export default rule
