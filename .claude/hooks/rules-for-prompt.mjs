#!/usr/bin/env node
/**
 * UserPromptSubmit hook — names the rule files a message's subject needs, so a discussion loads them
 * even when no file of the package has been touched (path-scoped rules cover that case on their own).
 *
 * The table is `.claude/skills/rules/topics.json`, shared with the `/rules` skill. Each topic is asked
 * for once per session; `--reset` (wired on SessionStart `compact|clear`) forgets what was asked,
 * because a compaction drops the files that were read.
 *
 * A failure is said on stderr with exit 1: Claude Code shows it to the dev and lets the prompt through.
 * Blocking his message over a missing table would cost more than a rule not named.
 */
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * @typedef {{ path: string, hint?: string }} RuleFile
 * @typedef {{ label: string, words: string[], files: RuleFile[] }} Topic
 */

/**
 * Lower-cases a text and strips its accents, so `Éditeur` and `editeur` are one word.
 * @param {string} text
 * @returns {string}
 */
export const normalise = (text) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

/**
 * Splits a normalised text into its words; a hyphenated word yields itself and each part,
 * so `CARTO-116` matches `carto-*` and `porte-plume` matches `plume`.
 * @param {string} text
 * @returns {string[]}
 */
const wordsOf = (text) =>
  text
    .split(/[^a-z0-9-]+/)
    .filter(Boolean)
    .flatMap((word) => (word.includes('-') ? [word, ...word.split('-').filter(Boolean)] : [word]))

/**
 * Whether one table word appears in the message.
 * @param {string} word a table word: plain, `stem*`, or a phrase with a space
 * @param {string[]} words the message's words
 * @param {string} flat the message's words joined by single spaces
 * @returns {boolean}
 */
const appears = (word, words, flat) => {
  if (word.includes(' ')) return ` ${flat} `.includes(` ${word} `)
  if (word.endsWith('*')) {
    const stem = word.slice(0, -1)
    return words.some((w) => w.startsWith(stem) && w.length > stem.length)
  }
  return words.some((w) => w === word || w === `${word}s` || w === `${word}x`)
}

/**
 * Whether a prompt is the dev's own words. A subagent's report and a background-task event reach the hook as
 * prompts too; matched, they would name rules for words nobody said and mark those topics as asked.
 * @param {string} prompt
 * @returns {boolean}
 */
export const isFromDev = (prompt) => !/<agent-message|<task-notification/.test(prompt.slice(0, 500))

/**
 * The topics whose words appear in a message, in table order.
 * @param {string} prompt the dev's message
 * @param {Record<string, Topic>} topics
 * @returns {string[]} topic keys
 */
export const matchTopics = (prompt, topics) => {
  const words = wordsOf(normalise(prompt))
  const flat = words.join(' ')
  return Object.entries(topics)
    .filter(([, topic]) => topic.words.some((word) => appears(normalise(word), words, flat)))
    .map(([key]) => key)
}

/**
 * The reminder injected beside the message: each topic, then its files, a file named once.
 * @param {string[]} keys the topics to name
 * @param {Record<string, Topic>} topics
 * @returns {string}
 */
export const renderReminder = (keys, topics) => {
  const named = new Set()
  const lines = keys.map((key) => {
    const topic = topics[key]
    const files = topic.files.filter((file) => !named.has(file.path))
    files.forEach((file) => named.add(file.path))
    const list = files.map((file) => (file.hint ? `${file.path} (${file.hint})` : file.path))
    return `- ${topic.label}: ${list.length > 0 ? list.join(', ') : 'already named above'}`
  })
  return [
    'Rules for the subject of this message (prompt hook, table .claude/skills/rules/topics.json).',
    'Read each file before answering, unless it is already in context this session (read earlier, or a Loaded line):',
    ...lines,
  ].join('\n')
}

/**
 * Where a session's asked topics are kept between two messages.
 * @param {string} sessionId
 * @returns {string}
 */
const statePath = (sessionId) => join(tmpdir(), `claude-rules-${sessionId.replace(/[^\w-]/g, '_')}.json`)

/** Reads the hook input, answers on stdout. */
const main = () => {
  const input = JSON.parse(readFileSync(0, 'utf8'))
  if (typeof input.session_id !== 'string') throw new Error('hook input has no session_id')
  const state = statePath(input.session_id)
  if (process.argv.includes('--reset')) {
    rmSync(state, { force: true })
    return
  }
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
  const { topics } = JSON.parse(readFileSync(join(root, '.claude/skills/rules/topics.json'), 'utf8'))
  const asked = existsSync(state) ? JSON.parse(readFileSync(state, 'utf8')) : []
  if (typeof input.prompt !== 'string') throw new Error('hook input has no prompt')
  if (!isFromDev(input.prompt)) return
  const fresh = matchTopics(input.prompt, topics).filter((key) => !asked.includes(key))
  if (fresh.length === 0) return
  writeFileSync(state, JSON.stringify([...asked, ...fresh]))
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: renderReminder(fresh, topics) },
    }),
  )
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main()
  } catch (error) {
    console.error(`[rules hook] ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}
