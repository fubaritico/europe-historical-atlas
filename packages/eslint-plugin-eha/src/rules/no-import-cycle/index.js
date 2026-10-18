import { dirname, relative, sep } from 'node:path'

import { isFollowed, pathBack, resolveSpecifier } from './graph.js'

/**
 * No import cycle, **type-only imports included** — the dev's call, 2026-10-18: dependencies run parent →
 * child only. `import/no-cycle` skips `import type` on purpose (eslint-plugin-import 2.32.0,
 * `lib/rules/no-cycle.js`), and every one of the 13 cycles this repository had was closed by one.
 *
 * Each import of the linted file is followed transitively: `import` and `import type`, `export … from`,
 * `export * from`, `export * as … from`, `import x = require(…)`, `import('…')` with a literal, the type
 * `import('…').T`. A declaration is reported once when its target leads back to the file, with the shortest
 * way back.
 *
 * **What is not followed**, and why:
 * - a package specifier — `core` imports no application, so no cycle crosses a package;
 * - a specifier with a query (`?raw`, `?url`, `?worker`) — an asset, a text, or a worker's separate realm;
 * - a specifier that names no source file (`.css`, `.svg`, or a file that does not exist) — the type checker
 *   reports a missing module; this rule judges only cycles, and an edge to nothing closes none.
 *
 * Specifiers resolve as the repository writes them: as named when they carry `.ts`, `.tsx`, `.js` or `.mjs`,
 * else with each of those tried, else the folder's `index.ts`, `index.tsx`, `index.js`. The linted file is
 * read from the linter's text, the others from disk, cached until their modification time changes.
 */

/**
 * A path as the message shows it: relative to the linted file's folder, `/`-separated.
 * @param {string} from - the linted file's folder
 * @param {string} file - the file, absolute
 * @returns {string} the path
 */
const shown = (from, file) => relative(from, file).split(sep).join('/')

/**
 * The specifier a module-naming node carries, when it is a string literal.
 * @param {unknown} source - the node's `source` (or a TS import type's literal)
 * @returns {string | null} the specifier, or `null`
 */
const literalOf = (source) => {
  const node = /** @type {{ type?: unknown, value?: unknown } | null | undefined} */ (source)
  return node?.type === 'Literal' && typeof node.value === 'string' ? node.value : null
}

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Forbid import cycles between modules, type-only imports included',
    },
    schema: [],
    messages: {
      cycle: "Import cycle: {{cycle}}. The child declares its type and the parent's extends it.",
    },
  },
  create: (context) => {
    const file = context.filename
    const folder = dirname(file)
    /** @type {Set<string>} files known, for this lint of this file, not to lead back to it */
    const dead = new Set()
    /**
     * Report a declaration whose target leads back to the linted file.
     * @param {import('estree').Node} node - the declaration
     * @param {string | null} specifier - what it names
     */
    const check = (node, specifier) => {
      if (specifier === null || !isFollowed(specifier)) return
      const target = resolveSpecifier(file, specifier)
      if (target === null) return
      const back = pathBack(target, file, dead)
      if (back === null) return
      const cycle = [file, ...back].map((step) => shown(folder, step)).join(' → ')
      context.report({ node, messageId: 'cycle', data: { cycle } })
    }
    /**
     * A handler for the nodes that name their module in `source`.
     * @param {import('estree').Node & { source?: unknown }} node - the node
     */
    const fromSource = (node) => {
      check(node, literalOf(node.source))
    }
    return {
      ImportDeclaration: fromSource,
      ExportNamedDeclaration: fromSource,
      ExportAllDeclaration: fromSource,
      ImportExpression: fromSource,
      /**
       * `import x = require('./x')`, TypeScript's parser only.
       * @param {import('estree').Node & { moduleReference?: { type?: unknown, expression?: unknown } }} node -
       *   the declaration
       */
      TSImportEqualsDeclaration: (node) => {
        const reference = node.moduleReference
        if (reference?.type === 'TSExternalModuleReference')
          check(node, literalOf(reference.expression))
      },
      /**
       * The type `import('./x').T`, TypeScript's parser only: its literal is `source` since
       * typescript-eslint 8, `argument.literal` before.
       * @param {import('estree').Node & { source?: unknown, argument?: { literal?: unknown } }} node - the type
       */
      TSImportType: (node) => {
        check(node, literalOf(node.source) ?? literalOf(node.argument?.literal))
      },
    }
  },
}

export default rule
