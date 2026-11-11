#!/usr/bin/env node
/**
 * The status line — where a session stands, at all times, under the prompt: its role, its tree, its branch.
 * Asked by the dev on 2026-11-11 (« on ne sait jamais où vous êtes »). Declared in `.claude/settings.json`.
 *
 * Input: Claude Code's status JSON on stdin — `agent.name` (`--agent` or the `agent` setting),
 * `workspace.git_worktree` (absent in the main tree), `workspace.current_dir`. The role is the tree's note
 * (`hooks/role-state.mjs`, set by a sentence or at startup), else the agent; the branch and the tree's root come from
 * git.
 *
 * Run its tests: node --test '.claude/*.test.mjs' '.claude/hooks/*.test.mjs'
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { ROLE_LABELS, readRole } from './hooks/role-state.mjs'

/**
 * Builds the line from what Claude Code sends, the tree's role note and the branch.
 * @param {{ agent?: { name?: string }, workspace?: { git_worktree?: string } }} status - The status JSON.
 * @param {string | null} branch - The checked-out branch, or null when git could not tell.
 * @param {string | null} [noted] - The tree's role note.
 * @returns {string} The line, e.g. `codeur · arbre coder · branche coder`.
 */
export const statusLine = (status, branch, noted = null) => {
  const role = noted ?? status.agent?.name
  const label = role ? (ROLE_LABELS[role] ?? role) : 'sans rôle'
  const tree = status.workspace?.git_worktree ?? 'main'
  return `${label} · arbre ${tree} · branche ${branch ?? 'inconnue'}`
}

/**
 * Asks git one thing about a folder.
 * @param {string | undefined} dir - The session's current folder.
 * @param {string[]} args - The `rev-parse` arguments.
 * @returns {string | null} The answer, or null when git could not tell (said on the line as « inconnue »).
 */
const revParse = (dir, args) => {
  if (!dir) return null
  try {
    return execFileSync('git', ['-C', dir, 'rev-parse', ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return null
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let status
  try {
    status = JSON.parse(readFileSync(0, 'utf8'))
  } catch (error) {
    process.stdout.write(`ligne d'état illisible (${error instanceof Error ? error.message : String(error)})`)
    process.exit(0)
  }
  const dir = status.workspace?.current_dir ?? status.cwd
  const root = revParse(dir, ['--show-toplevel'])
  process.stdout.write(statusLine(status, revParse(dir, ['--abbrev-ref', 'HEAD']), root ? readRole(root) : null))
}
