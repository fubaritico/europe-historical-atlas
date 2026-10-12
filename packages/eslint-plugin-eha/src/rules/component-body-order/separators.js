import { statementName, wholeLines } from '../../utils/ast.js'

import { SEPARATOR_LABELS, labelOf } from './groups.js'

/**
 * The comments on their own lines above a statement, and the separators among them.
 * @typedef {object} Leading
 * @property {import('estree').Comment[]} comments - every own-line comment above the statement
 * @property {import('estree').Comment[]} separators - those that hold a separator label
 */

/**
 * Lists the comments that stand on their own lines above a statement — not one ending the line before.
 * @param {import('estree').Statement} statement - the statement
 * @param {import('eslint').SourceCode} sourceCode - the file
 * @returns {Leading} its comments, and the separators among them
 */
const leadingOf = (statement, sourceCode) => {
  const before = sourceCode.getTokenBefore(statement, { includeComments: false })
  const afterLine = before?.loc.end.line ?? 0
  const comments = sourceCode
    .getCommentsBefore(statement)
    .filter((comment) => (comment.loc?.start.line ?? 0) > afterLine)
  const separators = comments.filter(
    (comment) => comment.type === 'Line' && SEPARATOR_LABELS.has(comment.value.trim())
  )
  return { comments, separators }
}

/**
 * The start of the line a node begins on — a separator is written, and removed, as a whole line.
 * @param {import('estree').Node | import('estree').Comment} node - the node, alone on its line but for its indentation
 * @returns {number} the offset of the line's first character
 */
const lineStart = (node) => {
  const [start] = /** @type {[number, number]} */ (node.range)
  return start - (node.loc?.start.column ?? 0)
}

/**
 * Tells whether the line above a node is blank.
 * @param {import('estree').Node | import('estree').Comment} node - the node
 * @param {import('eslint').SourceCode} sourceCode - the file
 * @returns {boolean} `true` when the line above is empty
 */
const blankAbove = (node, sourceCode) => {
  const line = node.loc?.start.line ?? 1
  return line > 1 && (sourceCode.lines[line - 2] ?? '').trim() === ''
}

/**
 * A change to the text: insert at a range's start, or replace the range.
 * @typedef {object} Edit
 * @property {[number, number]} range - where
 * @property {string} text - what goes there
 */

/**
 * The edit that puts a separator above a statement and its comments, with a blank line above it when it
 * is not the first line of the body.
 * @param {import('estree').Statement} statement - the first statement of the group
 * @param {Leading} leading - its comments
 * @param {string} label - the separator's text
 * @param {boolean} first - whether it is the first statement of the body
 * @param {import('eslint').SourceCode} sourceCode - the file
 * @returns {Edit} the edit
 */
const separatorInsertion = (statement, leading, label, first, sourceCode) => {
  const top = leading.comments.find((comment) => !leading.separators.includes(comment)) ?? statement
  const indent = ' '.repeat(top.loc?.start.column ?? 0)
  const blank = first || blankAbove(top, sourceCode) ? '' : '\n'
  return { range: [lineStart(top), lineStart(top)], text: `${blank}${indent}// ${label}\n` }
}

/**
 * The edit that removes a separator line, its line break included.
 * @param {import('estree').Comment} comment - the separator
 * @param {string} text - the file's text
 * @returns {Edit} the edit
 */
const separatorRemoval = (comment, text) => ({ range: wholeLines(comment, text, false), text: '' })

/**
 * Turns edits into the fix ESLint applies.
 * @param {Edit[]} edits - the edits, which never overlap
 * @returns {import('eslint').Rule.ReportFixer} the fix
 */
const fixWith = (edits) => (fixer) =>
  edits.map(({ range, text }) => fixer.replaceTextRange(range, text))

/**
 * Checks the separator above the first statement of a group: present, right, first, and below a blank line.
 * @param {import('estree').Statement} statement - the statement
 * @param {string} label - the separator it needs
 * @param {boolean} first - whether it is the first statement of the body
 * @param {import('eslint').SourceCode} sourceCode - the file
 * @returns {import('eslint').Rule.ReportDescriptor | undefined} the problem, or `undefined`
 */
const groupStartProblem = (statement, label, first, sourceCode) => {
  const leading = leadingOf(statement, sourceCode)
  const name = statementName(statement, sourceCode)
  const [separator] = leading.separators
  const insertion = separatorInsertion(statement, leading, label, first, sourceCode)
  if (separator === undefined) {
    return {
      node: statement,
      messageId: 'missingSeparator',
      data: { label, name },
      fix: fixWith([insertion]),
    }
  }
  const loc = separatorLoc(separator)
  const found = separator.value.trim()
  if (found !== label) {
    const fix = fixWith([
      { range: /** @type {[number, number]} */ (separator.range), text: `// ${label}` },
    ])
    return { loc, messageId: 'wrongSeparator', data: { found, label }, fix }
  }
  if (separator !== leading.comments[0]) {
    const fix = fixWith([separatorRemoval(separator, sourceCode.text), insertion])
    return { loc, messageId: 'separatorFirst', data: { label, name }, fix }
  }
  if (!first && !blankAbove(separator, sourceCode)) {
    const fix = fixWith([{ range: [lineStart(separator), lineStart(separator)], text: '\n' }])
    return { loc, messageId: 'separatorSpacing', data: { label }, fix }
  }
  return undefined
}

/**
 * Where a separator stands, for a report.
 * @param {import('estree').Comment} comment - the separator
 * @returns {import('estree').SourceLocation} its location
 */
const separatorLoc = (comment) => /** @type {import('estree').SourceLocation} */ (comment.loc)

/**
 * Reports a separator that opens no group where it stands.
 * @param {import('estree').Comment} comment - the separator
 * @param {string} text - the file's text
 * @returns {import('eslint').Rule.ReportDescriptor} the problem
 */
const misplaced = (comment, text) => ({
  loc: separatorLoc(comment),
  messageId: 'misplacedSeparator',
  data: { found: comment.value.trim() },
  fix: fixWith([separatorRemoval(comment, text)]),
})

/**
 * Checks the separator comments of a body: every group opens with its own, once, above any other comment of
 * its first statement and below a blank line; a separator anywhere else is removed. A statement the order
 * says nothing of continues the group above it.
 * @param {import('./order.js').Body} body - the body
 * @returns {import('eslint').Rule.ReportDescriptor[]} the problems found
 */
export const separatorProblems = (body) => {
  /** @type {import('eslint').Rule.ReportDescriptor[]} */
  const problems = []
  /** @type {string | undefined} */
  let current
  body.statements.forEach((statement, index) => {
    const entry = body.entries[index]
    // A hook the rule cannot place is reported once, as such; its separator waits until it has a group.
    if (entry?.unknownHook !== undefined) return
    const group = entry?.group
    const label = group === undefined ? undefined : labelOf(group, body.kind)
    const { separators } = leadingOf(statement, body.sourceCode)
    const opens = label !== undefined && label !== current
    if (opens) {
      const problem = groupStartProblem(statement, label, index === 0, body.sourceCode)
      if (problem !== undefined) problems.push(problem)
      current = label
    }
    problems.push(
      ...separators.slice(opens ? 1 : 0).map((comment) => misplaced(comment, body.sourceCode.text))
    )
  })
  return problems
}
