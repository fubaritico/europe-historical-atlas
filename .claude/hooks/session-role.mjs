#!/usr/bin/env node
/**
 * The session's role — taken by a sentence or by `claude --agent <role>`, kept across a `/clear` or a compaction.
 * Declared in `.claude/settings.json` on SessionStart and UserPromptSubmit; the role is a note per tree
 * (`role-state.mjs`).
 *
 * - **SessionStart `startup`**: the note is set to the agent the session was started as (`agent_type`), else the
 *   coder — a new session starts from its command, never from yesterday's sentence; the session is titled after it.
 * - **SessionStart `clear` / `compact`**: the role's page is given back as context, the conversation having lost it.
 * - **UserPromptSubmit**: a message naming a role (« commence une session en tant qu'historien », « prends le rôle du
 *   codeur », the agent's own `/start-session historian`) sets the note and hands the role's page over.
 *
 * Input: the hook's JSON on stdin. The tree is `CLAUDE_PROJECT_DIR`, where the session started.
 *
 * Run its tests: node --test '.claude/*.test.mjs' '.claude/hooks/*.test.mjs'
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { DEFAULT_ROLE, ROLE_LABELS, ROLES, readRole, roleFromPrompt, writeRole } from './role-state.mjs'

/**
 * The context that hands a role's page to the conversation.
 * @param {string} role - The role.
 * @param {string} page - Its page.
 * @param {string} why - What brought it.
 * @returns {string} The context.
 */
const pageContext = (role, page, why) =>
  `This session's role is « ${role} » (${why}) — its page, .claude/roles/${role}.md; hold to it, and say the role in your answer:\n\n${page}`

/**
 * Builds the hook's output and the role to write, for one event.
 * @param {{ hook_event_name?: string, source?: string, agent_type?: string, prompt?: string }} input - The hook input.
 * @param {string | null} noted - The tree's role note.
 * @param {(role: string) => string | null} readPage - Reads a role's page, or null when there is none.
 * @returns {{ output: object | null, write: string | null }} What to print, and the role to note (null: leave it).
 */
export const roleEvent = (input, noted, readPage) => {
  if (input.hook_event_name === 'UserPromptSubmit') {
    const role = typeof input.prompt === 'string' ? roleFromPrompt(input.prompt) : null
    const page = role ? readPage(role) : null
    if (!role || page === null) return { output: null, write: null }
    const output = { hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: pageContext(role, page, 'named in the message') } }
    return { output, write: role }
  }
  if (input.source === 'startup') {
    const role = input.agent_type && ROLES.includes(input.agent_type) ? input.agent_type : DEFAULT_ROLE
    return { output: { hookSpecificOutput: { hookEventName: 'SessionStart', sessionTitle: ROLE_LABELS[role] } }, write: role }
  }
  if (input.source === 'clear' || input.source === 'compact') {
    const role = noted ?? (input.agent_type && ROLES.includes(input.agent_type) ? input.agent_type : DEFAULT_ROLE)
    const page = readPage(role)
    if (page === null) return { output: null, write: null }
    const output = { hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: pageContext(role, page, `given back after a ${input.source}`) } }
    return { output, write: null }
  }
  return { output: null, write: null }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const roles = join(dirname(fileURLToPath(import.meta.url)), '..', 'roles')
  /** @param {string} role @returns {string | null} */
  const readPage = (role) => {
    const file = join(roles, `${role}.md`)
    return existsSync(file) ? readFileSync(file, 'utf8') : null
  }
  const tree = process.env.CLAUDE_PROJECT_DIR
  let input
  try {
    input = JSON.parse(readFileSync(0, 'utf8'))
  } catch (error) {
    process.stderr.write(`session-role: unreadable input (${error instanceof Error ? error.message : String(error)})\n`)
    process.exit(1)
  }
  if (!tree) {
    process.stderr.write('session-role: CLAUDE_PROJECT_DIR is unset, the role cannot be noted\n')
    process.exit(1)
  }
  const { output, write } = roleEvent(input, readRole(tree), readPage)
  if (write) writeRole(tree, write)
  if (output) process.stdout.write(JSON.stringify(output))
}
