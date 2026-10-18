import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, extname, join } from 'node:path'

import ts from 'typescript'

/*
 * The module graph `no-import-cycle` walks: which files a file imports, read from disk, resolved and cached.
 *
 * A file's imports are read from TypeScript's own syntax tree rather than `ts.preProcessFile`: measured on
 * TypeScript 5.7.3, `preProcessFile` records `import type`, `export … from`, `export type … from`,
 * `export * from` and `import('…')`, but **not** `export * as ns from '…'` — its scanner expects `from` right
 * after the `*` (`tryConsumeExport`). The tree has no such gap, and like `preProcessFile` it is blind to
 * comments and strings.
 */

/** The extensions a specifier may name, and those tried in order when it names none. */
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.mjs']

/** The barrels tried, in order, when a specifier names a folder. */
const INDEX_FILES = ['index.ts', 'index.tsx', 'index.js']

/**
 * A file's imports as last read: the files they resolved to, the relative specifiers that resolved to none
 * — retried at each read, since the missing file may be written since — and the version they were read at.
 * @typedef {{ mtimeMs: number, targets: string[], unresolved: string[] }} Edges
 */

/**
 * Each file's imports, by absolute path — kept across the files of one lint run and across runs in an
 * editor; a file whose modification time changed is read again.
 * @type {Map<string, Edges>}
 */
const cache = new Map()

/**
 * Whether a specifier is followed: a relative one, without a query. A package is never followed — `core`
 * imports no application, so no cycle crosses a package — and a query (`?raw`, `?url`, `?worker`) asks the
 * bundler for an asset, a text or a worker's separate realm, never a module evaluated with the importer.
 * @param {string} specifier - what an import names
 * @returns {boolean} whether it is followed
 */
export const isFollowed = (specifier) =>
  (specifier === '.' ||
    specifier === '..' ||
    specifier.startsWith('./') ||
    specifier.startsWith('../')) &&
  !specifier.includes('?')

/**
 * The source file a relative specifier names — as written when it has a source extension, else with each
 * extension tried, else the folder's barrel.
 * @param {string} importer - the importing file, absolute
 * @param {string} specifier - a relative specifier, without a query
 * @returns {string | null} the file, absolute, or `null` when none exists or it is no source (a `.css`, a
 *   `.svg`): the import is left to the type checker, this rule judges only cycles
 */
export const resolveSpecifier = (importer, specifier) => {
  const base = join(dirname(importer), specifier)
  const candidates = SOURCE_EXTENSIONS.includes(extname(base))
    ? [base]
    : [
        ...SOURCE_EXTENSIONS.map((extension) => base + extension),
        ...INDEX_FILES.map((index) => join(base, index)),
      ]
  return (
    candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile()) ?? null
  )
}

/**
 * How TypeScript should parse a file, from its extension — a cast `<T>x` and JSX read differently.
 * @param {string} file - the file
 * @returns {ts.ScriptKind} the kind
 */
const scriptKindOf = (file) => {
  const extension = extname(file)
  if (extension === '.tsx') return ts.ScriptKind.TSX
  if (extension === '.ts') return ts.ScriptKind.TS
  return ts.ScriptKind.JS
}

/**
 * The literal text of a string node, when it is one.
 * @param {ts.Node | undefined} node - the node
 * @returns {string | null} the text, or `null`
 */
const stringOf = (node) => (node !== undefined && ts.isStringLiteral(node) ? node.text : null)

/**
 * The specifier a node names: an import or export declaration's, a `require` reference's, an `import()`
 * call's, an import type's.
 * @param {ts.Node} node - the node
 * @returns {string | null} the specifier, or `null` for a node that names none
 */
const specifierOf = (node) => {
  if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node))
    return stringOf(node.moduleSpecifier)
  if (ts.isExternalModuleReference(node)) return stringOf(node.expression)
  if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword)
    return stringOf(node.arguments[0])
  if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument))
    return stringOf(node.argument.literal)
  return null
}

/**
 * Every module specifier a source text names: `import` (type-only included), `export … from` (`export *`
 * and `export * as` included), `import x = require('…')`, `import('…')` with a literal, and the type
 * `import('…').T`.
 * @param {string} file - the file's name, for its parsing mode
 * @param {string} text - its text
 * @returns {string[]} the specifiers, in order of appearance
 */
export const specifiersOf = (file, text) => {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, false, scriptKindOf(file))
  /** @type {string[]} */
  const found = []
  /**
   * Collect the specifier a node names, then those of its children.
   * @param {ts.Node} node - the node
   */
  const visit = (node) => {
    const specifier = specifierOf(node)
    if (specifier !== null) found.push(specifier)
    ts.forEachChild(node, visit)
  }
  visit(source)
  return found
}

/**
 * Resolve specifiers, keeping apart those that name no file.
 * @param {string} importer - the importing file
 * @param {string[]} specifiers - its relative specifiers
 * @returns {{ targets: string[], unresolved: string[] }} the files, without duplicates, and the rest
 */
const resolveAll = (importer, specifiers) => {
  /** @type {Set<string>} */
  const targets = new Set()
  /** @type {string[]} */
  const unresolved = []
  for (const specifier of specifiers) {
    const target = resolveSpecifier(importer, specifier)
    if (target === null) unresolved.push(specifier)
    else targets.add(target)
  }
  return { targets: [...targets], unresolved }
}

/**
 * The files a file imports, followed specifiers only, read from disk — from the cache while the file is
 * unchanged. A file that exists but cannot be read throws: the lint fails loudly rather than walking a graph
 * with a hole in it.
 * @param {string} file - the file, absolute and existing
 * @returns {string[]} the files it imports, absolute, without duplicates
 */
export const importsOf = (file) => {
  const { mtimeMs } = statSync(file)
  const cached = cache.get(file)
  if (cached?.mtimeMs === mtimeMs) {
    if (cached.unresolved.length === 0) return cached.targets
    return [...new Set([...cached.targets, ...resolveAll(file, cached.unresolved).targets])]
  }
  const specifiers = specifiersOf(file, readFileSync(file, 'utf8')).filter(isFollowed)
  const edges = { mtimeMs, ...resolveAll(file, specifiers) }
  cache.set(file, edges)
  return edges.targets
}

/**
 * The files from a walk's start to one it reached.
 * @param {Map<string, string | null>} cameFrom - each file reached, and the file it was reached from
 * @param {string} file - the file reached
 * @returns {string[]} the files, from the start to `file`
 */
const trail = (cameFrom, file) => {
  /** @type {string[]} */
  const files = []
  for (let at = /** @type {string | null | undefined} */ (file); at; at = cameFrom.get(at))
    files.unshift(at)
  return files
}

/**
 * The shortest way from a file back to another, breadth first, each file expanded once.
 * @param {string} start - where the walk starts: what the linted file imports
 * @param {string} goal - the linted file — reached, never expanded from disk, whose text may be unsaved
 * @param {Set<string>} dead - files known not to lead to `goal`, skipped; a walk that fails adds every file
 *   it expanded
 * @returns {string[] | null} the files from `start` to `goal`, both included, or `null`
 */
export const pathBack = (start, goal, dead) => {
  if (start === goal) return [goal]
  if (dead.has(start)) return null
  /** @type {Map<string, string | null>} each file reached, and the file it was reached from */
  const cameFrom = new Map([[start, null]])
  /** @type {string[]} */
  const queue = [start]
  // `for…of` over an array reads the entries pushed while it runs: the queue grows as the walk goes.
  for (const file of queue) {
    for (const next of importsOf(file)) {
      if (next === goal) return [...trail(cameFrom, file), goal]
      if (!cameFrom.has(next) && !dead.has(next)) {
        cameFrom.set(next, file)
        queue.push(next)
      }
    }
  }
  queue.forEach((file) => dead.add(file))
  return null
}
