import { componentNameOf, isComponent, parentOf } from '../../utils/ast.js'

/**
 * A function node, as the tree of a `.tsx` file holds it.
 * @typedef {import('../../utils/ast.js').FunctionNode} FunctionNode
 */

/**
 * Finds the functions between a node and the component whose render holds it, innermost first, and the
 * component itself.
 * @param {import('estree').Node} node - the node
 * @returns {{ component: FunctionNode, between: FunctionNode[] } | undefined} the chain, or `undefined` when
 *   no component renders the node — JSX in a test or a helper is not a component's body
 */
const renderingComponent = (node) => {
  /** @type {FunctionNode[]} */
  const between = []
  for (let current = parentOf(node); current !== null; current = parentOf(current)) {
    const type = current.type
    if (
      type !== 'FunctionDeclaration' &&
      type !== 'FunctionExpression' &&
      type !== 'ArrowFunctionExpression'
    ) {
      continue
    }
    if (isComponent(current)) return { component: current, between }
    between.push(current)
  }
  return undefined
}

/**
 * Lists what a handler reads from the functions between it and the component — a `.map` row, a callback's
 * parameter. Those exist only inside that callback: the handler cannot be declared in the component's body.
 * @param {FunctionNode} handler - the inline handler
 * @param {FunctionNode[]} between - the functions between it and the component
 * @param {import('eslint').SourceCode} sourceCode - the file
 * @returns {string[]} the names it reads there, each once
 */
const readsFromCallbacks = (handler, between, sourceCode) => {
  const scopes = new Set(between.map((fn) => sourceCode.getScope(fn)))
  /** @type {Set<string>} */
  const names = new Set()
  for (const { resolved, identifier } of sourceCode.getScope(handler).through) {
    if (resolved !== null && scopes.has(resolved.scope)) names.add(identifier.name)
  }
  return [...names]
}

/**
 * Proposes a name for the handler: `handleClick` for `onClick`, then with the element, then numbered, so
 * it collides with nothing declared around it nor proposed before in the same component.
 * @param {string} attribute - the event attribute, `onClick`
 * @param {string} element - the element's name
 * @param {import('eslint').Scope.Scope} scope - the scope of the attribute
 * @param {Set<string>} proposed - the names already proposed in this component
 * @returns {string} the name
 */
const proposeName = (attribute, element, scope, proposed) => {
  /**
   * Whether a name is still free for the handler.
   * @param {string} candidate - the handler name being considered
   * @returns {boolean} `true` when no scope from the attribute's outwards declares it and it was not
   * already proposed in this component
   */
  const isFree = (candidate) => {
    for (
      let current = /** @type {import('eslint').Scope.Scope | null} */ (scope);
      current;
      current = current.upper
    ) {
      if (current.set.has(candidate)) return false
    }
    return !proposed.has(candidate)
  }
  const event = attribute.slice(2)
  const withElement = `handle${element.charAt(0).toUpperCase()}${element.slice(1)}${event}`
  let name = isFree(`handle${event}`) ? `handle${event}` : withElement
  for (let number = 2; !isFree(name); number++) name = `${withElement}${String(number)}`
  proposed.add(name)
  return name
}

/**
 * The name of the element carrying an attribute: `button`, `PolityList`, `Menu.Item` gives `Item`. It only
 * tells two proposed names apart, so an element with no plain name — `<svg:rect>` — gives none, and the
 * number that follows does that work: a decision, not a value standing in for one that failed to arrive.
 * @param {import('estree').Node | null} opening - the opening element
 * @returns {string} its name, or `''` when it has no plain one
 */
const elementNameOf = (opening) => {
  const name =
    /** @type {{ name?: { type: string, name?: unknown, property?: { name: string } } }} */ (
      opening
    )?.name
  if (name?.type === 'JSXMemberExpression') return name.property?.name ?? ''
  return typeof name?.name === 'string' ? name.name : ''
}

/**
 * Reads an event attribute whose value is a function written in place.
 * @param {import('estree').Node} node - a JSX attribute
 * @returns {{ name: string, handler: FunctionNode } | undefined} the attribute's name and its function, or
 *   `undefined` for any other attribute
 */
const inlineHandlerOf = (node) => {
  const attribute =
    /** @type {{ name: { type: string, name: unknown }, value: { type: string, expression?: import('estree').Node } | null }} */ (
      /** @type {unknown} */ (node)
    )
  const name = attribute.name.type === 'JSXIdentifier' ? String(attribute.name.name) : ''
  const handler =
    attribute.value?.type === 'JSXExpressionContainer' ? attribute.value.expression : undefined
  if (!/^on[A-Z]/.test(name)) return undefined
  if (handler?.type !== 'ArrowFunctionExpression' && handler?.type !== 'FunctionExpression')
    return undefined
  return { name, handler }
}

/**
 * Asks for every function written in an event attribute of a component's render to be declared in the body,
 * under a name, with the other handlers — where `eha/component-body-order` puts them and the reader looks.
 * When the function reads a `.map` row or a callback's parameter it cannot move up: the message asks for the
 * row to become a component of its own, which declares the handler in its body.
 * @type {import('eslint').Rule.RuleModule}
 */
const rule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Declare the event handlers in the component body, and pass them to JSX by name.',
    },
    schema: [],
    messages: {
      inlineHandler:
        'Declare this `{{attribute}}` handler in `{{component}}` as `{{name}}`, with the other handlers, and pass ' +
        'it by name.\nThe reader finds every handler under `// Handlers`, not inside the markup.',
      inlineInRow:
        'This `{{attribute}}` handler reads {{reads}}, which exists only inside the callback around it, so it ' +
        'cannot move up into `{{component}}`.\nGive that part a component of its own, pass {{reads}} as a prop, ' +
        'and declare the handler in its body.',
    },
  },
  create(context) {
    /** @type {Map<FunctionNode, Set<string>>} the names proposed so far, by component */
    const proposedBy = new Map()
    return {
      /** @param {import('estree').Node} node - a JSX attribute */
      JSXAttribute(node) {
        const inline = inlineHandlerOf(node)
        if (inline === undefined) return
        const { name, handler } = inline
        const chain = renderingComponent(node)
        if (chain === undefined) return
        const component = componentNameOf(chain.component) ?? ''
        const reads = readsFromCallbacks(handler, chain.between, context.sourceCode)
        if (reads.length > 0) {
          const listed = reads.map((read) => `\`${read}\``).join(', ')
          context.report({
            node: handler,
            messageId: 'inlineInRow',
            data: { attribute: name, reads: listed, component },
          })
          return
        }
        const proposed = proposedBy.get(chain.component) ?? new Set()
        proposedBy.set(chain.component, proposed)
        const scope = context.sourceCode.getScope(node)
        const handlerName = proposeName(name, elementNameOf(parentOf(node)), scope, proposed)
        context.report({
          node: handler,
          messageId: 'inlineHandler',
          data: { attribute: name, component, name: handlerName },
        })
      },
    }
  },
}

export default rule
