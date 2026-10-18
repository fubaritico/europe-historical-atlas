/*
 * Where a file sits among the components — `src/components/<Name>/…` — read once for the rules that care:
 * `component-folder-layout` checks what sits where, `no-reach-into-component` what may be imported from
 * outside a component's folder.
 */

/** The folder the components live in, from the package's root — the rules' default. */
export const COMPONENTS_DIR = 'src/components'

/**
 * A file's place among the components.
 * @typedef {{ folder: string, inner: string[], file: string }} ComponentPath
 */

/**
 * Read a path as a place in a component's folder: the folder, the subfolders under it, the file.
 * @param {string} path - an absolute, `/`-separated path
 * @param {string} componentsDir - the components' folder, e.g. `src/components`
 * @returns {ComponentPath | null} the place, or `null` for a path outside every component's folder — a flat
 *   file at the components' root included, which no folder holds yet
 */
export const componentPathOf = (path, componentsDir) => {
  const marker = `/${componentsDir}/`
  const at = path.lastIndexOf(marker)
  if (at < 0) return null
  const parts = path.slice(at + marker.length).split('/')
  if (parts.length < 2) return null
  return { folder: parts[0] ?? '', inner: parts.slice(1, -1), file: parts.at(-1) ?? '' }
}

/**
 * The components' folder a rule was configured with, or the default.
 * @param {import('eslint').Rule.RuleContext} context - the rule's context
 * @returns {string} the folder
 */
export const componentsDirOf = (context) => {
  /** @type {unknown} ESLint types the options `any[]`; the schema has checked them */
  const raw = context.options[0]
  const options = /** @type {{ componentsDir?: string } | undefined} */ (raw)
  return options?.componentsDir ?? COMPONENTS_DIR
}
