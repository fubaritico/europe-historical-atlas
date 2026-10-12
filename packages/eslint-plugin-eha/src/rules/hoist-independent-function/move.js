import { parentOf, wholeLines } from '../../utils/ast.js'

/**
 * The first node of a statement as a reader sees it: the comments attached above it — on their own lines,
 * with no blank line between them and the statement — or the statement. A comment set apart by a blank line
 * (a section header, a pragma) belongs to what is around, and stays.
 * @param {import('estree').Node} statement - the statement
 * @param {import('eslint').SourceCode} sourceCode - the file
 * @returns {import('estree').Node | import('estree').Comment} the comment or statement it starts with
 */
const firstLineOf = (statement, sourceCode) => {
  const before = sourceCode.getTokenBefore(statement, { includeComments: false })
  const afterLine = before?.loc.end.line ?? 0
  const comments = sourceCode
    .getCommentsBefore(statement)
    .filter((comment) => (comment.loc?.start.line ?? 0) > afterLine)
  /** @type {import('estree').Node | import('estree').Comment} */
  let first = statement
  for (const comment of comments.reverse()) {
    const touches = (comment.loc?.end.line ?? 0) + 1 >= (first.loc?.start.line ?? 0)
    if (!touches) break
    first = comment
  }
  return first
}

/**
 * The statement at the top of the module that holds a node.
 * @param {import('estree').Node} node - the node
 * @returns {import('estree').Node} its module-level ancestor
 */
const moduleStatementOf = (node) => {
  let current = node
  for (
    let parent = parentOf(current);
    parent !== null && parent.type !== 'Program';
    parent = parentOf(current)
  ) {
    current = parent
  }
  return current
}

/**
 * The lines of a statement that begin inside a string or template spanning several lines: their leading
 * spaces are content, not indentation, and a dedent must leave them as they are.
 * @param {import('estree').Node} statement - the statement
 * @param {import('eslint').SourceCode} sourceCode - the file
 * @returns {Set<number>} their line numbers
 */
const linesInsideLiterals = (statement, sourceCode) => {
  /** @type {Set<number>} */
  const lines = new Set()
  for (const token of sourceCode.getTokens(statement)) {
    if (token.type !== 'Template' && token.type !== 'String') continue
    for (let line = token.loc.start.line + 1; line <= token.loc.end.line; line++) lines.add(line)
  }
  return lines
}

/**
 * Removes an indentation from every line of a text but those whose spaces are content: the lines keep
 * their place relative to the first.
 * @param {string} text - the text, its first line already without indentation
 * @param {number} firstLine - the line number the text starts on
 * @param {number} column - the indentation to remove
 * @param {Set<number>} kept - the line numbers to leave untouched
 * @returns {string} the text, dedented
 */
const dedent = (text, firstLine, column, kept) =>
  text
    .split('\n')
    .map((line, index) =>
      index === 0 || kept.has(firstLine + index)
        ? line
        : line.replace(new RegExp(`^ {0,${String(column)}}`), '')
    )
    .join('\n')

/**
 * Tells whether a node stands alone on its lines: nothing but indentation before it, nothing after it.
 * A fix that moves whole lines would otherwise carry its neighbours along.
 * @param {import('estree').Node | import('estree').Comment} node - the node
 * @param {import('eslint').SourceCode} sourceCode - the file
 * @returns {boolean} `true` when its lines hold nothing else
 */
const aloneOnItsLines = (node, sourceCode) => {
  // ESLint locates every node and comment it hands a rule.
  const { start, end } = /** @type {import('estree').SourceLocation} */ (node.loc)
  const before = (sourceCode.lines[start.line - 1] ?? '').slice(0, start.column)
  const after = (sourceCode.lines[end.line - 1] ?? '').slice(end.column)
  return before.trim() === '' && after.trim() === ''
}

/**
 * Writes the fix that moves a function to the module: the statement and its attached comments leave the
 * body, and land dedented above the module-level statement that held them, with its own comments. Nothing
 * it reads is lost — the rule only reports a function that reads nothing of where it was — and the text of
 * a string or template inside it is kept byte for byte.
 * @param {import('estree').Statement} statement - the statement declaring the function
 * @param {import('eslint').SourceCode} sourceCode - the file
 * @returns {import('eslint').Rule.ReportFixer | null} the fix, or `null` when the code shares its lines
 */
export const moveToModule = (statement, sourceCode) => {
  const top = firstLineOf(statement, sourceCode)
  const target = firstLineOf(moduleStatementOf(statement), sourceCode)
  if (![top, statement, target].every((node) => aloneOnItsLines(node, sourceCode))) return null
  const [start] = /** @type {[number, number]} */ (top.range)
  const [, end] = /** @type {[number, number]} */ (statement.range)
  const { line, column } = /** @type {import('estree').SourceLocation} */ (top.loc).start
  const kept = linesInsideLiterals(statement, sourceCode)
  const moved = dedent(sourceCode.text.slice(start, end), line, column, kept)
  const [removeFrom] = wholeLines(top, sourceCode.text, false)
  const [, removeTo] = wholeLines(statement, sourceCode.text, true)
  const [insertAt] = wholeLines(target, sourceCode.text, false)
  return (fixer) => [
    fixer.insertTextBeforeRange([insertAt, insertAt], `${moved}\n\n`),
    fixer.removeRange([removeFrom, removeTo]),
  ]
}
