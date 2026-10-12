import { ESLintUtils } from '@typescript-eslint/utils'

import {
  functionName,
  isComponentName,
  isHookName,
  isRender,
  referencesWithin,
} from '../../utils/ast.js'

import { HOOK_GROUPS, classify } from './groups.js'
import { orderProblems } from './order.js'
import { propsProblem } from './props.js'
import { separatorProblems } from './separators.js'

/**
 * A function being visited, and whether one of its `return` renders.
 * @typedef {object} OpenFunction
 * @property {import('../../utils/ast.js').FunctionNode} node - the function
 * @property {boolean} renders - `true` once it returns JSX
 */

/**
 * The options of the rule.
 * @typedef {object} Options
 * @property {Record<string, import('./groups.js').Group>} [hooks] - the group of every custom hook
 * @property {string[]} [stores] - the names a store is selected through
 */

/**
 * Builds what classifying a statement needs. The type information is asked for only when a store selector
 * has to be told a value from an action, and its absence stops the lint with what to set — never a guess.
 * @param {import('eslint').Rule.RuleContext} context - the context of the file
 * @returns {import('./groups.js').Settings} the settings
 */
const settingsOf = (context) => {
  /** @type {unknown} ESLint types the options `any[]`; the schema has checked them */
  const raw = context.options[0]
  const options = /** @type {Options | undefined} */ (raw)
  /** @type {import('@typescript-eslint/utils').ParserServicesWithTypeInformation | undefined} */
  let services
  return {
    hooks: options?.hooks ?? {},
    stores: options?.stores ?? [],
    isAction: (declared) => {
      services ??= ESLintUtils.getParserServices(
        /** @type {import('@typescript-eslint/utils').TSESLint.RuleContext<string, readonly unknown[]>} */ (
          /** @type {unknown} */ (context)
        )
      )
      const node = /** @type {import('@typescript-eslint/utils').TSESTree.Node} */ (
        /** @type {unknown} */ (declared)
      )
      return services.getTypeAtLocation(node).getCallSignatures().length > 0
    },
  }
}

/**
 * Tells what a function is: a component renders JSX under an uppercase name, a hook is named like one.
 * @param {OpenFunction} visited - the function, and whether it renders
 * @returns {{ name: string, kind: 'component' | 'hook' } | undefined} its name and kind, or `undefined`
 */
const ownerOf = ({ node, renders }) => {
  const name = functionName(node)
  if (name === undefined) return undefined
  if (renders && isComponentName(name)) return { name, kind: 'component' }
  return isHookName(name) ? { name, kind: 'hook' } : undefined
}

/**
 * Finds every problem of a component or hook body once it has been read.
 * @param {OpenFunction} visited - the function, and whether it renders
 * @param {import('./groups.js').Settings} settings - the options and the type information
 * @param {import('eslint').SourceCode} sourceCode - the file
 * @returns {import('eslint').Rule.ReportDescriptor[]} every problem found
 */
const functionProblems = (visited, settings, sourceCode) => {
  const owner = ownerOf(visited)
  const { node } = visited
  if (owner === undefined || node.body.type !== 'BlockStatement') return []
  const statements = node.body.body
  const entries = statements.map((statement) => classify(statement, settings))
  const body = {
    owner: owner.name,
    kind: owner.kind,
    statements,
    entries,
    references: referencesWithin(sourceCode.getScope(node)),
    sourceCode,
  }
  const props = owner.kind === 'component' ? propsProblem(node, owner.name, sourceCode) : undefined
  const unknownHooks = entries.flatMap(({ unknownHook }) =>
    unknownHook === undefined
      ? []
      : [{ node: unknownHook, messageId: 'unknownHook', data: { hook: unknownHook.name } }]
  )
  return [
    ...(props ? [props] : []),
    ...unknownHooks,
    ...orderProblems(body),
    ...separatorProblems(body),
  ]
}

/**
 * Puts every declaration of a component or hook body where the reader expects it: the groups in one order,
 * each opened by its separator comment, and the props destructured in the signature.
 * @type {import('eslint').Rule.RuleModule}
 */
const rule = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    docs: {
      description:
        'Enforce the order of declarations, and their separators, in a component or hook body.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          hooks: { type: 'object', additionalProperties: { enum: HOOK_GROUPS } },
          stores: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      outOfOrder:
        'Move `{{name}}` above `{{other}}`: a {{kind}} declares its {{label}} before its {{otherLabel}}.\n' +
        'The order is {{order}}. A declaration never goes above what it reads, so this move is one JavaScript allows.',
      propsInSignature:
        'Destructure the props of `{{name}}` in its signature: `{{signature}}`.\n' +
        'The reader sees what the component takes before reading its body. Keep `props` whole only to pass it on whole.',
      unknownHook:
        'The rule cannot tell where `{{hook}}` goes. Give it the group of what it returns, in the `hooks` option of ' +
        '`eha/component-body-order`: ' +
        HOOK_GROUPS.map((group) => `\`${group}\``).join(', ') +
        '.',
      missingSeparator:
        'Put `// {{label}}` above `{{name}}`: every group of declarations opens with its separator, so the eye ' +
        'finds the group without reading the lines.',
      wrongSeparator: '`// {{found}}` opens the wrong group: this one is `// {{label}}`.',
      misplacedSeparator:
        '`// {{found}}` opens no group here: remove it. A separator stands once, above the first declaration of its group.',
      separatorFirst:
        'Put `// {{label}}` above the other comments of `{{name}}`: the separator is the first line of its group.',
      separatorSpacing:
        'Leave a blank line above `// {{label}}`: it is where one group ends and the next begins.',
    },
  },
  create(context) {
    const settings = settingsOf(context)
    /** @type {OpenFunction[]} the functions being visited, innermost last */
    const functions = []
    /** @param {import('../../utils/ast.js').FunctionNode} node - the function entered */
    const enter = (node) => {
      functions.push({ node, renders: node.body.type !== 'BlockStatement' && isRender(node.body) })
    }
    const exit = () => {
      const visited = functions.pop()
      if (visited === undefined) return
      for (const problem of functionProblems(visited, settings, context.sourceCode))
        context.report(problem)
    }
    return {
      FunctionDeclaration: enter,
      FunctionExpression: enter,
      ArrowFunctionExpression: enter,
      'FunctionDeclaration:exit': exit,
      'FunctionExpression:exit': exit,
      'ArrowFunctionExpression:exit': exit,
      ReturnStatement(node) {
        const current = functions.at(-1)
        if (current && isRender(node.argument)) current.renders = true
      },
    }
  },
}

export default rule
