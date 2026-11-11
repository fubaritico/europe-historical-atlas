#!/usr/bin/env node
/**
 * The session's role, kept across a `/clear` or a compaction — a SessionStart hook declared in
 * `.claude/settings.json`. A role is read once, by `/start-session <role>`, the first prompt the agent file sends
 * (`.claude/agents/<role>.md`); a `/clear` empties the conversation and the role with it, while the status line still
 * shows it. On `clear` and `compact` this hook hands the role's page back as context; on `startup`, it names the session
 * after the role.
 *
 * Input: the hook's JSON on stdin — `source`, and `agent_type` when the session was started with `--agent`. Without
 * it the role is the coder: the project's `agent` setting, which the documentation does not say reaches `agent_type`.
 * Roles: the pages in `.claude/roles/`.
 *
 * Run its tests: node --test '.claude/*.test.mjs' '.claude/hooks/*.test.mjs'
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** The role of a session started with no `--agent`: the project's `agent` setting (`.claude/settings.json`). */
export const DEFAULT_ROLE = 'coder'

/** The session titles, in the dev's words. */
export const ROLE_TITLES = { coder: 'codeur', historian: 'historien' }

/**
 * Builds the hook's output for one session start.
 * @param {{ source?: string, agent_type?: string }} input - The SessionStart input.
 * @param {(role: string) => string | null} readRole - Reads a role's page, or null when there is none.
 * @returns {object | null} The output to print, or null to say nothing.
 */
export const roleOutput = (input, readRole) => {
  const role = input.agent_type ?? DEFAULT_ROLE
  if (input.source === 'startup') {
    const title = ROLE_TITLES[role]
    return title ? { hookSpecificOutput: { hookEventName: 'SessionStart', sessionTitle: title } } : null
  }
  if (input.source !== 'clear' && input.source !== 'compact') return null
  const page = readRole(role)
  if (page === null) return null
  return {
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: `This session's role is « ${role} » — its page, .claude/roles/${role}.md, given back after a ${input.source}; hold to it:\n\n${page}`,
    },
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const roles = join(dirname(fileURLToPath(import.meta.url)), '..', 'roles')
  /** @param {string} role @returns {string | null} */
  const readRole = (role) => {
    const file = join(roles, `${role}.md`)
    return existsSync(file) ? readFileSync(file, 'utf8') : null
  }
  let input
  try {
    input = JSON.parse(readFileSync(0, 'utf8'))
  } catch (error) {
    process.stderr.write(`session-role: unreadable input (${error instanceof Error ? error.message : String(error)})\n`)
    process.exit(1)
  }
  const output = roleOutput(input, readRole)
  if (output) process.stdout.write(JSON.stringify(output))
}
