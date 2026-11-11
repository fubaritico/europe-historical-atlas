#!/usr/bin/env node
/**
 * The historian's guard — a PreToolUse hook declared in `.claude/settings.json`, which acts only when the session's
 * role is the historian: the tree's role note (`role-state.mjs`, set by a sentence or by `claude --agent historian`),
 * else the agent the session was started as. The historian researches, enters the CMS and draws in the Cartographer;
 * it never writes the code. Every Edit, Write or NotebookEdit aimed under `packages/` — of the main tree or of any
 * worktree — is denied, with the reason Claude reads and passes on.
 *
 * **What it does not hold**: a write through Bash (`sed -i`, a redirect, `git apply`) carries no path the hook can
 * read, and the historian needs Bash for its own work (`sqlite3`, its scripts). The guard stops a slip of the file
 * tools; the rest is the role (`.claude/roles/historian.md`).
 *
 * Input: the hook's JSON on stdin (`tool_input.file_path` or `tool_input.notebook_path`). The project root is
 * `CLAUDE_PROJECT_DIR`, where the session started — a worktree's root when it started in one; the main tree's root is
 * found above it.
 *
 * Fails closed: unreadable input or a missing project root denies the write and says why — a guard that lets
 * everything through when it cannot read its input guards nothing.
 *
 * Run its tests: node --test '.claude/*.test.mjs' '.claude/hooks/*.test.mjs'
 */
import { readFileSync } from 'node:fs'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import { DEFAULT_ROLE, readRole } from './role-state.mjs'

/** The folder the historian never writes in, relative to a tree's root. */
export const CODE_ROOT = 'packages'

/** Where this repository's worktrees live, relative to the main tree's root. */
const WORKTREES = ['.claude', 'worktrees']

/**
 * Finds the main tree's root from the root a session started in: a worktree's root is `<main>/.claude/worktrees/<name>`.
 * @param {string} projectDir - The session's project root.
 * @returns {string} The main tree's root.
 */
export const mainRootOf = (projectDir) => {
  const parts = resolve(projectDir).split(sep)
  const at = parts.length - 3
  return at > 0 && parts[at] === WORKTREES[0] && parts[at + 1] === WORKTREES[1] ? parts.slice(0, at).join(sep) : resolve(projectDir)
}

/**
 * Says whether a path lies under the code of the repository: `packages/` of the main tree or of any of its worktrees.
 * Compared without case, as the Mac's disk does.
 * @param {string} target - The path the tool would write, absolute or relative to the project root.
 * @param {string} projectDir - The session's project root.
 * @returns {boolean} True when the path is code.
 */
export const isCodePath = (target, projectDir) => {
  const absolute = isAbsolute(target) ? resolve(target) : resolve(projectDir, target)
  const parts = relative(mainRootOf(projectDir), absolute).toLowerCase().split(sep)
  if (parts[0] === '..') return false
  if (parts[0] === CODE_ROOT) return true
  return parts[0] === WORKTREES[0] && parts[1] === WORKTREES[1] && parts[3] === CODE_ROOT
}

/**
 * The session's role for the guard: the tree's note, else the agent it was started as, else the coder.
 * @param {string | null} noted - The tree's role note.
 * @param {unknown} input - The parsed hook input (`agent_type`).
 * @returns {string} The role.
 */
export const sessionRole = (noted, input) => {
  if (noted) return noted
  const agent = typeof input === 'object' && input !== null ? input.agent_type : undefined
  return agent === 'historian' ? 'historian' : DEFAULT_ROLE
}

/**
 * Builds the hook's answer for one tool call.
 * @param {unknown} input - The parsed hook input.
 * @param {string | undefined} projectDir - `CLAUDE_PROJECT_DIR`.
 * @param {string} role - The session's role ({@link sessionRole}).
 * @returns {string | null} The reason to deny, or null to let the call go on through the normal permissions.
 */
export const denialFor = (input, projectDir, role) => {
  if (role !== 'historian') return null
  if (!projectDir) return 'The historian guard cannot tell the project root (CLAUDE_PROJECT_DIR is unset): write refused.'
  const toolInput = typeof input === 'object' && input !== null ? input.tool_input : undefined
  const target = toolInput?.file_path ?? toolInput?.notebook_path
  if (typeof target !== 'string') return 'The historian guard cannot read the path of this write: refused.'
  if (!isCodePath(target, projectDir)) return null
  const shown = relative(mainRootOf(projectDir), isAbsolute(target) ? resolve(target) : resolve(projectDir, target))
  return `The historian does not write code: ${shown} is under ${CODE_ROOT}/. Hand it to the coder session (claude --agent coder).`
}

/**
 * Prints the PreToolUse deny decision Claude Code reads on stdout.
 * @param {string} reason - Why the write is refused.
 * @returns {void}
 */
const deny = (reason) => {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason },
    }),
  )
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let input
  try {
    input = JSON.parse(readFileSync(0, 'utf8'))
  } catch (error) {
    const dir = process.env.CLAUDE_PROJECT_DIR
    if (dir && sessionRole(readRole(dir), null) !== 'historian') process.exit(0)
    deny(`The historian guard could not read its input (${error instanceof Error ? error.message : String(error)}): write refused.`)
    process.exit(0)
  }
  const projectDir = process.env.CLAUDE_PROJECT_DIR
  const reason = denialFor(input, projectDir, sessionRole(projectDir ? readRole(projectDir) : null, input))
  if (reason) deny(reason)
}
