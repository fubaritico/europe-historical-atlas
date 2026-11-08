import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

import { yearFolder } from './args.mjs'

/**
 * What the commands take from the machine — files, the CMS base, git, the process — and nothing else, so every
 * measure stays pure. Every failure throws with what was looked for: a measure run on the wrong file is worse than no
 * measure.
 */

/**
 * The checkout the scripts run in, a worktree included. **Tied to this file's depth** under the checkout
 * (`.claude/skills/use-cartographer/scripts/lib/`): moving the file changes it.
 */
export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..')

/** The rivers the Cartographer follows, relative to a checkout. */
export const RIVERS_FILE = 'packages/atlas/public/rivers/europe-rivers.json'

/** The CMS's base, relative to a checkout. */
export const CMS_DB = 'packages/cms/cms.db'

/**
 * Read and parse a JSON file.
 * @param {string} path - the file
 * @returns {unknown} its content
 */
export function readJson(path) {
  if (!existsSync(path)) throw new Error(`no such file: ${path}`)
  return JSON.parse(readFileSync(path, 'utf8'))
}

/**
 * Where the CMS base is: in this checkout, or — from a worktree, which has none — in the main checkout git names.
 * @param {string} root - the checkout
 * @returns {string} the base's path
 */
export function findCmsDb(root) {
  const here = join(root, CMS_DB)
  if (existsSync(here)) return here
  let common
  try {
    common = execFileSync(
      'git',
      ['-C', root, 'rev-parse', '--path-format=absolute', '--git-common-dir'],
      { encoding: 'utf8' }
    ).trim()
  } catch (cause) {
    throw new Error(`no CMS base at ${here}, and git could not name the main checkout`, { cause })
  }
  const main = join(dirname(common), CMS_DB)
  if (existsSync(main)) return main
  throw new Error(`no CMS base at ${here} nor at ${main}`)
}

/**
 * Open the CMS base read-only — a script never writes the dev's base.
 * @param {string} path - the SQLite file
 * @returns {DatabaseSync} the connection
 */
export function openReadOnly(path) {
  return new DatabaseSync(path, { readOnly: true })
}

/**
 * Parse the command line with the options every command shares — `--map`, `--box`, `--help` — plus its own; print the
 * usage and leave on `--help`.
 * @param {Record<string, { type: 'string' | 'boolean', short?: string }>} own - the command's options
 * @param {string} usage - the usage, printed on `--help` and on a missing required option
 * @param {readonly string[]} required - the options that must be given, `map` among them for a map command
 * @returns {{ values: Record<string, string | boolean | undefined>, positionals: string[] }} the parsed line
 */
export function commandLine(own, usage, required = ['map']) {
  const parsed = parseArgs({
    allowPositionals: true,
    options: {
      map: { type: 'string' },
      box: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
      ...own,
    },
  })
  if (parsed.values.help) {
    print([usage])
    process.exit(0)
  }
  const missing = required.filter((name) => parsed.values[name] === undefined)
  if (missing.length > 0) throw new Error(`--${missing.join(', --')} required\n${usage}`)
  return parsed
}

/**
 * The year folder of a command line, in this checkout.
 * @param {string} map - the `--map` or `--against` value
 * @returns {string} the folder's path
 */
export function folderOf(map) {
  return yearFolder(map, REPO_ROOT)
}

/**
 * Write lines to the standard output — the measures are read by the agent, so they go out plain.
 * @param {readonly string[]} lines - the lines
 * @returns {void}
 */
export function print(lines) {
  process.stdout.write(lines.length === 0 ? '(nothing)\n' : `${lines.join('\n')}\n`)
}
