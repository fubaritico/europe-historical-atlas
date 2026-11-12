/**
 * The role of each Claude session — one note per session, `.claude/state/roles/<session id>` (ignored by git), read by
 * the historian's guard, the status line and the session-role hook. The dev, 2026-11-11: the role is taken by a
 * sentence (« commence une session en tant qu'historien », « prends le rôle du codeur ») as well as by
 * `claude --agent <role>`.
 *
 * Kept per session since 2026-11-12: a note per tree was shared by two consoles open in the same tree, so the
 * historian's sentence in one turned the other into a historian — its status line and its guard with it. `/clear`
 * starts a new session with a new id (code.claude.com/docs/en/statusline), so the role crosses it by a hand-over: the
 * `SessionEnd` of the clear leaves it ({@link handOver}), the `SessionStart` that follows takes it ({@link takeHandOver}).
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/** The roles there is a page for, in `.claude/roles/`. */
export const ROLES = ['coder', 'historian']

/** The role of a session nothing names: the project's `agent` setting (`.claude/settings.json`). */
export const DEFAULT_ROLE = 'coder'

/** The roles' names as the dev says them. */
export const ROLE_LABELS = { coder: 'codeur', historian: 'historien' }

/** How long a hand-over waits for the session a `/clear` starts — the two hooks follow each other within a second. */
export const HAND_OVER_MS = 10_000

/**
 * How long a session's note is kept after it was last written; older ones are removed at the next startup. A session
 * rewrites its note at each resume and compaction, so only one left fourteen days without either loses it.
 */
export const NOTE_KEEP_MS = 14 * 24 * 60 * 60 * 1000

/** The words that name a role in a sentence, accents and capitals removed. */
const ROLE_WORDS = { codeur: 'coder', coder: 'coder', historien: 'historian', historian: 'historian' }

/** The hand-over's file name — never a session id, which is a UUID. */
const HAND_OVER = 'handover.json'

/** What a session id may hold to name a file: Claude Code's ids are UUIDs. */
const SESSION_ID = /^[A-Za-z0-9_-]+$/

/**
 * Where a tree keeps its sessions' roles.
 * @param {string} treeRoot - The tree's root.
 * @returns {string} The folder.
 */
export const rolesDir = (treeRoot) => join(treeRoot, '.claude', 'state', 'roles')

/**
 * Where one session keeps its role.
 * @param {string} treeRoot - The tree's root.
 * @param {string} sessionId - The session's id.
 * @returns {string} The note's path.
 */
export const rolePath = (treeRoot, sessionId) => join(rolesDir(treeRoot), sessionId)

/**
 * Says whether a session id can name a note — absent or holding a path separator, it cannot.
 * @param {unknown} sessionId - The id Claude Code sent.
 * @returns {boolean} True when it can.
 */
export const isSessionId = (sessionId) => typeof sessionId === 'string' && SESSION_ID.test(sessionId)

/**
 * Reads the role a session took by a sentence or at startup.
 * @param {string} treeRoot - The tree's root.
 * @param {unknown} sessionId - The session's id.
 * @returns {string | null} The role, or null when the session has no note, its id cannot name one, or the note names
 *   no known role.
 */
export const readRole = (treeRoot, sessionId) => {
  if (!isSessionId(sessionId)) return null
  const path = rolePath(treeRoot, sessionId)
  if (!existsSync(path)) return null
  const role = readFileSync(path, 'utf8').trim()
  return ROLES.includes(role) ? role : null
}

/**
 * Writes the role a session now holds.
 * @param {string} treeRoot - The tree's root.
 * @param {string} sessionId - The session's id.
 * @param {string} role - One of {@link ROLES}.
 * @returns {void}
 * @throws {Error} When the id cannot name a note — the hook says it on stderr rather than note a role nowhere.
 */
export const writeRole = (treeRoot, sessionId, role) => {
  if (!isSessionId(sessionId)) throw new Error(`the session id ${JSON.stringify(sessionId)} cannot name a role note`)
  mkdirSync(rolesDir(treeRoot), { recursive: true })
  writeFileSync(rolePath(treeRoot, sessionId), `${role}\n`)
}

/**
 * Says whether any session of the tree holds a role — the guard's answer when its input cannot be read and so names
 * no session.
 * @param {string} treeRoot - The tree's root.
 * @param {string} role - The role looked for.
 * @returns {boolean} True when one session's note names it.
 */
export const anySessionHolds = (treeRoot, role) => {
  const dir = rolesDir(treeRoot)
  if (!existsSync(dir)) return false
  return readdirSync(dir).some((name) => name !== HAND_OVER && readRole(treeRoot, name) === role)
}

/**
 * Leaves a session's role for the session its `/clear` starts.
 * @param {string} treeRoot - The tree's root.
 * @param {string} role - The role handed over.
 * @param {number} now - The time, in milliseconds.
 * @returns {void}
 */
export const handOver = (treeRoot, role, now) => {
  mkdirSync(rolesDir(treeRoot), { recursive: true })
  writeFileSync(join(rolesDir(treeRoot), HAND_OVER), JSON.stringify({ role, at: now }))
}

/**
 * Takes the role a `/clear` handed over, once: the file is removed whatever it held.
 * @param {string} treeRoot - The tree's root.
 * @param {number} now - The time, in milliseconds.
 * @returns {string | null} The role, or null when none was handed over within {@link HAND_OVER_MS}.
 * @throws {SyntaxError} When the file is not JSON — removed all the same, and the hook says it on stderr.
 */
export const takeHandOver = (treeRoot, now) => {
  const path = join(rolesDir(treeRoot), HAND_OVER)
  if (!existsSync(path)) return null
  let left
  try {
    left = JSON.parse(readFileSync(path, 'utf8'))
  } finally {
    rmSync(path, { force: true })
  }
  const fresh = left && typeof left.at === 'number' && now - left.at <= HAND_OVER_MS
  return fresh && ROLES.includes(left.role) ? left.role : null
}

/**
 * Removes the notes no session has written for {@link NOTE_KEEP_MS}, and the one-per-tree note used before
 * 2026-11-12 (`.claude/state/role`).
 * @param {string} treeRoot - The tree's root.
 * @param {number} now - The time, in milliseconds.
 * @returns {void}
 */
export const pruneNotes = (treeRoot, now) => {
  rmSync(join(treeRoot, '.claude', 'state', 'role'), { force: true })
  const dir = rolesDir(treeRoot)
  if (!existsSync(dir)) return
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    // Another session's startup may have removed it since the listing.
    const stat = statSync(path, { throwIfNoEntry: false })
    if (stat && now - stat.mtimeMs > NOTE_KEEP_MS) rmSync(path, { force: true })
  }
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
