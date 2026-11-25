#!/usr/bin/env node
/**
 * The historian's oracle follows the historian's session: started when a session takes the historian's role, stopped
 * when that session ends (REPO-544). The oracle is `/Volumes/Acer/atlas-historien/outils/oracle` (its `session.ts`
 * `start` and `stop`, both idempotent); this hook only decides when to call them.
 *
 * Declared apart in `.claude/settings.json`, not called from `session-role.mjs`: the two hooks of one event run in
 * parallel, so reading the role note here would race the write there. This hook therefore decides from the event
 * alone (the agent started as historian, or the message naming the role — the same `roleFromPrompt`) and keeps its own
 * marker per session; a role-less coder session never reaches the oracle.
 *
 * - **Start**: SessionStart `startup` with `agent_type` historian; SessionStart `resume` or `compact` of a session
 *   whose note says historian; UserPromptSubmit naming the historian. Nothing when this session already started it.
 * - **Stop**: SessionEnd of a session whose note says historian, unless `reason` is `clear` (the new session carries
 *   the role on, and the oracle with it).
 *
 * The command is launched detached and never awaited, and a failure is said on stderr, never raised: it must not
 * hold up a prompt or a session's end. `ORACLE_SESSION_COMMAND` replaces the oracle's command (the tests set it).
 *
 * Input: the hook's JSON on stdin. The tree is `CLAUDE_PROJECT_DIR`.
 *
 * Run its tests: node --test '.claude/*.test.mjs' '.claude/hooks/*.test.mjs'
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { NOTE_KEEP_MS, isSessionId, readRole, roleFromPrompt } from './role-state.mjs'

/** Node 24, which runs the oracle's TypeScript directly (the shell's default Node is older). */
export const ORACLE_NODE = join(homedir(), '.nvm', 'versions', 'node', 'v24.22.1', 'bin', 'node')

/** The oracle's session commands, on the external disk. */
export const ORACLE_SESSION_SCRIPT = '/Volumes/Acer/atlas-historien/outils/oracle/src/session.ts'

/**
 * Where a tree notes the sessions that started the oracle.
 * @param {string} treeRoot - The tree's root.
 * @returns {string} The folder (ignored by git, like the role notes).
 */
export const markersDir = (treeRoot) => join(treeRoot, '.claude', 'state', 'oracle')

/**
 * Decides what the oracle must do for one event.
 * @param {{ hook_event_name?: string, source?: string, reason?: string, agent_type?: string, prompt?: string }} input - The hook input.
 * @param {{ role: string | null, started: boolean }} state - The role noted for the session, and whether this session
 *   already started the oracle.
 * @returns {'start' | 'stop' | null} The command to run, or null.
 */
export const oracleAction = (input, { role, started }) => {
  if (input.hook_event_name === 'SessionEnd') return role === 'historian' && input.reason !== 'clear' ? 'stop' : null
  if (started) return null
  if (input.hook_event_name === 'UserPromptSubmit') {
    return typeof input.prompt === 'string' && roleFromPrompt(input.prompt) === 'historian' ? 'start' : null
  }
  if (input.hook_event_name === 'SessionStart') {
    if (input.source === 'startup') return input.agent_type === 'historian' ? 'start' : null
    if (input.source === 'resume' || input.source === 'compact') return role === 'historian' ? 'start' : null
  }
  return null
}

/**
 * The command that runs the oracle's `start` or `stop`.
 * @param {'start' | 'stop'} action - What to do.
 * @param {NodeJS.ProcessEnv} env - The environment (`ORACLE_SESSION_COMMAND` overrides the oracle).
 * @returns {{ file: string, args: string[] } | null} The program and its arguments, or null when the oracle is not there.
 */
export const oracleCommand = (action, env) => {
  if (env.ORACLE_SESSION_COMMAND) return { file: env.ORACLE_SESSION_COMMAND, args: [action] }
  if (!existsSync(ORACLE_SESSION_SCRIPT)) return null
  return { file: ORACLE_NODE, args: [ORACLE_SESSION_SCRIPT, action] }
}

/**
 * Runs a command detached: not awaited, its output dropped, the hook free to exit.
 * @param {{ file: string, args: string[] }} command - The program and its arguments.
 * @returns {void}
 */
const launch = ({ file, args }) => {
  const child = spawn(file, args, { detached: true, stdio: 'ignore' })
  child.on('error', (error) => process.stderr.write(`oracle-session: ${file} did not start (${error.message})\n`))
  child.unref()
}

/**
 * Removes the markers no session has touched for {@link NOTE_KEEP_MS} — those of sessions that ended without a
 * SessionEnd (a crash).
 * @param {string} treeRoot - The tree's root.
 * @param {number} now - The time, in milliseconds.
 * @returns {void}
 */
const pruneMarkers = (treeRoot, now) => {
  const dir = markersDir(treeRoot)
  if (!existsSync(dir)) return
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    const stat = statSync(path, { throwIfNoEntry: false })
    if (stat && now - stat.mtimeMs > NOTE_KEEP_MS) rmSync(path, { force: true })
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const tree = process.env.CLAUDE_PROJECT_DIR
  let input
  try {
    input = JSON.parse(readFileSync(0, 'utf8'))
  } catch (error) {
    process.stderr.write(`oracle-session: unreadable input (${error instanceof Error ? error.message : String(error)})\n`)
    process.exit(0)
  }
  if (!tree || !isSessionId(input.session_id)) {
    process.stderr.write('oracle-session: no CLAUDE_PROJECT_DIR or session id, the oracle is left alone\n')
    process.exit(0)
  }
  const marker = join(markersDir(tree), input.session_id)
  const action = oracleAction(input, { role: readRole(tree, input.session_id), started: existsSync(marker) })
  if (input.hook_event_name === 'SessionStart' && input.source === 'startup') pruneMarkers(tree, Date.now())
  const command = action ? oracleCommand(action, process.env) : null
  if (action && !command) process.stderr.write(`oracle-session: ${ORACLE_SESSION_SCRIPT} is not there (the archive disk?), nothing to ${action}\n`)
  if (action === 'start' && command) {
    mkdirSync(markersDir(tree), { recursive: true })
    writeFileSync(marker, `${new Date().toISOString()}\n`)
  }
  if (action === 'stop') rmSync(marker, { force: true })
  if (command) launch(command)
}
