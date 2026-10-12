import { parentOf, wholeLines } from '../../utils/ast.js'

/**
 * How the body uses its `props` parameter.
 * @typedef {object} PropsUse
 * @property {string[]} fields - the fields read one by one, `props.a`, in the order first read
 * @property {import('estree').VariableDeclaration[]} destructurings - every `const { … } = props`
 * @property {boolean} whole - whether it is also used whole: forwarded, spread or passed on
 */

/**
 * The field a reference reads, as in `props.label`.
 * @param {import('estree').Node | null} parent - the node holding the reference
 * @param {import('estree').Identifier} identifier - the reference
 * @returns {string | undefined} the field's name, or `undefined` when the reference reads no field
 */
const fieldRead = (parent, identifier) => {
  const holder = parent === null ? null : parentOf(parent)
  // Writing a field — `props.a = 1`, `props.a++` — is not reading it: the props are used whole.
  const written =
    (holder?.type === 'AssignmentExpression' && holder.left === parent) ||
    holder?.type === 'UpdateExpression'
  return written ? undefined : fieldReadOnly(parent, identifier)
}

/**
 * The field a reference names, as in `props.label`.
 * @param {import('estree').Node | null} parent - the node holding the reference
 * @param {import('estree').Identifier} identifier - the reference
 * @returns {string | undefined} the field's name, or `undefined` when the reference names no field
 */
const fieldReadOnly = (parent, identifier) =>
  parent?.type === 'MemberExpression' &&
  parent.object === identifier &&
  parent.property.type === 'Identifier'
    ? parent.property.name
    : undefined

/**
 * The `const { … } = props` a reference sits in, if it is one.
 * @param {import('estree').Node | null} parent - the node holding the reference
 * @param {import('estree').Identifier} identifier - the reference
 * @returns {import('estree').VariableDeclaration | undefined} the declaration, or `undefined`
 */
const destructuringOf = (parent, identifier) => {
  if (
    parent?.type !== 'VariableDeclarator' ||
    parent.init !== identifier ||
    parent.id.type !== 'ObjectPattern'
  ) {
    return undefined
  }
  const statement = parentOf(parent)
  return statement?.type === 'VariableDeclaration' ? statement : undefined
}

/**
 * Records one reference to the props parameter in what the body does with it.
 * @param {PropsUse} use - what has been found so far, completed in place
 * @param {import('estree').Identifier} identifier - the reference
 */
const recordUse = (use, identifier) => {
  const parent = parentOf(identifier)
  const field =
    parent?.type === 'MemberExpression' && parent.computed
      ? undefined
      : fieldRead(parent, identifier)
  const destructuring = destructuringOf(parent, identifier)
  if (field !== undefined) {
    if (!use.fields.includes(field)) use.fields.push(field)
  } else if (destructuring !== undefined) {
    use.destructurings.push(destructuring)
  } else {
    use.whole = true
  }
}

/**
 * Sorts the references to the props parameter into fields read, destructurings and whole uses.
 * @param {import('eslint').Scope.Reference[]} references - the references to the parameter
 * @returns {PropsUse} how the body uses it
 */
const propsUse = (references) => {
  /** @type {PropsUse} */
  const use = { fields: [], destructurings: [], whole: false }
  for (const { identifier } of references)
    recordUse(use, /** @type {import('estree').Identifier} */ (identifier))
  return use
}

/**
 * Writes the fix for the one case it is safe: a single `const { … } = props` at the top of the body, and no
 * other use. The pattern moves into the signature, with the parameter's type, and the line goes.
 * @param {import('estree').Identifier} param - the props parameter
 * @param {PropsUse} use - how the body uses it
 * @param {import('estree').BlockStatement} body - the body
 * @param {import('eslint').SourceCode} sourceCode - the file
 * @returns {import('eslint').Rule.ReportFixer | null} the fix, or `null` when it is not safe to write
 */
const signatureFix = (param, use, body, sourceCode) => {
  const declaration = rewritable(use, body)
  if (declaration === undefined) return null
  const { statement, declarator } = declaration
  const pattern = sourceCode.getText(declarator.id)
  const annotation = /** @type {{ typeAnnotation?: import('estree').Node }} */ (param)
    .typeAnnotation
  const typed = annotation === undefined ? pattern : `${pattern}${sourceCode.getText(annotation)}`
  const removed = wholeLines(statement, sourceCode.text, body.body[0] === statement)
  return (fixer) => [fixer.replaceText(param, typed), fixer.removeRange(removed)]
}

/**
 * Finds the one destructuring the fix may move: alone, at the top of the body, untyped. A pattern typed
 * on its own would carry two annotations once moved, so that case is left to the author.
 * @param {PropsUse} use - how the body uses the props
 * @param {import('estree').BlockStatement} body - the body
 * @returns {{ statement: import('estree').VariableDeclaration, declarator: import('estree').VariableDeclarator } | undefined}
 *   the destructuring, or `undefined` when none may be rewritten
 */
const rewritable = (use, body) => {
  const [statement] = use.destructurings
  if (use.fields.length > 0 || use.destructurings.length !== 1 || statement === undefined)
    return undefined
  const [declarator] = statement.declarations
  const id = /** @type {{ typeAnnotation?: unknown } | undefined} */ (declarator?.id)
  const typedPattern = id?.typeAnnotation
  const alone = statement.declarations.length === 1 && body.body.includes(statement)
  return declarator !== undefined && alone && typedPattern === undefined
    ? { statement, declarator }
    : undefined
}

/**
 * The signature the message proposes, with the reader's own names.
 * @param {string} name - the component
 * @param {import('estree').Identifier} param - the props parameter
 * @param {PropsUse} use - how the body uses it
 * @param {import('eslint').SourceCode} sourceCode - the file
 * @returns {string} `X({ a, b }: XProps)`
 */
const proposedSignature = (name, param, use, sourceCode) => {
  const destructured = use.destructurings.flatMap((statement) =>
    statement.declarations.map((declarator) =>
      sourceCode.getText(declarator.id).replace(/^\{\s*|\s*\}$/g, '')
    )
  )
  const fields = [...use.fields, ...destructured].join(', ')
  const annotation = /** @type {{ typeAnnotation?: import('estree').Node }} */ (param)
    .typeAnnotation
  return `${name}({ ${fields} }${annotation === undefined ? '' : sourceCode.getText(annotation)})`
}

/**
 * Finds a component that takes its props whole and reads them field by field. They are destructured in the
 * signature, so the reader sees what the component takes before reading its body.
 *
 * A component that also uses its props whole — forwards them, spreads them — keeps them whole: destructuring
 * in the signature would change what it passes on. That is the case where it "causes a problem".
 * @param {import('../../utils/ast.js').FunctionNode} node - the component
 * @param {string} name - its name
 * @param {import('eslint').SourceCode} sourceCode - the file
 * @returns {import('eslint').Rule.ReportDescriptor | undefined} the problem, or `undefined`
 */
export const propsProblem = (node, name, sourceCode) => {
  const [param] = node.params
  if (param?.type !== 'Identifier' || node.body.type !== 'BlockStatement') return undefined
  const variable = sourceCode
    .getDeclaredVariables(node)
    .find((candidate) => candidate.name === param.name)
  const use = propsUse(variable?.references ?? [])
  if (use.whole || (use.fields.length === 0 && use.destructurings.length === 0)) return undefined
  return {
    node: param,
    messageId: 'propsInSignature',
    data: { name, signature: proposedSignature(name, param, use, sourceCode) },
    fix: signatureFix(param, use, node.body, sourceCode),
  }
}
