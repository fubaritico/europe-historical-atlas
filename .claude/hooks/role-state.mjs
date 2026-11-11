/**
 * The role of the sessions of a tree — one note per tree, `.claude/state/role` (ignored by git), read by the
 * historian's guard, the status line and the session-role hook. The dev, 2026-11-11: the role is taken by a sentence
 * (« commence une session en tant qu'historien », « prends le rôle du codeur ») as well as by `claude --agent <role>`.
 *
 * Kept per tree, not per session: `/clear` starts a new session (code.claude.com/docs/en/statusline), so a note keyed
 * by the session's id would be lost at each `/clear`. Two sessions in one tree share it — the last sentence wins; each
 * role has its own tree.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/** The roles there is a page for, in `.claude/roles/`. */
export const ROLES = ['coder', 'historian']

/** The role of a session nothing names: the project's `agent` setting (`.claude/settings.json`). */
export const DEFAULT_ROLE = 'coder'

/** The roles' names as the dev says them. */
export const ROLE_LABELS = { coder: 'codeur', historian: 'historien' }

/** The words that name a role in a sentence, accents and capitals removed. */
const ROLE_WORDS = { codeur: 'coder', coder: 'coder', historien: 'historian', historian: 'historian' }

/**
 * Where a tree keeps its role.
 * @param {string} treeRoot - The tree's root.
 * @returns {string} The note's path.
 */
export const rolePath = (treeRoot) => join(treeRoot, '.claude', 'state', 'role')

/**
 * Reads the role a tree's sessions took by a sentence or at startup.
 * @param {string} treeRoot - The tree's root.
 * @returns {string | null} The role, or null when the tree has no note or the note names no known role.
 */
export const readRole = (treeRoot) => {
  const path = rolePath(treeRoot)
  if (!existsSync(path)) return null
  const role = readFileSync(path, 'utf8').trim()
  return ROLES.includes(role) ? role : null
}

/**
 * Writes the role a tree's sessions now hold.
 * @param {string} treeRoot - The tree's root.
 * @param {string} role - One of {@link ROLES}.
 * @returns {void}
 */
export const writeRole = (treeRoot, role) => {
  mkdirSync(join(treeRoot, '.claude', 'state'), { recursive: true })
  writeFileSync(rolePath(treeRoot), `${role}\n`)
}

/**
 * Finds a role named in a message: « en tant qu'historien », « en tant que codeur », « prends le rôle du codeur »,
 * « passe en historien », or the agent's own first prompt `/start-session historian`.
 * @param {string} text - The message.
 * @returns {string | null} The role named, or null.
 */
export const roleFromPrompt = (text) => {
  const plain = text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
  const match =
    /\/start-session\s+(coder|historian)\b/.exec(plain) ??
    /(?:en tant qu[e'’]?|(?:prends?|prenez|reprends?) le role d[eu]|passe en|deviens)\s*(?:l['’])?\s*(codeur|coder|historien|historian)\b/.exec(plain)
  return match ? (ROLE_WORDS[match[1]] ?? null) : null
}
