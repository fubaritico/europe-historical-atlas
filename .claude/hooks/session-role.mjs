#!/usr/bin/env node
/**
 * The session's role — taken by a sentence or by `claude --agent <role>`, kept across a `/clear` or a compaction.
 * Declared in `.claude/settings.json` on SessionStart, UserPromptSubmit and SessionEnd; the role is a note per session
 * (`role-state.mjs`).
 *
 * - **SessionStart `startup`**: the note is set to the agent the session was started as (`agent_type`), else the
 *   coder — a new session starts from its command, never from yesterday's sentence; the session is titled after it.
 *   The notes of sessions long gone are removed.
 * - **SessionEnd `clear`**: the role is handed over to the session the clear starts, which has a new id.
 * - **SessionStart `clear`**: the role handed over is noted for the new session, else its agent, else the coder; its
 *   page is given back as context, the conversation having lost it.
 * - **SessionStart `compact`**: the same session, the same note, rewritten to date it; the page is given back.
 * - **SessionStart `resume`**: the note is rewritten to date it, so a session taken up again keeps its role.
 * - **UserPromptSubmit**: a message naming a role (« commence une session en tant qu'historien », « prends le rôle du
 *   codeur », the agent's own `/start-session historian`) sets the note and hands the role's page over.
 *
 * Input: the hook's JSON on stdin, `session_id` among it. The tree is `CLAUDE_PROJECT_DIR`, where the session started.
 *
 * Run its tests: node --test '.claude/*.test.mjs' '.claude/hooks/*.test.mjs'
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { DEFAULT_ROLE, ROLE_LABELS, ROLES, handOver, pruneNotes, readRole, roleFromPrompt, takeHandOver, writeRole } from './role-state.mjs'

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
 * The role the agent names, if it is one there is a page for.
 * @param {{ agent_type?: string }} input - The hook input.
 * @returns {string | null} The role, or null.
 */
const agentRole = (input) => (input.agent_type && ROLES.includes(input.agent_type) ? input.agent_type : null)

/**
 * Builds the hook's output and what to note, for one event.
 * @param {{ hook_event_name?: string, source?: string, reason?: string, agent_type?: string, prompt?: string }} input - The hook input.
 * @param {{ noted: string | null, handedOver: string | null }} state - The session's note, and the role a `/clear`
 *   handed over (read only on a SessionStart `clear`).
 * @param {(role: string) => string | null} readPage - Reads a role's page, or null when there is none.
 * @returns {{ output: object | null, write: string | null, handOver: string | null }} What to print, the role to note
 *   for the session (null: leave it), and the role to hand over (null: none).
 */
export const roleEvent = (input, { noted, handedOver }, readPage) => {
  const nothing = { output: null, write: null, handOver: null }
  if (input.hook_event_name === 'UserPromptSubmit') {
    const role = typeof input.prompt === 'string' ? roleFromPrompt(input.prompt) : null
    const page = role ? readPage(role) : null
    if (!role || page === null) return nothing
    const output = { hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: pageContext(role, page, 'named in the message') } }
    return { ...nothing, output, write: role }
  }
  if (input.hook_event_name === 'SessionEnd') {
    return input.reason === 'clear' && noted ? { ...nothing, handOver: noted } : nothing
  }
  if (input.source === 'startup') {
    const role = agentRole(input) ?? DEFAULT_ROLE
    return { ...nothing, output: { hookSpecificOutput: { hookEventName: 'SessionStart', sessionTitle: ROLE_LABELS[role] } }, write: role }
  }
  if (input.source === 'clear' || input.source === 'compact') {
    const role = (input.source === 'clear' ? handedOver : noted) ?? agentRole(input) ?? DEFAULT_ROLE
    const page = readPage(role)
    const output =
      page === null
        ? null
        : { hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: pageContext(role, page, `given back after a ${input.source}`) } }
    // Rewritten even when unchanged: the write dates the note, which is kept fourteen days after its last one.
    return { ...nothing, output, write: role }
  }
  if (input.source === 'resume' && noted) return { ...nothing, write: noted }
  return nothing
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
  const now = Date.now()
  if (input.source === 'startup') pruneNotes(tree, now)
  const handedOver = input.source === 'clear' ? takeHandOver(tree, now) : null
  const result = roleEvent(input, { noted: readRole(tree, input.session_id), handedOver }, readPage)
  if (result.write) writeRole(tree, input.session_id, result.write)
  if (result.handOver) handOver(tree, result.handOver, now)
  if (result.output) process.stdout.write(JSON.stringify(result.output))
}
