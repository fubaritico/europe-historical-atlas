import { posix } from 'node:path'

import { componentPathOf, componentsDirOf } from '../../utils/componentPath.js'

/**
 * A component's folder is private behind its barrel — the dev's call, 2026-10-18: what sits in
 * `<Name>/hooks/` or `<Name>/internal/` is used by that component only, so from outside the folder only
 * `<Name>` itself, its `index`, may be imported. Inside the folder, its files reach one another freely.
 * That covers its `utils/` and `i18n/` as much as its `hooks/` and `internal/`.
 *
 * **What several components use sits beside `components/`** (`src/hooks/`, `src/utils/`, `src/i18n/` — the
 * dev's call, 2026-10-22), so no folder in `components/` is open to all: the `shared/` exception of 2026-10-18
 * is gone with the folder.
 */

/**
 * The module a relative import names, as an absolute path — `null` for a package import.
 * @param {string} importer - the importing file, absolute
 * @param {string} source - what it imports
 * @returns {string | null} the path, or `null`
 */
const resolved = (importer, source) =>
  source.startsWith('.') ? posix.normalize(posix.join(posix.dirname(importer), source)) : null

/**
 * Whether an import reaches inside a component's folder it is not in — anything but the folder itself, or
 * its `index`.
 * @param {string} importer - the importing file, absolute
 * @param {string} source - what it imports
 * @param {string} componentsDir - the components' folder
 * @returns {string | null} the folder reached into, or `null` when the import is allowed
 */
const reachedInto = (importer, source, componentsDir) => {
  const target = resolved(importer, source)
  const into = target === null ? null : componentPathOf(target, componentsDir)
  if (into === null || /^index(\.tsx?)?$/.test(into.file)) return null
  return componentPathOf(importer, componentsDir)?.folder === into.folder ? null : into.folder
}

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Import a component from its folder’s barrel, never from inside the folder',
    },
    schema: [
      {
        type: 'object',
        properties: { componentsDir: { type: 'string' } },
        additionalProperties: false,
      },
    ],
    messages: {
      reaching:
        '`{{source}}` reaches inside `{{folder}}`.\n' +
        'Import what `{{folder}}` shares from `{{folder}}` itself — its `index` — the rest is its own.',
    },
  },
  create: (context) => {
    const componentsDir = componentsDirOf(context)
    /**
     * Report an import, or a re-export, that reaches inside another component's folder.
     * @param {import('estree').Node} node - the declaration
     * @param {import('estree').Literal | null | undefined} source - what it names
     */
    const check = (node, source) => {
      if (typeof source?.value !== 'string') return
      const folder = reachedInto(context.filename, source.value, componentsDir)
      if (folder !== null)
        context.report({ node, messageId: 'reaching', data: { source: source.value, folder } })
    }
    return {
      ImportDeclaration: (node) => {
        check(node, node.source)
      },
      ExportNamedDeclaration: (node) => {
        check(node, node.source)
      },
      ExportAllDeclaration: (node) => {
        check(node, node.source)
      },
      // A lazy import reaches inside as surely as a static one; a computed path cannot be read, and passes.
      ImportExpression: (node) => {
        check(node, /** @type {import('estree').Literal} */ (node.source))
      },
      /**
       * The type `import('./x').T` — its specifier in `source`, or in `argument.literal` for an older parser.
       * @param {import('estree').Node & { source?: import('estree').Literal, argument?: { literal?: import('estree').Literal } }} node -
       *   the type node
       */
      TSImportType: (node) => {
        check(node, node.source ?? node.argument?.literal)
      },
    }
  },
}

export default rule
