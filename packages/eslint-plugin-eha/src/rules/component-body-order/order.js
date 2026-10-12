import { statementName, variablesReadBy } from '../../utils/ast.js'

import { GROUP_ORDER, labelOf } from './groups.js'

/**
 * A body, as the checks of the rule read it.
 * @typedef {object} Body
 * @property {string} owner - the name of the component or hook
 * @property {'component' | 'hook'} kind - what holds the body
 * @property {import('estree').Statement[]} statements - its statements, in order
 * @property {import('./groups.js').Entry[]} entries - what the rule knows of each statement
 * @property {import('eslint').Scope.Reference[]} references - every reference of the function, nested ones included
 * @property {import('eslint').SourceCode} sourceCode - the file
 */

/**
 * The rank of a group in the order.
 * @param {import('./groups.js').Group} group - the group
 * @returns {number} its position
 */
const rank = (group) => GROUP_ORDER.indexOf(group)

/**
 * The order, written out for a message: `Guards → Store → … → Render`.
 * @param {'component' | 'hook'} kind - what holds the body
 * @returns {string} the order
 */
const writtenOrder = (kind) => GROUP_ORDER.map((group) => labelOf(group, kind)).join(' → ')

/**
 * Finds, for every statement, the index of the last statement above it that declares something it reads.
 * @param {Body} body - the body
 * @returns {number[]} one index per statement, `-1` when it reads nothing declared above it
 */
const lastDependencies = (body) => {
  /** @type {Map<import('eslint').Scope.Variable, number>} */
  const declaredAt = new Map()
  return body.statements.map((statement, index) => {
    let last = -1
    for (const variable of variablesReadBy(statement, body.references)) {
      last = Math.max(last, declaredAt.get(variable) ?? -1)
    }
    for (const variable of body.sourceCode.getDeclaredVariables(statement))
      declaredAt.set(variable, index)
    return last
  })
}

/**
 * Finds the first statement above `index` that a later group holds and that the statement could move
 * above: below the last barrier, and below everything it reads.
 * @param {Body} body - the body
 * @param {number} index - the statement
 * @param {number} from - the first index it could move to
 * @returns {number | undefined} the index of that statement, or `undefined` when it is in place
 */
const firstLaterGroup = (body, index, from) => {
  const group = /** @type {import('./groups.js').Group} */ (body.entries[index]?.group)
  for (let other = from; other < index; other++) {
    const otherGroup = body.entries[other]?.group
    if (otherGroup !== undefined && rank(otherGroup) > rank(group)) return other
  }
  return undefined
}

/**
 * Finds every statement placed below a statement of a later group, and reports it once, against the first
 * statement it should come before.
 *
 * Two things stop a statement from moving, and the rule never asks for what they forbid. A statement the
 * order says nothing of — a loop, an `if` that does not return, a call — and an early return are barriers:
 * moving across them would change what runs. And a declaration never goes above what it reads, because
 * JavaScript cannot read a `const` before it exists.
 * @param {Body} body - the body
 * @returns {import('eslint').Rule.ReportDescriptor[]} one problem per statement out of order
 */
export const orderProblems = (body) => {
  const dependencies = lastDependencies(body)
  /** @type {import('eslint').Rule.ReportDescriptor[]} */
  const problems = []
  let barrier = -1
  body.statements.forEach((statement, index) => {
    const entry = body.entries[index]
    if (entry?.group === undefined || entry.earlyReturn) {
      barrier = index
      return
    }
    const other = firstLaterGroup(body, index, Math.max(barrier, dependencies[index] ?? -1) + 1)
    const otherStatement = other === undefined ? undefined : body.statements[other]
    const otherGroup = other === undefined ? undefined : body.entries[other]?.group
    if (otherStatement === undefined || otherGroup === undefined) return
    problems.push({
      node: statement,
      messageId: 'outOfOrder',
      data: {
        name: statementName(statement, body.sourceCode),
        other: statementName(otherStatement, body.sourceCode),
        label: labelOf(entry.group, body.kind),
        otherLabel: labelOf(otherGroup, body.kind),
        kind: body.kind,
        order: writtenOrder(body.kind),
      },
    })
  })
  return problems
}
