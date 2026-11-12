#!/usr/bin/env node
/**
 * The status line — where a session stands, at all times, under the prompt: its role, its tree, its branch, and how
 * full its context window is (`context_window.used_percentage`, coloured at the dev's alarms).
 * Asked by the dev on 2026-11-11 (« on ne sait jamais où vous êtes »). Declared in `.claude/settings.json`.
 *
 * Input: Claude Code's status JSON on stdin — `session_id`, `agent.name` (`--agent` or the `agent` setting),
 * `workspace.git_worktree` (absent in the main tree), `workspace.current_dir`, `workspace.project_dir` (where the
 * session was launched, so where the hooks note its role). The role is the session's note
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
 * The context window's alarms, highest first — the dev, 2026-11-12: 60 % because practitioners report the answers
 * slipping from there (a heuristic, no Anthropic figure); 95 % leaves the last five to close the session and reopen it.
 * Each is an ANSI colour and, from the last, a word.
 */
export const CONTEXT_ALARMS = [
  { from: 95, colour: '\u001b[1;31m', say: ' — ferme la session' },
  { from: 85, colour: '\u001b[31m', say: '' },
  { from: 75, colour: '\u001b[38;5;208m', say: '' },
  { from: 60, colour: '\u001b[33m', say: '' },
]

/** Ends an ANSI colour. */
const RESET = '\u001b[0m'

/**
 * Says how full the context window is, coloured from the first alarm.
 * @param {unknown} used - `context_window.used_percentage`, absent before the session's first answer.
 * @returns {string} E.g. ` · contexte 78 %`, or nothing when Claude Code sent no percentage.
 */
export const contextPart = (used) => {
  if (typeof used !== 'number' || !Number.isFinite(used)) return ''
  const pct = Math.round(used)
  const alarm = CONTEXT_ALARMS.find(({ from }) => pct >= from)
  const text = `contexte ${pct} %${alarm?.say ?? ''}`
  return ` · ${alarm ? `${alarm.colour}${text}${RESET}` : text}`
}

/**
 * Builds the line from what Claude Code sends, the session's role note and the branch.
 * @param {{ agent?: { name?: string }, workspace?: { git_worktree?: string }, context_window?: { used_percentage?: number } }} status - The status JSON.
 * @param {string | null} branch - The checked-out branch, or null when git could not tell.
 * @param {string | null} [noted] - The session's role note.
 * @returns {string} The line, e.g. `codeur · arbre coder · branche coder · contexte 34 %`.
 */
export const statusLine = (status, branch, noted = null) => {
  const role = noted ?? status.agent?.name
  const label = role ? (ROLE_LABELS[role] ?? role) : 'sans rôle'
  const tree = status.workspace?.git_worktree ?? 'main'
  return `${label} · arbre ${tree} · branche ${branch ?? 'inconnue'}${contextPart(status.context_window?.used_percentage)}`
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
  // The note lives where the hooks write it: the folder the session was launched in (`CLAUDE_PROJECT_DIR` for them,
  // `workspace.project_dir` here), which the current folder may have left.
  const root = status.workspace?.project_dir ?? revParse(dir, ['--show-toplevel'])
  process.stdout.write(statusLine(status, revParse(dir, ['--abbrev-ref', 'HEAD']), root ? readRole(root, status.session_id) : null))
}
