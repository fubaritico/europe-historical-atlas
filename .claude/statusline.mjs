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
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
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
 * Says how much of the plan's weekly limit is used — `rate_limits.seven_day.used_percentage`, sent only to claude.ai
 * subscribers and after the session's first answer (code.claude.com/docs/en/statusline). The dev, 2026-11-25: the
 * historian's agent teams spend the week, and the session must see it.
 * @param {unknown} used - The weekly percentage, absent before the first answer.
 * @returns {string} E.g. ` · semaine 41 %`, or nothing when Claude Code sent no percentage.
 */
export const weekPart = (used) =>
  typeof used === 'number' && Number.isFinite(used) ? ` · semaine ${Math.round(used)} %` : ''

/**
 * The usage to keep from one status JSON — the 5-hour and 7-day windows of the plan's limits.
 * @param {{ rate_limits?: { five_hour?: { used_percentage?: number, resets_at?: number }, seven_day?: { used_percentage?: number, resets_at?: number } } }} status - The status JSON.
 * @param {string} at - The moment, ISO 8601.
 * @returns {{ at: string, fiveHour: number | null, sevenDay: number | null, sevenDayResetsAt: number | null } | null} The record, or null when Claude Code sent no limits.
 */
export const usageRecord = (status, at) => {
  const five = status.rate_limits?.five_hour?.used_percentage
  const seven = status.rate_limits?.seven_day?.used_percentage
  if (typeof five !== 'number' && typeof seven !== 'number') return null
  return {
    at,
    fiveHour: typeof five === 'number' ? five : null,
    sevenDay: typeof seven === 'number' ? seven : null,
    sevenDayResetsAt: status.rate_limits?.seven_day?.resets_at ?? null,
  }
}

/**
 * Whether a record says something the journal's last line does not — a line is kept only when a percentage moves,
 * so the journal grows by the change, not by the refresh.
 * @param {string | undefined} lastLine - The journal's last line, absent for a new journal.
 * @param {{ fiveHour: number | null, sevenDay: number | null }} record - The record to append.
 * @returns {boolean} True when the record is to be appended.
 */
export const usageMoved = (lastLine, record) => {
  if (!lastLine) return true
  try {
    const last = JSON.parse(lastLine)
    return last.fiveHour !== record.fiveHour || last.sevenDay !== record.sevenDay
  } catch {
    return true
  }
}

/**
 * Appends the usage to `.claude/state/usage.jsonl` (ignored by git) when it moved, so a session can read the week's
 * consumption: `tail -n 20 .claude/state/usage.jsonl`.
 * @param {string} root - The tree's root.
 * @param {object} status - The status JSON.
 * @returns {string} Nothing when all went well, else ` · journal d'usage illisible` for the line — a failure is said.
 */
const keepUsage = (root, status) => {
  const record = usageRecord(status, new Date().toISOString())
  if (!record) return ''
  try {
    const dir = join(root, '.claude', 'state')
    const path = join(dir, 'usage.jsonl')
    const lines = existsSync(path) ? readFileSync(path, 'utf8').trimEnd().split('\n') : []
    if (usageMoved(lines.at(-1), record)) {
      mkdirSync(dir, { recursive: true })
      appendFileSync(path, `${JSON.stringify(record)}\n`)
    }
    return ''
  } catch {
    return " · journal d'usage illisible"
  }
}

/**
 * What a session must know of its own context window — the dev, 2026-11-26: _"you must know where you stand; when my
 * knee hurts, I know my knee hurts"_. The status line is shown to him only; the session reads this record instead.
 * @param {{ session_id?: string, context_window?: { used_percentage?: number, context_window_size?: number, total_input_tokens?: number } }} status - The status JSON.
 * @param {string} at - The moment, ISO 8601.
 * @returns {{ at: string, used: number, size: number | null, tokens: number | null } | null} The record, or null when
 *   Claude Code sent no percentage (before the session's first answer) or no session id.
 */
export const contextRecord = (status, at) => {
  const used = status.context_window?.used_percentage
  if (typeof used !== 'number' || !Number.isFinite(used) || !status.session_id) return null
  const size = status.context_window?.context_window_size
  const tokens = status.context_window?.total_input_tokens
  return {
    at,
    used: Math.round(used),
    size: typeof size === 'number' ? size : null,
    tokens: typeof tokens === 'number' ? tokens : null,
  }
}

/**
 * Writes the session's context to `.claude/state/context/<session id>.json` (ignored by git), replaced at each
 * refresh, so the session can say where it stands: `cat .claude/state/context/<its session id>.json`.
 * @param {string} root - The tree's root.
 * @param {object} status - The status JSON.
 * @returns {string} Nothing when all went well, else ` · contexte non noté` for the line — a failure is said.
 */
const keepContext = (root, status) => {
  const record = contextRecord(status, new Date().toISOString())
  if (!record) return ''
  try {
    const dir = join(root, '.claude', 'state', 'context')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, `${basename(status.session_id)}.json`), `${JSON.stringify(record)}\n`)
    return ''
  } catch {
    return ' · contexte non noté'
  }
}

/**
 * Builds the line from what Claude Code sends, the session's role note and the branch.
 * @param {{ agent?: { name?: string }, workspace?: { git_worktree?: string }, context_window?: { used_percentage?: number }, rate_limits?: { seven_day?: { used_percentage?: number } } }} status - The status JSON.
 * @param {string | null} branch - The checked-out branch, or null when git could not tell.
 * @param {string | null} [noted] - The session's role note.
 * @returns {string} The line, e.g. `codeur · arbre coder · branche coder · contexte 34 % · semaine 41 %`.
 */
export const statusLine = (status, branch, noted = null) => {
  const role = noted ?? status.agent?.name
  const label = role ? (ROLE_LABELS[role] ?? role) : 'sans rôle'
  const tree = status.workspace?.git_worktree ?? 'main'
  return `${label} · arbre ${tree} · branche ${branch ?? 'inconnue'}${contextPart(status.context_window?.used_percentage)}${weekPart(status.rate_limits?.seven_day?.used_percentage)}`
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
  const kept = root ? `${keepUsage(root, status)}${keepContext(root, status)}` : ''
  process.stdout.write(
    `${statusLine(status, revParse(dir, ['--abbrev-ref', 'HEAD']), root ? readRole(root, status.session_id) : null)}${kept}`,
  )
}
