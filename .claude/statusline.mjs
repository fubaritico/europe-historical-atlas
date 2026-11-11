#!/usr/bin/env node
/**
 * The status line — where a session stands, at all times, under the prompt: its role, its tree, its branch.
 * Asked by the dev on 2026-11-11 (« on ne sait jamais où vous êtes »). Declared in `.claude/settings.json`.
 *
 * Input: Claude Code's status JSON on stdin — `agent.name` (the session's role, `--agent` or the `agent` setting),
 * `workspace.git_worktree` (absent in the main tree), `workspace.current_dir`. The branch is read from git.
 *
 * Run its tests: node --test '.claude/*.test.mjs' '.claude/hooks/*.test.mjs'
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/** The roles' names as the dev says them. */
export const ROLE_LABELS = { coder: 'codeur', historian: 'historien' }

/**
 * Builds the line from what Claude Code sends and the branch.
 * @param {{ agent?: { name?: string }, workspace?: { git_worktree?: string } }} status - The status JSON.
 * @param {string | null} branch - The checked-out branch, or null when git could not tell.
 * @returns {string} The line, e.g. `codeur · arbre coder · branche coder`.
 */
export const statusLine = (status, branch) => {
  const agent = status.agent?.name
  const role = agent ? (ROLE_LABELS[agent] ?? agent) : 'sans rôle'
  const tree = status.workspace?.git_worktree ?? 'main'
  return `${role} · arbre ${tree} · branche ${branch ?? 'inconnue'}`
}

/**
 * Reads the branch checked out in a folder.
 * @param {string | undefined} dir - The session's current folder.
 * @returns {string | null} The branch, or null when git could not tell (said on the line as « inconnue »).
 */
const branchIn = (dir) => {
  if (!dir) return null
  try {
    return execFileSync('git', ['-C', dir, 'rev-parse', '--abbrev-ref', 'HEAD'], {
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
  process.stdout.write(statusLine(status, branchIn(status.workspace?.current_dir ?? status.cwd)))
}
